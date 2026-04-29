#!/bin/bash
# Deploy KiteHiveAttestation to Kite Testnet
cd "$(dirname "$0")/../contracts"
KITE_PRIVATE_KEY=${KITE_PRIVATE_KEY:-"0x3295ce3f6f56f22e369d77eaaef764d302387d6d9cd548e243763747b82d20a6"}
npx hardhat run scripts/deploy.ts --network kiteTestnet
echo "Done! Check contracts/deployments/ for the contract address."
