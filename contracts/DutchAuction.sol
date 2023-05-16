// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "./IDutchAuction.sol";
import "./INFT.sol";

/// @notice Fingerprints DAO Ductch Auction
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

    modifier validConfig() {
        Config memory config = _config;
        if (config.endTime == 0 || config.startTime == 0) revert ConfigNotSet();
        _;
    }

    modifier validTime() {
        Config memory config = _config;
        if (
            block.timestamp > config.endTime ||
            block.timestamp < config.startTime
        ) revert InvalidStartEndTime(config.startTime, config.endTime);
        _;
    }

    /// @notice DutchAuction Constructor
    /// @param _nft NFT contract address
    /// @param _signer Signer address
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

    /// @notice Set auction config
    /// @dev Only admin can set auction config
    /// @param startAmountInWei Auction start amount in wei
    /// @param endAmountInWei Auction end amount in wei
    /// @param limitInWei Maximum amount users can use to purchase NFTs
    /// @param refundDelayTime Delay time which users need to wait to claim refund after the auction ends
    /// @param startTime Auction start time
    /// @param endTime Auction end time
    function setConfig(
        uint256 startAmountInWei,
        uint256 endAmountInWei,
        uint216 limitInWei,
        uint32 refundDelayTime,
        uint64 startTime,
        uint64 endTime
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_config.startTime != 0 && _config.startTime <= block.timestamp)
            revert ConfigAlreadySet();

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

    /// @notice Pause the auction
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpause the auction
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Get auction config
    /// @return config Auction config
    function getConfig() external view returns (Config memory) {
        return _config;
    }

    /// @notice Get auction's settled price
    /// @return price Auction's settled price
    function getSettledPriceInWei() external view returns (uint256) {
        return _settledPriceInWei;
    }

    /// @notice Get auction's current price
    /// @return price Auction's current price
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

    /// @notice Get user's nonce for signature verification
    /// @param user User address
    /// @return nonce User's nonce
    function getNonce(address user) external view returns (uint256) {
        return _nonces[user];
    }

    /// @dev Return user's current nonce and increase it
    /// @param user User address
    /// @return current Current nonce
    function useNonce(address user) internal returns (uint256 current) {
        current = _nonces[user];
        ++_nonces[user];
    }

    /// @notice Make bid to purchase NFTs
    /// @param qty Amount of tokens to purchase
    /// @param deadline Timestamp when the signature expires
    /// @param signature Signature to verify user's purchase
    function bid(
        uint32 qty,
        uint256 deadline,
        bytes memory signature
    ) external payable nonReentrant whenNotPaused validConfig validTime {
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

    /// @notice Return user's claimable tokens count
    /// @param user User address
    /// @return claimable Claimable tokens count
    function getClaimableTokens(
        address user
    ) public view returns (uint32 claimable) {
        User storage bidder = _userData[user]; // get user's current bid total
        uint256 price = getCurrentPriceInWei();
        claimable = uint32(bidder.contribution / price) - bidder.tokensBidded;
        uint32 available = nft.tokenTokenIdMax() - uint16(nft.currentTokenId());
        if (claimable > available) claimable = available;
    }

    /// @notice Claim additional NFTs without additional payment
    /// @param amount Number of tokens to claim
    function claimTokens(uint32 amount)
        external
        nonReentrant
        whenNotPaused
        validConfig
        validTime
    {
        User storage bidder = _userData[msg.sender]; // get user's current bid total
        uint256 price = getCurrentPriceInWei();
        uint32 claimable = getClaimableTokens(msg.sender);
        if (amount > claimable) amount = claimable;
        if (amount == 0) revert NothingToClaim();

        bidder.tokensBidded = bidder.tokensBidded + amount;
        _totalMinted += amount;

        // _settledPriceInWei is always the minimum price of all the bids' unit price
        if (price < _settledPriceInWei) {
            _settledPriceInWei = price;
        }

        _mintTokens(msg.sender, amount);

        emit Claim(msg.sender, amount);
    }

    /// @notice Admin withdraw funds
    /// @dev Only admin can withdraw funds
    function withdrawFunds()
        external
        nonReentrant
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (_config.endTime > block.timestamp) revert NotEnded();

        uint256 amount = _totalMinted * _settledPriceInWei;
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /// @notice Claim refund payment
    function claimRefund() external nonReentrant validConfig {
        Config memory config = _config;
        if (config.endTime + config.refundDelayTime > block.timestamp)
            revert ClaimRefundNotReady();

        _claimRefund(msg.sender);
    }

    /// @notice Admin forces users to claim refund
    /// @param accounts User addresses
    function refundUsers(
        address[] memory accounts
    ) external nonReentrant validConfig onlyRole(DEFAULT_ADMIN_ROLE) {
        Config memory config = _config;
        if (config.endTime + config.refundDelayTime > block.timestamp)
            revert ClaimRefundNotReady();

        uint256 length;
        for (uint256 i; i != length; ++i) {
            _claimRefund(accounts[i]);
        }
    }

    /// @dev Claim refund
    /// @param account User address
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

    /// @notice Mint `qty` NFTs to `to` address
    /// @param to To address
    /// @param qty Amount of NFTs to mint
    function _mintTokens(address to, uint32 qty) internal {
        for (uint32 i; i != qty; ++i) {
            nft.mint(to);
        }
    }
}
