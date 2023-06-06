import { task, types } from "hardhat/config";

task("withdrawFunds", "Withdraw funds")
  .addOptionalParam(
    "contractAddress",
    "Dutch auction contract address",
    process.env.ERC721_ADDRESS,
    types.string
  )
  .setAction(async (_, { ethers }) => {
    const { chainId } = await ethers.provider.getNetwork();
    const {
      contractAddresses: { DutchAuction },
    } = require(`../logs/deploy-${chainId}.json`);

    // get contract interface
    const nftFactory = await ethers.getContractFactory("DutchAuction");
    // set contract address
    const nftContract = nftFactory.attach(DutchAuction);

    const tx = await nftContract.withdrawFunds();
    console.log(tx.hash);
    await tx.wait();

    console.log("funds withdrawn to ", await nftContract.treasuryAddress());
  });
