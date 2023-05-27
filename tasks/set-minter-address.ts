import { task, types } from "hardhat/config";

task("set-minter-address", "Change minter address on Maschine contract")
  .addOptionalParam(
    "contractAddress",
    "Dutch auction contract address",
    process.env.ERC721_ADDRESS,
    types.string
  )
  .setAction(async ({ contractAddress }, { ethers }) => {
    const { chainId } = await ethers.provider.getNetwork();
    const {
      contractAddresses: { Maschine },
    } = require(`../logs/deploy-${chainId}.json`);
    console.log(Maschine);
    // get contract interface
    const nftFactory = await ethers.getContractFactory("Maschine");
    // set contract address
    const nftContract = nftFactory.attach(Maschine);

    await nftContract.setMinterAddress(contractAddress);
    console.log("new minter address ", contractAddress);
  });
