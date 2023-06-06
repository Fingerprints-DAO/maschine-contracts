import { task, types } from "hardhat/config";

task("set-config", "Start the auction by setting the config").setAction(
  async (_, { ethers }) => {
    const { chainId } = await ethers.provider.getNetwork();
    const {
      contractAddresses: { DutchAuction },
    } = require(`../logs/deploy-${chainId}.json`);

    // get contract interface
    const nftFactory = await ethers.getContractFactory("DutchAuction");

    // set contract address
    const nftContract = nftFactory.attach(DutchAuction);

    // const startTime = Math.floor(Date.now() / 1000) + 60 * 60 * 0.5; // 30 min
    const startTime = Math.floor(Date.now() / 1000) + 60; // 1 minute
    // const startTime = Math.floor(Date.now() / 1000) + 120;
    // const endTime = startTime + 60 * 60 * 5;
    // const endTime = startTime + 1.5 * 3600;
    const endTime = startTime + 60 * 90;
    // const endTime = startTime + 60 * 60 * 12; // 12 hours

    console.log(chainId, DutchAuction);

    const tx = await nftContract.setConfig(
      // ethers.utils.parseEther("0.01"),
      // ethers.utils.parseEther("0.001"),
      // ethers.utils.parseEther("0.05"),
      ethers.utils.parseEther("3"),
      ethers.utils.parseEther("0.2"),
      ethers.utils.parseEther("5"),
      0,
      startTime,
      endTime,
      {
        // gasPrice: ethers.utils.parseUnits("14", "gwei"),
        // gasLimit: 100000,
        // nonce: 18,
      }
    );

    console.log(tx.hash);
    await tx.wait();
    console.log("All configs setted");
  }
);
