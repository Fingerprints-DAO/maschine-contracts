//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IDutchAuction {
  error ConfigNotSet();
  error ConfigAlreadySet();
  error InvalidAmountInWei();
  error InvalidStartEndTime(uint64 startTime, uint64 endTime);
  error InvalidQuantity();
  error NotEnded();
  error NotEnoughValue();
  error NotRefundable();
  error NotStarted();
  error TransferFailed();
  error UserAlreadyClaimed();
  error BidExpired(uint256 deadline);
  error InvalidSignature();
  error PurchaseLimitReached();
  error ClaimRefundNotReady();
  error NothingToClaim();
  error AlreadyWithdrawn();
  error MaxSupplyReached();

  /**
   * @dev This struct represents a user in the auction.
   * - tokensBidded: the total amount of tokens bidded by the user.
   * - refundClaimed: a flag that indicates whether the user has claimed their refund.
   * - contribution: the total amount of Ether contributed by the user.
   */
  struct User {
    uint216 contribution;
    uint32 tokensBidded;
    bool refundClaimed;
  }

  /**
   * @dev This struct defines the configuration for the auction.
   * - startAmountInWei: the starting price of the NFT tokens in the auction.
   * - endAmountInWei: the final price of the NFT tokens in the auction.
   * - limitInWei: the maximum amount of money the user can spend to buy NFT tokens.
   * - refundDelayTime: the delay time for claiming a refund after the auction ends.
   * - startTime: the start time of the auction.
   * - endTime: the end time of the auction.
   */
  struct Config {
    uint256 startAmountInWei;
    uint256 endAmountInWei;
    uint216 limitInWei;
    uint32 refundDelayTime;
    uint64 startTime;
    uint64 endTime;
  }
  event ClaimRefund(address user, uint256 refundInWei);
  event Bid(address user, uint32 qty, uint256 price);
  event Claim(address user, uint32 qty);
}
