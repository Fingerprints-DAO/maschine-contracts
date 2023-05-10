import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { signBid } from "./helpers/sign";
import { takeSnapshot, revertToSnapshot } from "./helpers/snapshot";
import { increaseTime } from "./helpers/time";
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
  let snapshotId: number;

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
    startTime = Math.floor(Date.now() / 1000) - 100;
    endTime = startTime + 3 * 3600;
  });

  beforeEach(async () => {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
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
      await auction
        .connect(admin)
        .setConfig(startAmount, endAmount, startTime, endTime);
      const config = await auction.getConfig();
      expect(config.startAmountInWei).to.be.eq(startAmount);
      expect(config.endAmountInWei).to.be.eq(endAmount);
      expect(config.startTime).to.be.eq(startTime);
      expect(config.endTime).to.be.eq(endTime);
    });
  });

  describe("Bid", () => {
    beforeEach(async () => {
      await auction
        .connect(admin)
        .setConfig(startAmount, endAmount, startTime, endTime);
    });

    it("should fail to bid when deadline is expired", async () => {
      const deadline = Math.floor(Date.now() / 1000) - 1000;
      const nonce = await auction.getNonce(alice.address);
      const qty = 5;
      const signature = await signBid(signer, auction.address, {
        account: alice.address,
        qty,
        nonce,
        deadline,
      });
      await expect(
        auction
          .connect(alice)
          .bid(qty, deadline, signature, { value: startAmount.mul(qty) })
      )
        .to.be.revertedWithCustomError(auction, "BidExpired")
        .withArgs(deadline);
    });

    it("should fail to bid when signature is invalid", async () => {
      const deadline = Math.floor(Date.now() / 1000) + 300;
      const nonce = await auction.getNonce(alice.address);
      const qty = 5;
      const signature = await signBid(signer, auction.address, {
        account: bob.address,
        qty,
        nonce,
        deadline,
      });
      await expect(
        auction
          .connect(alice)
          .bid(qty, deadline, signature, { value: startAmount.mul(qty) })
      ).to.be.revertedWithCustomError(auction, "InvalidSignature");
    });

    it("should fail to bid when insufficient eth is sent", async () => {
      const deadline = Math.floor(Date.now() / 1000) + 300;
      const nonce = await auction.getNonce(alice.address);
      const qty = 5;
      const signature = await signBid(signer, auction.address, {
        account: alice.address,
        qty,
        nonce,
        deadline,
      });
      await expect(
        auction.connect(alice).bid(qty, deadline, signature, { value: 0 })
      ).to.be.revertedWithCustomError(auction, "NotEnoughValue");
    });

    it("should bid", async () => {
      const deadline = Math.floor(Date.now() / 1000) + 300;
      const nonce = await auction.getNonce(alice.address);
      const qty = 5;
      const signature = await signBid(signer, auction.address, {
        account: alice.address,
        qty,
        nonce,
        deadline,
      });
      const tx = await auction
        .connect(alice)
        .bid(qty, deadline, signature, { value: startAmount.mul(qty) });

      await expect(tx).to.emit(auction, "Bid");
      expect(await nft.balanceOf(alice.address)).to.be.eq(qty);
      expect(await auction.getNonce(alice.address)).to.be.eq(nonce.add(1));
    });

    it("should fail to bid when auction is ended", async () => {
      const deadline = Math.floor(Date.now() / 1000) + 300;
      const nonce = await auction.getNonce(alice.address);
      const qty = 5;
      const signature = await signBid(signer, auction.address, {
        account: alice.address,
        qty,
        nonce,
        deadline,
      });
      await increaseTime(3 * 3600);
      await expect(
        auction.connect(alice).bid(qty, deadline, signature, { value: 0 })
      )
        .to.be.revertedWithCustomError(auction, "InvalidStartEndTime")
        .withArgs(startTime, endTime);
    });
  });

  describe("Claim Refund", () => {
    beforeEach(async () => {
      await auction
        .connect(admin)
        .setConfig(startAmount, endAmount, startTime, endTime);

      const deadline1 = Math.floor(Date.now() / 1000) + 300;
      const nonce1 = await auction.getNonce(alice.address);
      const qty1 = 5;
      const signature1 = await signBid(signer, auction.address, {
        account: alice.address,
        qty: qty1,
        nonce: nonce1,
        deadline: deadline1,
      });
      await auction
        .connect(alice)
        .bid(qty1, deadline1, signature1, { value: startAmount.mul(qty1) });

      await increaseTime(3600);

      const deadline2 = deadline1 + 3600;
      const nonce2 = await auction.getNonce(bob.address);
      const qty2 = 3;
      const signature2 = await signBid(signer, auction.address, {
        account: bob.address,
        qty: qty2,
        nonce: nonce2,
        deadline: deadline2,
      });
      await auction.connect(bob).bid(qty2, deadline2, signature2, {
        value: startAmount.sub(startAmount.sub(endAmount).div(3)).mul(qty2),
      });
    });

    it("should fail to claim refund before the auction is ended", async () => {
      await expect(
        auction.connect(alice).claimRefund()
      ).to.be.revertedWithCustomError(auction, "NotEnded");
    });

    it("should claim refund after the auction is ended", async () => {
      await increaseTime(3600 * 2);

      const beforeAliceBalance = await ethers.provider.getBalance(
        alice.address
      );
      const beforeBobBalance = await ethers.provider.getBalance(bob.address);
      const tx1 = await auction.connect(alice).claimRefund();
      await auction.connect(bob).claimRefund();
      await expect(tx1).to.emit(auction, "ClaimRefund");
      const afterAliceBalance = await ethers.provider.getBalance(alice.address);
      const afterBobBalance = await ethers.provider.getBalance(bob.address);
      expect(afterAliceBalance).to.be.closeTo(
        beforeAliceBalance.add(startAmount.sub(endAmount).div(3).mul(5)),
        ethers.utils.parseEther("0.1")
      );
      expect(afterBobBalance).to.be.closeTo(
        beforeBobBalance,
        ethers.utils.parseEther("0.1")
      );
    });

    it("should fail to claim refund twice", async () => {
      await increaseTime(3600 * 2);

      await auction.connect(alice).claimRefund();
      await auction.connect(bob).claimRefund();

      await expect(
        auction.connect(alice).claimRefund()
      ).to.be.revertedWithCustomError(auction, "UserAlreadyClaimed");
      await expect(
        auction.connect(bob).claimRefund()
      ).to.be.revertedWithCustomError(auction, "UserAlreadyClaimed");
    });
  });
});
