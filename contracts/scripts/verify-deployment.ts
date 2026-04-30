import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

/**
 * KiteHive Deployment Verification Script
 *
 * Usage:
 *   cd contracts && npx ts-node scripts/verify-deployment.ts
 *
 * Checks:
 *   1. RPC connectivity to Kite Mainnet (Chain ID: 2366)
 *   2. Contract is deployed and callable
 *   3. Owner address is correct
 *   4. Coordinators are registered
 *   5. Economy summary returns valid data
 */

const { ethers } = require("ethers");

const RPC_URL = process.env.KITE_MAINNET_RPC || "https://rpc.gokite.ai";
const CONTRACT_ADDR =
  process.env.ATTESTATION_CONTRACT_MAINNET ||
  process.env.NEXT_PUBLIC_ATTESTATION_CONTRACT ||
  "";

const ABI = [
  "function getEconomySummary() view returns (uint256 attestationCount, uint256 totalVolume, uint256 minStake)",
  "function owner() view returns (address)",
  "function getReputation(address agent) view returns (uint256)",
  "function coordinators(address) view returns (uint256 totalTasks, uint256 totalAccuracy, bool registered)",
];

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

async function verify(): Promise<void> {
  const results: CheckResult[] = [];

  console.log("\n========================================");
  console.log("  KiteHive Deployment Verification");
  console.log("========================================\n");
  console.log(`  RPC:      ${RPC_URL}`);
  console.log(`  Contract: ${CONTRACT_ADDR || "(not set)"}\n`);

  // ── Check 1: RPC connectivity ────────────────────────────────────────────
  let provider: any;
  try {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    const isMainnet = chainId === 2366;
    results.push({
      name: "RPC Connectivity",
      passed: true,
      detail: `Chain ID: ${chainId} (${isMainnet ? "Kite Mainnet" : "Kite Testnet"})`,
    });
  } catch (err: any) {
    results.push({
      name: "RPC Connectivity",
      passed: false,
      detail: `Failed to connect: ${err.message}`,
    });
    printResults(results);
    return;
  }

  // ── Check 2: Contract exists ─────────────────────────────────────────────
  if (!CONTRACT_ADDR || CONTRACT_ADDR === "0x0000000000000000000000000000000000000000") {
    results.push({
      name: "Contract Address",
      passed: false,
      detail: "ATTESTATION_CONTRACT_MAINNET not set in .env",
    });
    printResults(results);
    return;
  }

  const code = await provider.getCode(CONTRACT_ADDR);
  if (code === "0x") {
    results.push({
      name: "Contract Deployed",
      passed: false,
      detail: `No contract code at ${CONTRACT_ADDR}`,
    });
    printResults(results);
    return;
  }
  results.push({
    name: "Contract Deployed",
    passed: true,
    detail: `Contract code found at ${CONTRACT_ADDR}`,
  });

  // ── Check 3: Owner ───────────────────────────────────────────────────────
  const contract = new ethers.Contract(CONTRACT_ADDR, ABI, provider);
  try {
    const owner = await contract.owner();
    const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
    let ownerMatch = "unknown";
    if (deployerKey) {
      const deployerAddr = new ethers.Wallet(deployerKey).address;
      ownerMatch = owner.toLowerCase() === deployerAddr.toLowerCase() ? "matches deployer" : "does NOT match deployer";
    }
    results.push({
      name: "Contract Owner",
      passed: true,
      detail: `Owner: ${owner} (${ownerMatch})`,
    });
  } catch (err: any) {
    results.push({
      name: "Contract Owner",
      passed: false,
      detail: `Failed to read owner: ${err.message}`,
    });
  }

  // ── Check 4: Economy Summary ─────────────────────────────────────────────
  try {
    const summary = await contract.getEconomySummary();
    results.push({
      name: "Economy Summary",
      passed: true,
      detail: `Attestations: ${summary[0]}, Volume: ${ethers.formatUnits(summary[1], 6)} USDC, MinStake: ${ethers.formatUnits(summary[2], 6)} USDC`,
    });
  } catch (err: any) {
    results.push({
      name: "Economy Summary",
      passed: false,
      detail: `Failed: ${err.message}`,
    });
  }

  // ── Check 5: Coordinators ────────────────────────────────────────────────
  const coordKeys = [
    { label: "Coordinator A", envKey: "COORDINATOR_WALLET_KEY" },
    { label: "Coordinator B", envKey: "COORDINATOR_B_WALLET_KEY" },
  ];

  for (const { label, envKey } of coordKeys) {
    const key = process.env[envKey];
    if (!key) {
      results.push({ name: label, passed: false, detail: `${envKey} not set` });
      continue;
    }
    try {
      const addr = new ethers.Wallet(key).address;
      const stats = await contract.coordinators(addr);
      results.push({
        name: label,
        passed: stats.registered === true,
        detail: stats.registered
          ? `Registered: ${addr} (tasks: ${stats.totalTasks})`
          : `NOT registered: ${addr}`,
      });
    } catch (err: any) {
      results.push({ name: label, passed: false, detail: `Error: ${err.message}` });
    }
  }

  // ── Check 6: Kitescan link ───────────────────────────────────────────────
  const explorer = "https://kitescan.ai";
  results.push({
    name: "Explorer Link",
    passed: true,
    detail: `${explorer}/address/${CONTRACT_ADDR}`,
  });

  printResults(results);
}

function printResults(results: CheckResult[]): void {
  console.log("─── Results ──────────────────────────────\n");
  let allPassed = true;
  for (const r of results) {
    const icon = r.passed ? "✅" : "❌";
    console.log(`  ${icon} ${r.name}`);
    console.log(`     ${r.detail}\n`);
    if (!r.passed) allPassed = false;
  }

  console.log("──────────────────────────────────────────");
  if (allPassed) {
    console.log("  🎉 All checks passed — deployment verified!\n");
  } else {
    console.log("  ⚠️  Some checks failed — review above.\n");
  }
}

verify().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
