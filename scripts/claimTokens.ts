import { ethers } from "hardhat";

async function main() {
  const DutchAuction = await ethers.getContractFactory("DutchAuction");
  if (!process?.env?.AUCTION_ADDRESS) {
    console.error('AUCTION_ADDRESS is not defined')
    return;
  }

  const auction = DutchAuction.attach(process.env.AUCTION_ADDRESS); 

  const tx = await auction.claimTokens(1);
  console.log(`Claim Tokens TX submitted: ${tx.hash}`);
  await tx.wait();
  console.log("Claim Tokens Success!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
