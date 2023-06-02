import { task, types } from "hardhat/config";

task("mint", "Log price").setAction(async (_, { ethers }) => {
  const { chainId } = await ethers.provider.getNetwork();
  const {
    contractAddresses: { DutchAuction },
  } = require(`../logs/deploy-${chainId}.json`);

  // get contract interface
  const dutchFactory = await ethers.getContractFactory("DutchAuction");

  // set contract address
  const dutchContract = dutchFactory.attach(DutchAuction);

  const qty = 1;
  const deadline = 168549600; // TODO: replace this with deadline returned from API call
  const signature =
    "0xe576d224e5083d1c5e61468ac58e2b5ee99808a87fe5405febb95bfdc2743b0947566bd06cc85142def1545bc5ea904a40d37b00d0da48a629e354b520d6e9521b"; // TODO: replace this with signature returned from API call
  console.log(ethers.utils.parseEther("0.0089009375"));
  const tx = await dutchContract.bid(qty, deadline, signature, {
    value: ethers.utils.parseEther("0.0089009375"),
  });
  console.log(`Bid TX submitted: ${tx.hash}`);
  await tx.wait();
  console.log(tx.data);
  console.log("Bid Success!");
});
