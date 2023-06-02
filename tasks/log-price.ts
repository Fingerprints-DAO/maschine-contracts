import { task, types } from "hardhat/config";

task("log-price", "Log price").setAction(async (_, { ethers }) => {
  const { chainId } = await ethers.provider.getNetwork();
  const {
    contractAddresses: { DutchAuction },
  } = require(`../logs/deploy-${chainId}.json`);

  // get contract interface
  const dutchFactory = await ethers.getContractFactory("DutchAuction");

  // set contract address
  const dutchContract = dutchFactory.attach(DutchAuction);

  console.log("Dutch price", await dutchContract.getCurrentPriceInWei());
});
