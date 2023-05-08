//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDutchAuction {
    error InvalidAmountInWei();
    error InvalidStartEndTime(uint64 startTime, uint64 endTime);
    error NotEnded();
    error NotEnoughValue();
    error NotRefundable();
    error NotStarted();
    error TransferFailed();
    error UserAlreadyClaimed();

    struct User {
        uint216 contribution; // cumulative sum of Wei bids
        uint32 tokensBidded; // cumulative sum of bidded tokens
        bool refundClaimed; // has user been refunded yet
    }

    struct Config {
        uint256 startAmountInWei;
        uint256 endAmountInWei;
        uint64 startTime;
        uint64 endTime;
    }
    event ClaimRefund(address user, uint256 refundInWei);
    event Bid(address user, uint32 qty, uint256 price);
}
