pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";

contract MockNFT is
    ERC721PresetMinterPauserAutoId("Mock Token", "MT", "uri://")
{
    uint16 public tokenTokenIdMax;

    constructor() {
        tokenTokenIdMax = 1000;
    }

    function currentTokenId() external view returns (uint256) {
        return totalSupply();
    }
}
