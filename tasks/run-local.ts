import { TASK_COMPILE, TASK_NODE } from "hardhat/builtin-tasks/task-names";
import { task } from "hardhat/config";

task(
  "run-local",
  "Start a hardhat node, deploy contracts, and execute setup transactions"
).setAction(async (_, { ethers, run }) => {
  const [deployer, DAOVault, bob, marcia] = await ethers.getSigners();

  const { chainId } = await ethers.provider.getNetwork();

  await run(TASK_COMPILE);

  await Promise.race([
    run(TASK_NODE, { hostname: "0.0.0.0" }),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);

  const contracts = await run("deploy-local");

  await Promise.all([
    // run('mint-nfts', {
    //   erc721Mock: contracts.MockNFT.instance.address,
    //   mintTo: DAOVault.address,
    //   qty: 100,
    // }),
  ]);

  console.log(
    `Maschine contracts deployed to local node at http://localhost:8545 (Chain ID: ${chainId})`
  );
  console.log(`ERC721 MockNFT address: ${contracts.Maschine.instance.address}`);

  console.log(
    `Maschine DutchAuction address: ${contracts.DutchAuction.instance.address}`
  );
  await ethers.provider.send("evm_setIntervalMining", [12_000]);

  console.table({
    Maschine: contracts.Maschine.instance.address,
    DutchAuction: contracts.DutchAuction.instance.address,
  });

  await run("set-config");

  await new Promise(() => {
    /* keep node alive until this process is killed */
  });
});
