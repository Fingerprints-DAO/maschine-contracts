import { ethers } from "hardhat";

export const takeSnapshot = async (): Promise<number> => {
  const snapshotId = await ethers.provider.send("evm_snapshot", []);
  return snapshotId;
};

export const revertToSnapshot = async (snapshotId: number) => {
  await ethers.provider.send("evm_revert", [snapshotId]);
};
