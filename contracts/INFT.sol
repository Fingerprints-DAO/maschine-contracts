//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface INFT {
    function tokenTokenIdMax() external view returns (uint16);

    function currentTokenId() external view returns (uint256);

    function mint(address to) external;
}
