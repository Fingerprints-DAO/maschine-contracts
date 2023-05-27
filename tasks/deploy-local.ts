import { task } from "hardhat/config";
import fs from "fs";
import { Contract as EthersContract } from "ethers";

type LocalContractName = "Maschine" | "DutchAuction";

interface Contract {
  args?: (string | number | (() => string | undefined))[];
  instance?: EthersContract;
  libraries?: () => Record<string, string>;
  waitForConfirmation?: boolean;
}

task("deploy-local", "Deploy contracts to hardhat")
  .addOptionalParam("erc721Address", "", process.env.ERC721_ADDRESS)
  .addOptionalParam("signerAddress", "", process.env.SIGNER_ADDRESS)
  .addOptionalParam("vaultAddress", "", process.env.VAULT_ADDRESS)
  .addOptionalParam("tokenIdMax", "", "1000")
  .addOptionalParam(
    "baseURIValue",
    "",
    "ipfs://QmbozgU3CE4Nxakc3Pwn1WwAys3iQR6vMJm9zEv5YTjJnY/"
  )
  .setAction(
    async (
      { erc721Address, signerAddress, vaultAddress, tokenIdMax, baseURIValue },
      { ethers }
    ) => {
      // erc721Address = erc721Address ?? process.env.ERC721_ADDRESS;
      // signerAddress = signerAddress ?? process.env.SIGNER_ADDRESS;
      // vaultAddress = vaultAddress ?? process.env.VAULT_ADDRESS;

      const network = await ethers.provider.getNetwork();
      if (network.chainId !== 31337) {
        console.log(
          `Invalid chain id. Expected 31337. Got: ${network.chainId}.`
        );
        return;
      }

      const [deployer] = await ethers.getSigners();
      await deployer.getTransactionCount();

      const contracts: Record<LocalContractName, Contract> = {
        Maschine: {
          args: [
            vaultAddress,
            () => contracts.DutchAuction?.instance?.address || vaultAddress,
            tokenIdMax,
            baseURIValue,
          ],
        },
        DutchAuction: {
          args: [
            () => erc721Address || contracts.Maschine?.instance?.address,
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
              Maschine: contracts.Maschine.instance?.address,
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
