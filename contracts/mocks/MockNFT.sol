pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";

contract MockNFT is
    ERC721PresetMinterPauserAutoId("Mock Token", "MT", "uri://")
{
    function mint(uint32 qty, address to) external {
        for (uint32 i; i != qty; ++i) {
            mint(to);
        }
    }
}
