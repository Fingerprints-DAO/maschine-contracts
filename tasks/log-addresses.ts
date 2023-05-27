import { task, types } from "hardhat/config";

task(
  "log-addresses",
  "Log minter and nft addresses set on each contract"
).setAction(async (_, { ethers }) => {
  const { chainId } = await ethers.provider.getNetwork();
  const {
    contractAddresses: { DutchAuction, Maschine },
  } = require(`../logs/deploy-${chainId}.json`);

  // get contract interface
  const dutchFactory = await ethers.getContractFactory("DutchAuction");
  const nftFactory = await ethers.getContractFactory("Maschine");

  // set contract address
  const dutchContract = dutchFactory.attach(DutchAuction);
  const nftContract = nftFactory.attach(Maschine);

  console.log("Dutch address", await dutchContract.address);
  console.log("NFT address", await nftContract.address);
  console.log(
    "Dutch instance - nft address",
    await dutchContract.nftContractAddress()
  );
  console.log(
    "NFT instance - minter address",
    await nftContract.minterContractAddress()
  );
});
