import { ethers } from "hardhat";

async function main() {
  const DutchAuction = await ethers.getContractFactory("DutchAuction");
  if (
    !(
      process?.env?.NFT_ADDRESS &&
      process?.env?.SIGNER_ADDRESS &&
      process?.env?.VAULT_ADDRESS
    )
  ) {
    console.error("missing env addresses");
    return;
  }
  const auction = await DutchAuction.deploy(
    process.env.NFT_ADDRESS,
    process.env.SIGNER_ADDRESS,
    process.env.VAULT_ADDRESS
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
