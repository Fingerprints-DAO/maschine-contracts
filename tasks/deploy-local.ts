import { task } from 'hardhat/config'
import { Contract as EthersContract } from 'ethers'

type LocalContractName = 'MockNFT' | 'DutchAuction'

interface Contract {
  args?: (string | number | (() => string | undefined))[]
  instance?: EthersContract
  libraries?: () => Record<string, string>
  waitForConfirmation?: boolean
}

task('deploy-local', 'Deploy contracts to hardhat').setAction(
  async (_, { ethers }) => {
    const network = await ethers.provider.getNetwork()
    if (network.chainId !== 31337) {
      console.log(`Invalid chain id. Expected 31337. Got: ${network.chainId}.`)
      return
    }

    const [deployer] = await ethers.getSigners()
    await deployer.getTransactionCount()

    const contracts: Record<LocalContractName, Contract> = {
      MockNFT: {
        args: [],
      },
      DutchAuction: {
        args: [
            () => contracts.MockNFT?.instance?.address,
            deployer.address,
        ],
      },
    }

    for (const [name, contract] of Object.entries(contracts)) {
      const factory = await ethers.getContractFactory(name, {
        libraries: contract?.libraries?.(),
      })

      let deployedContract: EthersContract

      deployedContract = await factory.deploy(
        ...(contract.args?.map((a) => (typeof a === 'function' ? a() : a)) ??
          [])
      )

      if (contract.waitForConfirmation) {
        await deployedContract.deployed()
      }

      contracts[name as LocalContractName].instance = deployedContract

      console.log(`${name} contract deployed to ${deployedContract.address}`)
    }

    return contracts
  }
)
