import { task, types } from "hardhat/config";

task("set-nft-address", "Change erc721 address")
  .addOptionalParam(
    "contractAddress",
    "ERC721 contract address",
    process.env.ERC721_ADDRESS,
    types.string
  )
  .setAction(async ({ contractAddress }, { ethers }) => {
    const { chainId } = await ethers.provider.getNetwork();
    const {
      contractAddresses: { DutchAuction },
    } = require(`../logs/deploy-${chainId}.json`);
    console.log(DutchAuction);
    // get contract interface
    const nftFactory = await ethers.getContractFactory("DutchAuction");
    // set contract address
    const nftContract = nftFactory.attach(DutchAuction);

    await nftContract.setNftContractAddress(contractAddress);
    console.log("new nft contract address ", contractAddress);
  });
