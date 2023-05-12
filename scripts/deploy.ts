import { ethers } from "hardhat";

async function main() {
  const DutchAuction = await ethers.getContractFactory("DutchAuction");
  const auction = await DutchAuction.deploy(
    "NFT_ADDRESS", // TODO: replace this with actual NFT contract address
    "SIGNER_ADDRESS" // TODO: replace this with actual signer address
  );

  await auction.deployed();

  console.log(`DutchAuction contract deployed to ${auction.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
