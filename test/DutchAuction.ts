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
  let limit: BigNumber;
  let refundDelayTime: number;
  let startTime: number;
  let endTime: number;
  let snapshotId: number;

  const getSignature = async (
    account: string,
    deadline: number,
    qty: number
  ) => {
    const nonce = await auction.getNonce(account);
    const signature = await signBid(signer, auction.address, {
      account,
      qty,
      nonce,
      deadline,
    });
    return signature;
  };

  const makeBid = async (
    user: SignerWithAddress,
    deadline: number,
    qty: number,
    value: BigNumber
  ) => {
    const signature = await getSignature(user.address, deadline, qty);
    await auction.connect(user).bid(qty, deadline, signature, { value });
  };

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
    limit = ethers.utils.parseEther("10");
    refundDelayTime = 30 * 60;
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
          .setConfig(
            startAmount,
            endAmount,
            limit,
            refundDelayTime,
            startTime,
            endTime
          )
      ).to.be.revertedWith(
        `AccessControl: account ${alice.address.toLowerCase()} is missing role ${defaultAdminRole}`
      );
    });

    it("should fail to set config when startTime is 0", async () => {
      await expect(
        auction
          .connect(admin)
          .setConfig(startAmount, endAmount, limit, refundDelayTime, 0, endTime)
      )
        .to.be.revertedWithCustomError(auction, "InvalidStartEndTime")
        .withArgs(0, endTime);
    });

    it("should fail to set config when startTime >= endTime", async () => {
      await expect(
        auction
          .connect(admin)
          .setConfig(
            startAmount,
            endAmount,
            limit,
            refundDelayTime,
            endTime,
            endTime
          )
      )
        .to.be.revertedWithCustomError(auction, "InvalidStartEndTime")
        .withArgs(endTime, endTime);
    });

    it("should fail to set config when startAmount is 0", async () => {
      await expect(
        auction
          .connect(admin)
          .setConfig(0, endAmount, limit, refundDelayTime, startTime, endTime)
      ).to.be.revertedWithCustomError(auction, "InvalidAmountInWei");
    });

    it("should fail to set config when limit is 0", async () => {
      await expect(
        auction
          .connect(admin)
          .setConfig(
            startAmount,
            endAmount,
            0,
            refundDelayTime,
            startTime,
            endTime
          )
      ).to.be.revertedWithCustomError(auction, "InvalidAmountInWei");
    });

    it("should set config", async () => {
      await auction
        .connect(admin)
        .setConfig(
          startAmount,
          endAmount,
          limit,
          refundDelayTime,
          startTime,
          endTime
        );
      const config = await auction.getConfig();
      expect(config.startAmountInWei).to.be.eq(startAmount);
      expect(config.endAmountInWei).to.be.eq(endAmount);
      expect(config.limitInWei).to.be.eq(limit);
      expect(config.refundDelayTime).to.be.eq(refundDelayTime);
      expect(config.startTime).to.be.eq(startTime);
      expect(config.endTime).to.be.eq(endTime);
    });

    it("should fail to set config when auction is started", async () => {
      await auction
        .connect(admin)
        .setConfig(
          startAmount,
          endAmount,
          limit,
          refundDelayTime,
          startTime,
          endTime
        );
      await expect(
        auction
          .connect(admin)
          .setConfig(
            startAmount,
            endAmount,
            limit,
            refundDelayTime,
            startTime,
            endTime
          )
      ).to.be.revertedWithCustomError(auction, "ConfigAlreadySet");
    });
  });

  describe("Pause/Unpause", () => {
    it("should fail pause the contract as non-admin", async () => {
      await expect(auction.connect(alice).pause()).to.be.revertedWith(
        `AccessControl: account ${alice.address.toLowerCase()} is missing role ${defaultAdminRole}`
      );
    });

    it("should pause the contract", async () => {
      await auction.connect(admin).pause();
      expect(await auction.paused()).to.be.eq(true);
    });

    it("should fail unpause the contract as non-admin", async () => {
      await expect(auction.connect(alice).unpause()).to.be.revertedWith(
        `AccessControl: account ${alice.address.toLowerCase()} is missing role ${defaultAdminRole}`
      );
    });

    it("should pause the contract", async () => {
      await auction.connect(admin).pause();
      await auction.connect(admin).unpause();
      expect(await auction.paused()).to.be.eq(false);
    });
  });

  describe("Bid", () => {
    it("should fail to bid when config is not set", async () => {
      const deadline = Math.floor(Date.now() / 1000) + 1000;
      const qty = 5;
      const signature = await getSignature(alice.address, deadline, qty);
      await expect(
        auction
          .connect(alice)
          .bid(qty, deadline, signature, { value: startAmount.mul(qty) })
      ).to.be.revertedWithCustomError(auction, "ConfigNotSet");
    });

    describe("When config is set", () => {
      beforeEach(async () => {
        await auction
          .connect(admin)
          .setConfig(
            startAmount,
            endAmount,
            limit,
            refundDelayTime,
            startTime,
            endTime
          );
      });

      it("should fail to bid when deadline is expired", async () => {
        const deadline = Math.floor(Date.now() / 1000) - 1000;
        const qty = 5;
        const signature = await getSignature(alice.address, deadline, qty);
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
        const qty = 5;
        const signature = await getSignature(bob.address, deadline, qty);
        await expect(
          auction
            .connect(alice)
            .bid(qty, deadline, signature, { value: startAmount.mul(qty) })
        ).to.be.revertedWithCustomError(auction, "InvalidSignature");
      });

      it("should fail to bid when insufficient eth is sent", async () => {
        const deadline = Math.floor(Date.now() / 1000) + 300;
        const qty = 5;
        const signature = await getSignature(alice.address, deadline, qty);
        await expect(
          auction.connect(alice).bid(qty, deadline, signature, { value: 0 })
        ).to.be.revertedWithCustomError(auction, "NotEnoughValue");
      });

      it("should bid", async () => {
        const deadline = Math.floor(Date.now() / 1000) + 300;
        const nonce = await auction.getNonce(alice.address);
        const qty = 5;
        const signature = await getSignature(alice.address, deadline, qty);
        const tx = await auction
          .connect(alice)
          .bid(qty, deadline, signature, { value: startAmount.mul(qty) });

        await expect(tx).to.emit(auction, "Bid");
        expect(await nft.balanceOf(alice.address)).to.be.eq(qty);
        expect(await auction.getNonce(alice.address)).to.be.eq(nonce.add(1));
      });

      it("should bid more than twice before limit reached", async () => {
        const deadline = Math.floor(Date.now() / 1000) + 3 * 3600;
        const value = startAmount.mul(5);
        await increaseTime(3600);
        await makeBid(alice, deadline, 5, value); // 1.4 x 5 = 7
        await increaseTime(30 * 60);
        await makeBid(alice, deadline, 2, value); // 1.1 x 2 = 2.2
        await increaseTime(30 * 60);
        await makeBid(alice, deadline, 1, value); // 0.8 x 1 = 0.8
      });

      it("should fail to bid when limit reached", async () => {
        const deadline = Math.floor(Date.now() / 1000) + 3 * 3600;
        const value = startAmount.mul(5);
        await increaseTime(3600);
        await makeBid(alice, deadline, 5, value); // 1.4 x 5 = 7
        await increaseTime(40 * 60);
        await makeBid(alice, deadline, 3, value); // 1 x 3 = 3
        await increaseTime(30 * 60);
        const signature = await getSignature(alice.address, deadline, 2);
        await expect(
          auction.connect(alice).bid(2, deadline, signature, { value })
        ).to.be.revertedWithCustomError(auction, "PurchaseLimitReached");
      });

      it("should fail to purchase more than limit", async () => {
        const deadline = Math.floor(Date.now() / 1000) + 300;
        let nonce = await auction.getNonce(alice.address);
        let qty = 5;
        let signature = await signBid(signer, auction.address, {
          account: alice.address,
          qty,
          nonce,
          deadline,
        });
        await auction
          .connect(alice)
          .bid(qty, deadline, signature, { value: startAmount.mul(qty) });

        nonce = await auction.getNonce(alice.address);
        qty = 1;
        signature = await signBid(signer, auction.address, {
          account: alice.address,
          qty,
          nonce,
          deadline,
        });
        await expect(
          auction
            .connect(alice)
            .bid(qty, deadline, signature, { value: startAmount.mul(qty) })
        ).to.be.revertedWithCustomError(auction, "PurchaseLimitReached");
      });

      it("should fail to bid when auction is ended", async () => {
        const deadline = Math.floor(Date.now() / 1000) + 300;
        const qty = 5;
        const signature = await getSignature(alice.address, deadline, qty);
        await increaseTime(3 * 3600);
        await expect(
          auction.connect(alice).bid(qty, deadline, signature, { value: 0 })
        )
          .to.be.revertedWithCustomError(auction, "InvalidStartEndTime")
          .withArgs(startTime, endTime);
      });
    });
  });

  describe("Claim More NFTs", () => {
    it("should fail to claim nfts when config is not set", async () => {
      await expect(
        auction.connect(alice).claimTokens(2)
      ).to.be.revertedWithCustomError(auction, "ConfigNotSet");
    });

    describe("When config is set", () => {
      beforeEach(async () => {
        await auction
          .connect(admin)
          .setConfig(
            startAmount,
            endAmount,
            limit,
            refundDelayTime,
            startTime,
            endTime
          );

        const deadline = Math.floor(Date.now() / 1000) + 300;
        const qty = 3;
        await makeBid(alice, deadline, qty, startAmount.mul(qty));
      });

      it("should fail to claim nfts when there are nothing to claim", async () => {
        await expect(
          auction.connect(alice).claimTokens(2)
        ).to.be.revertedWithCustomError(auction, "NothingToClaim");
      });

      it("should claim nfts - less than claimable", async () => {
        await increaseTime(2 * 3600);

        const tx = await auction.connect(alice).claimTokens(2);
        await expect(tx).to.emit(auction, "Claim").withArgs(alice.address, 2);
      });

      it("should claim nfts - more than claimable", async () => {
        await increaseTime(3600);

        const tx = await auction.connect(alice).claimTokens(5);
        await expect(tx).to.emit(auction, "Claim").withArgs(alice.address, 1);
      });

      it("should claim nfts and claim again later", async () => {
        await increaseTime(3600);
        await auction.connect(alice).claimTokens(5);
        await increaseTime(3600);
        await auction.connect(alice).claimTokens(2);
      });
    });
  });

  describe("Claim Refund", () => {
    it("should fail to claim refund when config is not set", async () => {
      await expect(
        auction.connect(alice).claimRefund()
      ).to.be.revertedWithCustomError(auction, "ConfigNotSet");
    });

    describe("When config is set", () => {
      beforeEach(async () => {
        await auction
          .connect(admin)
          .setConfig(
            startAmount,
            endAmount,
            limit,
            refundDelayTime,
            startTime,
            endTime
          );

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
        ).to.be.revertedWithCustomError(auction, "ClaimRefundNotReady");
      });

      it("should claim refund after the auction is ended and refundDelayTime passed", async () => {
        await increaseTime(3600 * 2 + 30 * 60);

        const beforeAliceBalance = await ethers.provider.getBalance(
          alice.address
        );
        const beforeBobBalance = await ethers.provider.getBalance(bob.address);
        const tx1 = await auction.connect(alice).claimRefund();
        await auction.connect(bob).claimRefund();
        await expect(tx1).to.emit(auction, "ClaimRefund");
        const afterAliceBalance = await ethers.provider.getBalance(
          alice.address
        );
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
        await increaseTime(3600 * 2 + 30 * 60);

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
});
