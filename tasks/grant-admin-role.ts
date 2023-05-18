import { task, types } from 'hardhat/config'

task(
  'grant-admin-role',
  'Grant admin role'
)
    .addParam('wallet', 'Wallet to grant admin', null, types.string)
    .setAction(async ({ wallet }, { ethers }) => {
        console.log(wallet)
        const { chainId } = await ethers.provider.getNetwork()
        const { contractAddresses: { DutchAuction } } = require(`../logs/deploy-${chainId}.json`);
        console.log(DutchAuction)
        // get contract interface
        const nftFactory = await ethers.getContractFactory('DutchAuction')
        // set contract address
        const nftContract = nftFactory.attach(DutchAuction)

        const DEFAULT_ADMIN_ROLE = await nftContract.DEFAULT_ADMIN_ROLE()
        
        await nftContract.grantRole(DEFAULT_ADMIN_ROLE, wallet)
        console.log('admin granted to ', wallet)
    })
