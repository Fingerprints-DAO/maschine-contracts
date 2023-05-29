import { task } from "hardhat/config";
import fs from "fs";
import { Contract as EthersContract } from "ethers";

type LocalContractName = "DutchAuction";

interface Contract {
  args?: (string | number | (() => string | undefined))[];
  instance?: EthersContract;
  libraries?: () => Record<string, string>;
  waitForConfirmation?: boolean;
}

task("deploy", "Deploy contracts to testnet and mainnet")
  .addOptionalParam("erc721Address", "", process.env.ERC721_ADDRESS)
  .addOptionalParam("signerAddress", "", process.env.SIGNER_ADDRESS)
  .addOptionalParam("vaultAddress", "", process.env.VAULT_ADDRESS)
  .setAction(
    async ({ erc721Address, signerAddress, vaultAddress }, { ethers }) => {
      const network = await ethers.provider.getNetwork();
      if (network.chainId === 31337) {
        console.log(`Invalid chain id. Expected !== 31337`);
        return;
      }

      const [deployer] = await ethers.getSigners();
      await deployer.getTransactionCount();

      const contracts: Record<LocalContractName, Contract> = {
        DutchAuction: {
          args: [
            erc721Address,
            signerAddress || deployer.address,
            vaultAddress || deployer.address,
          ],
        },
      };

      for (const [name, contract] of Object.entries(contracts)) {
        const factory = await ethers.getContractFactory(name, {
          libraries: contract?.libraries?.(),
        });

        let deployedContract: EthersContract;

        deployedContract = await factory.deploy(
          ...(contract.args?.map((a) => (typeof a === "function" ? a() : a)) ??
            [])
        );

        if (contract.waitForConfirmation) {
          await deployedContract.deployed();
        }

        contracts[name as LocalContractName].instance = deployedContract;

        console.log(`${name} contract deployed to ${deployedContract.address}`);
      }

      console.log("Writting logs");
      if (!fs.existsSync("logs")) {
        fs.mkdirSync("logs");
        console.log("Created logs folder");
      }
      fs.writeFileSync(
        `logs/deploy-${network.chainId}.json`,
        JSON.stringify(
          {
            contractAddresses: {
              Maschine: erc721Address,
              DutchAuction: contracts.DutchAuction.instance?.address,
            },
          },
          null,
          2
        ),
        { flag: "w" }
      );

      console.log("Address wrote on file");
      return contracts;
    }
  );
