import { task, types } from "hardhat/config";

task("set-config", "Start the auction by setting the config")
  .addOptionalParam(
    "maschineAddress",
    "Maschine contract address",
    // process.env.AUCTION_ADDRESS,
    process.env.ERC721_ADDRESS,
    types.string
  )
  .setAction(async ({ contractAddress }, { ethers }) => {
    const { chainId } = await ethers.provider.getNetwork();
    const {
      contractAddresses: { DutchAuction },
    } = require(`../logs/deploy-${chainId}.json`);

    // get contract interface
    const nftFactory = await ethers.getContractFactory("DutchAuction");

    // set contract address
    const nftContract = nftFactory.attach(DutchAuction);

    const startTime = Math.floor(Date.now() / 1000) - 100;
    const endTime = startTime + 3 * 3600;

    await nftContract.setConfig(
      ethers.utils.parseEther("2"),
      ethers.utils.parseEther("0.2"),
      ethers.utils.parseEther("10"),
      30 * 60,
      startTime,
      endTime
    );

    console.log("All configs setted");
  });
