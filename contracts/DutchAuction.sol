// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "./IDutchAuction.sol";
import "./INFT.sol";

contract DutchAuction is
    IDutchAuction,
    AccessControl,
    Pausable,
    ReentrancyGuard
{
    /// @notice EIP712 Domain Hash
    bytes32 public immutable eip712DomainHash;

    /// @notice NFT contract
    INFT public nft;

    /// @notice Signer address
    address public signer;

    /// @dev Settled Price in wei
    uint256 private _settledPriceInWei;

    /// @dev Auction Config
    Config private _config;

    /// @dev Total minted tokens
    uint32 private _totalMinted;

    /// @dev Mapping of user address to User data
    mapping(address => User) private _userData;

    /// @dev Mapping of user address to nonce
    mapping(address => uint256) private _nonces;

    modifier validTime() {
        Config memory config = _config;
        if (
            block.timestamp > config.endTime ||
            block.timestamp < config.startTime
        ) revert InvalidStartEndTime(config.startTime, config.endTime);
        _;
    }

    constructor(address _nft, address _signer) {
        nft = INFT(_nft);
        signer = _signer;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        eip712DomainHash = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("Fingerprints DAO Dutch Auction")),
                keccak256(bytes("1")),
                chainId,
                address(this)
            )
        );
    }

    function setConfig(
        uint256 startAmountInWei,
        uint256 endAmountInWei,
        uint216 limitInWei,
        uint32 refundDelayTime,
        uint64 startTime,
        uint64 endTime
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (startTime == 0 || startTime >= endTime)
            revert InvalidStartEndTime(startTime, endTime);
        if (startAmountInWei == 0 || startAmountInWei <= endAmountInWei)
            revert InvalidAmountInWei();
        if (limitInWei == 0) revert InvalidAmountInWei();

        _config = Config({
            startAmountInWei: startAmountInWei,
            endAmountInWei: endAmountInWei,
            limitInWei: limitInWei,
            refundDelayTime: refundDelayTime,
            startTime: startTime,
            endTime: endTime
        });
    }

    function getConfig() external view returns (Config memory) {
        return _config;
    }

    function getSettledPriceInWei() external view returns (uint256) {
        return _settledPriceInWei;
    }

    function getCurrentPriceInWei() public view returns (uint256) {
        Config memory config = _config; // storage to memory
        // Return startAmountInWei if auction not started
        if (block.timestamp <= config.startTime) return config.startAmountInWei;
        // Return endAmountInWei if auction ended
        if (block.timestamp >= config.endTime) return config.endAmountInWei;

        // Declare variables to derive in the subsequent unchecked scope.
        uint256 duration;
        uint256 elapsed;
        uint256 remaining;

        // Skip underflow checks as startTime <= block.timestamp < endTime.
        unchecked {
            // Derive the duration for the order and place it on the stack.
            duration = config.endTime - config.startTime;

            // Derive time elapsed since the order started & place on stack.
            elapsed = block.timestamp - config.startTime;

            // Derive time remaining until order expires and place on stack.
            remaining = duration - elapsed;
        }

        return
            (config.startAmountInWei *
                remaining +
                config.endAmountInWei *
                elapsed) / duration;
    }

    function getNonce(address user) external view returns (uint256) {
        return _nonces[user];
    }

    function useNonce(address user) internal returns (uint256 current) {
        current = _nonces[user];
        ++_nonces[user];
    }

    function bid(
        uint32 qty,
        uint256 deadline,
        bytes memory signature
    ) external payable nonReentrant whenNotPaused validTime {
        if (block.timestamp > deadline) revert BidExpired(deadline);

        bytes32 hashStruct = keccak256(
            abi.encode(
                keccak256(
                    "Bid(address account,uint32 qty,uint256 nonce,uint256 deadline)"
                ),
                msg.sender,
                qty,
                useNonce(msg.sender),
                deadline
            )
        );

        bytes32 hash = keccak256(
            abi.encodePacked("\x19\x01", eip712DomainHash, hashStruct)
        );

        address recoveredSigner = ECDSA.recover(hash, signature);
        if (signer != recoveredSigner) revert InvalidSignature();

        uint256 price = getCurrentPriceInWei();
        uint256 payment = qty * price;
        if (msg.value < payment) revert NotEnoughValue();
        if (msg.value > payment) {
            uint256 refundInWei = msg.value - payment;
            (bool success, ) = msg.sender.call{value: refundInWei}("");
            if (!success) revert TransferFailed();
        }

        User storage bidder = _userData[msg.sender]; // get user's current bid total
        bidder.contribution = bidder.contribution + uint216(payment);
        bidder.tokensBidded = bidder.tokensBidded + qty;

        if (bidder.contribution > _config.limitInWei)
            revert PurchaseLimitReached();

        _totalMinted += qty;

        // _settledPriceInWei is always the minimum price of all the bids' unit price
        if (price < _settledPriceInWei || _settledPriceInWei == 0) {
            _settledPriceInWei = price;
        }

        // mint tokens to user
        _mintTokens(msg.sender, qty);

        emit Bid(msg.sender, qty, price);
    }

    function claimTokens() external whenNotPaused validTime {
        User storage bidder = _userData[msg.sender]; // get user's current bid total
        uint256 price = getCurrentPriceInWei();
        uint32 claimable = uint32(bidder.contribution / price) -
            bidder.tokensBidded;
        uint32 available = nft.tokenTokenIdMax() - uint16(nft.currentTokenId());
        if (claimable > available) claimable = available;
        if (claimable == 0) revert NothingToClaim();

        bidder.tokensBidded = bidder.tokensBidded + claimable;
        _totalMinted += claimable;

        _mintTokens(msg.sender, claimable);

        emit Claim(msg.sender, claimable);
    }

    function withdrawFunds() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_config.endTime > block.timestamp) revert NotEnded();

        uint256 amount = _totalMinted * _settledPriceInWei;
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    function claimRefund() external nonReentrant {
        Config memory config = _config;
        if (config.endTime + config.refundDelayTime > block.timestamp)
            revert ClaimRefundNotReady();

        _claimRefund(msg.sender);
    }

    function refundUsers(
        address[] memory accounts
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Config memory config = _config;
        if (config.endTime + config.refundDelayTime > block.timestamp)
            revert ClaimRefundNotReady();

        uint256 length;
        for (uint256 i; i != length; ++i) {
            _claimRefund(accounts[i]);
        }
    }

    function _claimRefund(address account) internal {
        User storage user = _userData[account];
        if (user.refundClaimed) revert UserAlreadyClaimed();
        user.refundClaimed = true;
        uint256 refundInWei = user.contribution -
            (_settledPriceInWei * user.tokensBidded);
        if (refundInWei > 0) {
            (bool success, ) = account.call{value: refundInWei}("");
            if (!success) revert TransferFailed();
            emit ClaimRefund(account, refundInWei);
        }
    }

    function _mintTokens(address to, uint32 qty) internal {
        for (uint32 i; i != qty; ++i) {
            nft.mint(to);
        }
    }
}
