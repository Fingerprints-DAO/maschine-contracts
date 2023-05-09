import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { signBid } from "./helpers/sign";
import { DutchAuction, MockNFT } from "../typechain-types";
import { BigNumber } from "ethers";

describe("DutchAuction", function () {
  let nft: MockNFT;
  let auction: DutchAuction;
  let admin: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let signer: SignerWithAddress;
  let defaultAdminRole: string;
  let startAmount: BigNumber;
  let endAmount: BigNumber;
  let startTime: number;
  let endTime: number;

  before("Deploy", async () => {
    [admin, alice, bob, signer] = await ethers.getSigners();

    const MockNFT = await ethers.getContractFactory("MockNFT");
    nft = await MockNFT.deploy();

    const Auction = await ethers.getContractFactory("DutchAuction");
    auction = await Auction.deploy(nft.address, signer.address);

    const minterRole = await nft.MINTER_ROLE();
    await nft.connect(admin).grantRole(minterRole, auction.address);

    defaultAdminRole = await auction.DEFAULT_ADMIN_ROLE();

    startAmount = ethers.utils.parseEther("2");
    endAmount = ethers.utils.parseEther("0.2");
    startTime = Math.floor(Date.now() / 1000);
    endTime = startTime + 3 * 3600;
  });

  describe("Set Config", () => {
    it("should fail to set config as non-admin", async () => {
      await expect(
        auction
          .connect(alice)
          .setConfig(startAmount, endAmount, startTime, endTime)
      ).to.be.revertedWith(
        `AccessControl: account ${alice.address.toLowerCase()} is missing role ${defaultAdminRole}`
      );
    });

    it("should fail to set config when startTime is 0", async () => {
      await expect(
        auction.connect(admin).setConfig(startAmount, endAmount, 0, endTime)
      )
        .to.be.revertedWithCustomError(auction, "InvalidStartEndTime")
        .withArgs(0, endTime);
    });

    it("should fail to set config when startTime >= endTime", async () => {
      await expect(
        auction
          .connect(admin)
          .setConfig(startAmount, endAmount, endTime, endTime)
      )
        .to.be.revertedWithCustomError(auction, "InvalidStartEndTime")
        .withArgs(endTime, endTime);
    });

    it("should fail to set config when startAmount is 0", async () => {
      await expect(
        auction.connect(admin).setConfig(0, endAmount, startTime, endTime)
      ).to.be.revertedWithCustomError(auction, "InvalidAmountInWei");
    });

    it("should set config", async () => {
      await 
        auction.connect(admin).setConfig(startAmount, endAmount, startTime, endTime);
      const config = await auction.getConfig();
      expect(config.startAmountInWei).to.be.eq(startAmount);
      expect(config.endAmountInWei).to.be.eq(endAmount);
      expect(config.startTime).to.be.eq(startTime);
      expect(config.endTime).to.be.eq(endTime);
    });
  });
});
