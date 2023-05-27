import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { faker } from "@faker-js/faker";
import dayjs from "dayjs";

import { formatUnits, parseUnits } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { signBid } from "./helpers/sign";
import { DutchAuction } from "../typechain-types/contracts";

const startAuction = async (auction: DutchAuction) => {
  const [deployer] = await ethers.getSigners();
  const startAmount = ethers.utils.parseEther("2");
  const endAmount = ethers.utils.parseEther("0.2");
  const limit = ethers.utils.parseEther("10");
  const refundDelayTime = 30 * 60;
  const startTime = Math.floor(Date.now() / 1000) - 100;
  const endTime = startTime + 3 * 3600;

  await auction
    .connect(deployer)
    .setConfig(
      startAmount,
      endAmount,
      limit,
      refundDelayTime,
      startTime,
      endTime
    );

  return {
    startAmount,
    endAmount,
    limit,
    refundDelayTime,
    startTime,
    endTime,
  };
};

const getSignature = async (
  auction: DutchAuction,
  account: string,
  deadline: number,
  qty: number
) => {
  const [, , , signer] = await ethers.getSigners();
  const nonce = await auction.getNonce(account);
  const signature = await signBid(signer, auction.address, {
    account,
    qty,
    nonce,
    deadline,
  });
  return signature;
};

describe("Dutch auction integration tests", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  function callFixture(supply = 20) {
    return async function deployFixture() {
      // Contracts are deployed using the first signer/account by default
      const [deployer, alice, bob, signer, treasury, marcia] =
        await ethers.getSigners();

      const Maschine = await ethers.getContractFactory("Maschine");
      const nft = await Maschine.deploy(
        treasury.address,
        deployer.address,
        supply,
        "https://m.harm.work/tokens/"
      );

      const Auction = await ethers.getContractFactory("DutchAuction");
      const auction = await Auction.deploy(
        nft.address,
        signer.address,
        treasury.address
      );

      await nft.setMinterAddress(auction.address);

      return { nft, deployer, alice, bob, auction, marcia };
    };
  }

  describe("Integration", function () {
    it("fails when bid after max supply reached out", async function () {
      const { alice, bob, marcia, auction } = await loadFixture(callFixture(3));
      const deadline = Math.floor(Date.now() / 1000) + 1000;

      const { startAmount } = await startAuction(auction);
      const aliceQty = 1;
      const bobQty = 2;
      const marciaQty = 1;
      const aliceSign = getSignature(
        auction,
        alice.address,
        deadline,
        aliceQty
      );
      const bobSign = getSignature(auction, bob.address, deadline, bobQty);
      const marciaSign = getSignature(
        auction,
        marcia.address,
        deadline,
        marciaQty
      );

      await Promise.all([
        auction.connect(alice).bid(aliceQty, deadline, aliceSign, {
          value: startAmount.mul(aliceQty),
        }),
        auction
          .connect(bob)
          .bid(bobQty, deadline, bobSign, { value: startAmount.mul(bobQty) }),
      ]);

      await expect(
        auction.connect(marcia).bid(marciaQty, deadline, marciaSign, {
          value: startAmount.mul(marciaQty),
        })
      ).to.reverted;
    });
    it("fails when sold out and try to get rebate", async function () {
      const { alice, marcia, auction } = await loadFixture(callFixture(3));
      const deadline = Math.floor(Date.now() / 1000) + 1000;

      const { startAmount } = await startAuction(auction);
      const aliceQty = 3;
      const aliceSign = getSignature(
        auction,
        alice.address,
        deadline,
        aliceQty
      );

      await auction.connect(alice).bid(aliceQty, deadline, aliceSign, {
        value: startAmount.mul(aliceQty + 2),
      });

      await expect(auction.connect(marcia).claimRefund()).to.reverted;
    });
    it("fails when sold out and try to withdraw funds", async function () {
      const { deployer, alice, auction } = await loadFixture(callFixture(3));
      const deadline = Math.floor(Date.now() / 1000) + 1000;

      const { startAmount } = await startAuction(auction);
      const aliceQty = 3;
      const aliceSign = getSignature(
        auction,
        alice.address,
        deadline,
        aliceQty
      );

      await auction.connect(alice).bid(aliceQty, deadline, aliceSign, {
        value: startAmount.mul(aliceQty + 2),
      });

      await expect(auction.connect(deployer).withdrawFunds()).to.reverted;
    });
  });
});
