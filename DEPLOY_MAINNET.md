# KiteHive Mainnet Deployment Guide

> Target: Kite Mainnet (Chain ID: 2366) | Gas: ~0.05-0.1 KITE | Time: ~60 min

## Phase 1: Preparation (15 min)

### 1. Environment Check

```bash
ls -la | grep -E "(README.md|TOKENOMICS.md|SECURITY.md)"
ls contracts/scripts/deploy.ts contracts/hardhat.config.ts
```

### 2. Configure `.env`

```bash
# === MAINNET DEPLOYMENT ===
KITE_MAINNET_RPC=https://rpc.gokite.ai
DEPLOYER_PRIVATE_KEY=0x_YOUR_DEPLOYER_PRIVATE_KEY
COORDINATOR_WALLET_KEY=0x_COORDINATOR_A_PRIVATE_KEY
COORDINATOR_B_WALLET_KEY=0x_COORDINATOR_B_PRIVATE_KEY

# Token addresses (from https://docs.gokite.ai/contracts or https://kitescan.ai/tokens)
USDC_TOKEN_ADDR=0x_KITE_MAINNET_USDC_ADDRESS
PYUSD_TOKEN_ADDR=0x_KITE_MAINNET_PYUSD_ADDRESS
```

### 3. Check Wallet Balance

```bash
npx ts-node -e "
const { ethers } = require('ethers');
async function check() {
  const provider = new ethers.JsonRpcProvider('https://rpc.gokite.ai');
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY);
  console.log('Address:', wallet.address);
  const bal = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(bal), 'KITE');
}
check().catch(console.error);
"
```

> Minimum 0.01 KITE required for deployment.

## Phase 2: Contract Deployment (30 min)

### 4. Test Network Connectivity

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  https://rpc.gokite.ai
# Expected: {"result":"0x93e"} (0x93e = 2366)
```

### 5. Compile

```bash
cd contracts
npm install
npx hardhat clean
npx hardhat compile
```

### 6. Deploy

```bash
npx hardhat run scripts/deploy.ts --network kite-mainnet
```

### 7. Update `.env` with deployed address

```bash
echo "ATTESTATION_CONTRACT_MAINNET=0xCONTRACT_ADDRESS" >> ../.env
echo "NEXT_PUBLIC_ATTESTATION_CONTRACT=0xCONTRACT_ADDRESS" >> ../.env
echo "NEXT_PUBLIC_CHAIN_ID=2366" >> ../.env
echo "NEXT_PUBLIC_KITE_EXPLORER=https://kitescan.ai" >> ../.env
```

## Phase 3: Verification (15 min)

### 8. Verify Deployment

```bash
cd contracts
npx ts-node scripts/verify-deployment.ts
```

### 9. Dashboard Test

```bash
cd dashboard
npm run build && npm run dev
# Visit http://localhost:3000 — confirm "Mainnet (Chain 2366)" badge
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `insufficient funds for gas` | Fund wallet with 0.05-0.1 KITE |
| `invalid token address` | Get addresses from https://kitescan.ai/tokens |
| `network connection error` | Check RPC, try backup endpoint |

## Success Criteria

- [ ] Contract visible on https://kitescan.ai/address/YOUR_CONTRACT
- [ ] Chain ID: 2366
- [ ] Initial attestation count = 0
- [ ] 2 coordinators registered
- [ ] Dashboard shows "Mainnet" badge
