import { ethers } from "hardhat";

async function main() {
  const DutchAuction = await ethers.getContractFactory("DutchAuction");
  if (!process?.env?.AUCTION_ADDRESS) {
    console.error('AUCTION_ADDRESS is not defined')
    return;
  }

  const auction = DutchAuction.attach(process.env.AUCTION_ADDRESS); 

  const startAmount = ethers.utils.parseEther("5");       // Start amount: 5E
  const endAmount = ethers.utils.parseEther("0.2");       // End amount: 0.2E
  const limit = ethers.utils.parseEther("10");            // Limit: 10E
  const refundDelayTime = 30 * 60;                        // Refund delay time: 30 minutes
  const startTime = 1684126800;                           // Auction start time
  const endTime = startTime + 90 * 60;                    // Auction duration: 90 minutes
  const tx = await auction.setConfig(
    startAmount,
    endAmount,
    limit,
    refundDelayTime,
    startTime,
    endTime
  );
  console.log(`Set Config TX submitted: ${tx.hash}`);
  await tx.wait();
  console.log("Set Config Success!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
