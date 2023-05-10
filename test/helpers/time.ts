import { ethers } from "hardhat";

export const increaseTime = async (t: number) => {
  await ethers.provider.send("evm_increaseTime", [t]);
  await ethers.provider.send("evm_mine", []);
};
