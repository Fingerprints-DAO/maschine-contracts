import { formatEther } from "ethers/lib/utils";
import { task, types } from "hardhat/config";

task("log-info", "Log contracts info").setAction(async (_, { ethers }) => {
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
  console.log("NFT - Current Supply", await nftContract.totalSupply());
  console.log("NFT - Max Supply", await nftContract.tokenIdMax());
  console.log("Price", formatEther(await dutchContract.getCurrentPriceInWei()));
  console.log("Owner", await nftContract.owner());
  console.log("Signer address", await dutchContract.signerAddress());
  console.log("NFT Contract Address", await dutchContract.nftContractAddress());
  console.log("Treasury Address", await dutchContract.treasuryAddress());
});
