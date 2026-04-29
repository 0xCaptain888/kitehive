import { expect } from "chai";
import { ethers } from "hardhat";
import { KiteHiveAttestation } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("KiteHiveAttestation", function () {
  let contract: KiteHiveAttestation;
  let coordinator: SignerWithAddress;
  let agent1: SignerWithAddress;
  let agent2: SignerWithAddress;

  beforeEach(async function () {
    [coordinator, agent1, agent2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("KiteHiveAttestation");
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  describe("Attestation", function () {
    it("should create an attestation and update reputation", async function () {
      const taskId = ethers.id("task-001");
      await contract.attest(agent1.address, taskId, 4, "QmTestCID1");

      const attestation = await contract.attestations(taskId);
      expect(attestation.agent).to.equal(agent1.address);
      expect(attestation.qualityScore).to.equal(4);
      expect(attestation.reasoningCID).to.equal("QmTestCID1");

      const [rep, tasks] = await contract.getReputation(agent1.address);
      expect(rep).to.equal(400); // 4 * 100
      expect(tasks).to.equal(1);
    });

    it("should calculate cumulative Bayesian reputation correctly", async function () {
      const task1 = ethers.id("task-001");
      const task2 = ethers.id("task-002");
      const task3 = ethers.id("task-003");

      await contract.attest(agent1.address, task1, 5, "QmCID1"); // rep = 500
      await contract.attest(agent1.address, task2, 3, "QmCID2"); // rep = (500+300)/2 = 400
      await contract.attest(agent1.address, task3, 4, "QmCID3"); // rep = (400*2+400)/3 = 400

      const [rep, tasks] = await contract.getReputation(agent1.address);
      expect(tasks).to.equal(3);
      expect(rep).to.equal(400);
    });

    it("should reject invalid quality scores", async function () {
      const taskId = ethers.id("task-invalid");
      await expect(
        contract.attest(agent1.address, taskId, 0, "QmBadCID")
      ).to.be.revertedWith("Invalid score");
      await expect(
        contract.attest(agent1.address, taskId, 6, "QmBadCID")
      ).to.be.revertedWith("Invalid score");
    });
  });

  describe("Dispute", function () {
    it("should allow agent to raise and resolve dispute", async function () {
      const taskId = ethers.id("task-dispute");
      await contract.attest(agent1.address, taskId, 2, "QmLowScore");

      // Agent raises dispute
      await contract.connect(agent1).raiseDispute(taskId, "QmDisputeReason");
      expect(await contract.disputed(taskId)).to.be.true;

      // Resolve dispute with higher score
      await contract.resolveDispute(taskId, 4);
      expect(await contract.disputed(taskId)).to.be.false;

      const [rep] = await contract.getReputation(agent1.address);
      expect(rep).to.equal(400); // Updated from 200 to 400
    });

    it("should prevent non-agent from raising dispute", async function () {
      const taskId = ethers.id("task-notmine");
      await contract.attest(agent1.address, taskId, 3, "QmCID");

      await expect(
        contract.connect(agent2).raiseDispute(taskId, "QmFakeDispute")
      ).to.be.revertedWith("Not your attestation");
    });
  });
});
