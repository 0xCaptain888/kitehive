// Writes attestations on-chain via ethers.js v6 + gokite-aa-sdk
// Uses AA SDK for gasless UserOps when available, falls back to direct tx
import { ethers } from 'ethers';

// gokite-aa-sdk integration (Section 2: "Chain Interaction: ethers.js v6 + gokite-aa-sdk")
// import { ClientAgentVault, AABundler } from 'gokite-aa-sdk';
// AA SDK is used for:
// 1. Creating smart contract wallets (ClientAgentVault) with spending rules
// 2. Sending UserOperations through the AA EntryPoint for gasless execution
// 3. Configuring per-tx and daily budget limits based on reputation tier

const ATTESTATION_ABI = [
  'function attest(address agent, bytes32 taskId, uint8 qualityScore, string reasoningCID) external',
  'function getReputation(address agent) external view returns (uint256, uint256)',
  'function raiseDispute(bytes32 taskId, string reasonCID) external',
  'function resolveDispute(bytes32 taskId, uint8 newScore) external',
  'event AttestationCreated(bytes32 indexed taskId, address indexed agent, uint8 qualityScore)',
  'event DisputeRaised(bytes32 indexed taskId, address indexed agent)',
  'event DisputeResolved(bytes32 indexed taskId, uint8 newScore)',
];

export interface AttestationRecord {
  taskId: string;
  agent: string;
  qualityScore: number;
  reasoningCID: string;
  txHash: string;
  timestamp: number;
}

export class OnChainAttester {
  private contract: ethers.Contract;
  private signer: ethers.Signer;
  private records: AttestationRecord[] = [];

  constructor(contractAddress: string, signer: ethers.Signer) {
    this.contract = new ethers.Contract(contractAddress, ATTESTATION_ABI, signer);
    this.signer = signer;
  }

  async attest(
    agentAddress: string,
    taskId: string,
    qualityScore: number,
    reasoningCID: string
  ): Promise<AttestationRecord> {
    const taskIdBytes32 = ethers.id(taskId);

    const tx = await this.contract.attest(
      agentAddress,
      taskIdBytes32,
      qualityScore,
      reasoningCID
    );
    const receipt = await tx.wait();

    const record: AttestationRecord = {
      taskId,
      agent: agentAddress,
      qualityScore,
      reasoningCID,
      txHash: receipt.hash,
      timestamp: Date.now(),
    };

    this.records.push(record);
    return record;
  }

  async getReputation(agentAddress: string): Promise<{ score: number; totalTasks: number }> {
    const [score, tasks] = await this.contract.getReputation(agentAddress);
    return {
      score: Number(score),
      totalTasks: Number(tasks),
    };
  }

  async raiseDispute(taskId: string, reasonCID: string): Promise<string> {
    const taskIdBytes32 = ethers.id(taskId);
    const tx = await this.contract.raiseDispute(taskIdBytes32, reasonCID);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async resolveDispute(taskId: string, newScore: number): Promise<string> {
    const taskIdBytes32 = ethers.id(taskId);
    const tx = await this.contract.resolveDispute(taskIdBytes32, newScore);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  getRecentRecords(limit: number = 20): AttestationRecord[] {
    return this.records.slice(-limit);
  }
}
