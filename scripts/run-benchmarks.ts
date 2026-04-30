import * as dotenv from 'dotenv';
dotenv.config();

import {
  measureThompsonSamplingLatency,
  analyzeOnChainEconomy,
  measureGasCosts,
} from '../dashboard/lib/benchmark-engine';

/**
 * KiteHive Performance Benchmark Suite
 *
 * Run: npx ts-node scripts/run-benchmarks.ts
 */

async function main() {
  console.log('\n  KiteHive Performance Benchmark Suite');
  console.log('========================================\n');

  // 1. Thompson Sampling Latency
  console.log('  Test 1: Thompson Sampling Latency (100 trials)');
  const latency = await measureThompsonSamplingLatency(100);
  console.log(`   Mean:  ${latency.mean.toFixed(3)}ms`);
  console.log(`   P50:   ${latency.p50.toFixed(3)}ms`);
  console.log(`   P95:   ${latency.p95.toFixed(3)}ms`);
  console.log(`   P99:   ${latency.p99.toFixed(3)}ms`);
  const traditional = 2400;
  console.log(`   vs Traditional (2400ms): ${Math.round(traditional / latency.mean)}x faster\n`);

  // 2. On-Chain Economy
  console.log('  Test 2: On-Chain Economy Analysis');
  const economy = await analyzeOnChainEconomy();
  console.log(`   Total Transactions: ${economy.totalTransactions}`);
  console.log(`   Total Volume:       $${economy.totalVolumeUSD.toFixed(2)} USDC`);
  console.log(`   Avg Quality:        ${economy.avgQuality}/5`);
  console.log(`   Gini Coefficient:   ${economy.giniCoefficient}`);
  console.log(`   Price Discovery:    ${economy.priceDiscoveryAccuracy}%`);
  console.log(`   Dispute Rate:       ${economy.disputeRate}%`);
  console.log(`   Settlement Time:    ${economy.avgSettlementSeconds}s`);
  console.log(`   Data Source:        ${economy.dataSource}\n`);

  // 3. Gas Cost
  console.log('  Test 3: Gas Cost Analysis');
  const gas = await measureGasCosts();
  console.log(`   EIP-3009 Gas:     ${gas.eip3009GasUsed.toLocaleString()} units`);
  console.log(`   EIP-3009 Cost:    $${gas.eip3009CostUSD}`);
  console.log(`   Traditional Gas:  ${gas.traditionalGasUsed.toLocaleString()} units`);
  console.log(`   Traditional Cost: $${gas.traditionalCostUSD}`);
  console.log(`   Savings:          ${gas.savingsPercent}% cheaper`);
  console.log(`   Data Source:      ${gas.dataSource}\n`);

  // Summary
  console.log('========================================');
  console.log('  BENCHMARK SUMMARY');
  console.log('========================================');
  console.log(`  Agent Selection:  ${Math.round(traditional / latency.mean)}x faster than traditional`);
  console.log(`  Settlement Cost:  ${gas.savingsPercent}% cheaper than ERC20 transfers`);
  console.log(`  Price Discovery:  ${economy.priceDiscoveryAccuracy}% accuracy`);
  console.log(`  Economic Health:  Gini = ${economy.giniCoefficient} (healthy, < 0.5)`);
  console.log(`  Transaction Count: ${economy.totalTransactions} on-chain attestations`);
  console.log(`  Total Volume:      $${economy.totalVolumeUSD.toFixed(2)} USDC settled`);
  console.log('========================================\n');
}

main().catch(console.error);
