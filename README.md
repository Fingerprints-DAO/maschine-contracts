# Maschine Dutch Auction Contract

This Dutch Auction Contract is a specialized Ethereum smart contract implemented to facilitate the sale of Non-Fungible Tokens (NFTs) in a decreasing price format.

## Overview

This contract starts the auction with a high asking price which decreases over time based on a predefined schedule. Participants bid for NFTs at the current price. The NFTs are distributed instantly when a bid is made.

## Key Features

**1. Bidding and Immediate Ownership:** Participants can bid for the NFTs they want to purchase. Upon successful bidding, NFTs are minted and immediately transferred to the participant.

**2. Claiming Additional NFTs:** The contract has a unique feature allowing participants to claim more NFTs without any extra payment. This feature uses their potential refund balance during the ongoing auction.

**3. Price Calculation:** The current price is calculated based on the elapsed time since the start of the auction. The price will not decrease below the predetermined end price.

**4. Auction Management:** The contract allows administrators to pause, unpause, or withdraw funds (after the auction has ended) with secure access control features.

**5. Refund Mechanism:** A mechanism is set for refunding the excess paid by users after the auction ends. The amount of refund is based on the difference between the price at the bid time and the final settled price. Refunds can be claimed individually by users, or forced by the administrator for a batch of users.

**6. Signature Verification:** Bid function requires a valid EIP-712 signature to verify user's intention. This ensures a secure and verifiable way of placing bids.

## Getting Started

Before we get into how to use the `Dutch Auction` contract, make sure you have Node.js and yarn installed on your system. If not, you can download and install them from [here](https://nodejs.org/en/download/).

### Installation

1. **Clone the Repository**

   Start by cloning the repository to your local machine. You can do this with the following command:

   ```bash
   git clone https://github.com/Fingerprints-DAO/maschine-contracts.git
   ```

2. **Install Dependencies**

   Navigate into the cloned repository and install the required dependencies with:

   ```bash
   cd maschine-contracts
   yarn install
   ```

3. **Setup Environment Variables**

   We need to setup the environment variables. Create a `.env` file in the root directory of the project and copy all the fields from the `.env-example` file into the `.env` file. Make sure to replace the placeholders with the actual values for your setup.

### Running the Contract Locally

To run the contract locally, you will be using the local Ethereum node created by Hardhat in combination with the provided scripts.

1. **Compile the Contract**

   Before running the contract, compile it using:

   ```bash
   yarn compile
   ```

2. **Configure the Auction**

   You will need to customize the parameters for the DutchAuction in the `set-config` task file (located in the `tasks` directory) according to your needs. This configuration file includes settings for the auction's start and end times, initial and final prices, and more.

3. **Deploy and Configure the Contract Locally**

   To deploy and configure the contract locally, the project provides a Hardhat task called "run-local". This task will:

   - Start a local Ethereum node
   - Deploy your contracts to this local node
   - Execute the contract configuration based on your `set-config` settings

   You can run this task using the following command:

   ```bash
   yarn run task:run-local
   ```

   After running this command, you should see the addresses of the deployed Maschine and DutchAuction contracts in the console.

4. **Deploy to Testnet**

   You can deploy the contract to the Goerli test network using:

   ```bash
   yarn run deploy:testnet
   ```

5. **Running Tests**

   You can watch for changes in your test files and run tests automatically with:

   ```bash
   yarn run test:watch
   ```

   To run the contract locally, use:

   ```bash
   yarn run task:run-local
   ```

### Generating Reports

1. **Gas Usage Report**

   Generate a gas report with:

   ```bash
   yarn run hardhat-gas-reporter
   ```

2. **Coverage Report**

   Run solidity-coverage to check how much of your contract is covered by your tests:

   ```bash
   yarn run coverage
   ```

3. **Documentation**

   To generate documentation of your project, use:

   ```bash
   yarn run run:docs
   ```

## Authors and Acknowledgments

This project is developed and maintained by [arod.studio](https://arod.studio/), and [Fingerprints DAO](https://fingerprintsdao.xyz/).

## Support and Contact

For any technical questions or support, feel free to reach out to us on Twitter:

- [@theArodEth](https://twitter.com/theArodEth)
- [@arodstudioxyz](https://twitter.com/arodstudioxyz)

## Development

This project is open-source and contributions are welcome. Please feel free to fork this repository, open issues, or submit pull requests.

## License

This project is [MIT licensed](./LICENSE.md).
