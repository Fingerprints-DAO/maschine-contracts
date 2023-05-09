import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, constants, utils } from "ethers";

const Bid = [
  {
    name: "account",
    type: "address",
  },
  {
    name: "qty",
    type: "uint32",
  },
  {
    name: "nonce",
    type: "uint256",
  },
  {
    name: "deadline",
    type: "uint256",
  },
];

export const signBid = async (signer: SignerWithAddress, verifier: string, terms: any) => {
  const types = {
    Bid,
  };
  return await sign(signer, verifier, types, terms);
};

const sign = async (signer: SignerWithAddress, verifier: string, types: any, terms: any) => {
  const chainId = BigNumber.from(await signer.getChainId());
  const domain = {
    name: "Fingerprints DAO Dutch Auction",
    version: "1",
    chainId,
    verifyingContract: verifier,
  };
  const signature = await signer._signTypedData(domain, types, terms);
  return signature;
};

export default signBid;
