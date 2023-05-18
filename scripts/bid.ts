import { ethers } from "hardhat";

async function main() {
  const DutchAuction = await ethers.getContractFactory("DutchAuction");
  if (!process?.env?.AUCTION_ADDRESS) {
    console.error('AUCTION_ADDRESS is not defined')
    return;
  }
  const auction = DutchAuction.attach(process.env.AUCTION_ADDRESS); // TODO: insert auction contract address here

  const qty = 5;
  const deadline = 1684126800; // TODO: replace this with deadline returned from API call
  const signature = "SIGNATURE_PLACEHOLDER"; // TODO: replace this with signature returned from API call
  const tx = await auction.bid(
    qty,
    deadline,
    signature,
    {
      value: ethers.utils.parseEther("25")
    }
  );
  console.log(`Bid TX submitted: ${tx.hash}`);
  await tx.wait();
  console.log("Bid Success!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
