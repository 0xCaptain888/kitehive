# KiteHive 9 Upgrades — Installation Guide

## 文件清单

```
kitehive-upgrades/
├── README.md                                       → 替换项目根目录的 README.md       (#09)
├── .env.example                                    → 替换项目根目录的 .env.example     (#01,#03,#05,#08)
├── .github/workflows/ci.yml                        → 新增 CI 工作流                    (#10)
├── contracts/
│   ├── contracts/KiteHiveAttestation.sol           → 替换合约（含 Staking + PYUSD）    (#04,#08)
│   ├── scripts/deploy.ts                           → 替换部署脚本                      (#03)
│   └── hardhat.config.ts                           → 替换 hardhat 配置                 (#03)
├── agents/
│   ├── coordinator-b/index.ts                      → 新增 Coordinator B                (#05)
│   └── worker-template/x402-server.ts              → 替换 x402 服务（含 PYUSD）        (#08)
├── dashboard/
│   ├── app/api/economy/route.ts                    → 替换 economy API（Budget 修复）    (#01)
│   └── lib/llm.ts                                  → 替换 LLM 配置（DeepSeek 统一）    (#06)
└── scripts/simulate-economy.ts                     → 替换模拟脚本（500+ TX）           (#07)
```

---

## 步骤一：复制文件到项目

```bash
# 假设你已经下载了 kitehive-upgrades 到 ~/Downloads/kitehive-upgrades

# 进入你的 kitehive 项目根目录
cd /path/to/kitehive

# #09 — 替换 README
cp ~/Downloads/kitehive-upgrades/README.md ./README.md

# #01 / #03 / #05 / #08 — 替换 .env.example
cp ~/Downloads/kitehive-upgrades/.env.example ./.env.example

# #10 — 添加 CI 工作流
mkdir -p .github/workflows
cp ~/Downloads/kitehive-upgrades/.github/workflows/ci.yml ./.github/workflows/ci.yml

# #04 / #08 — 替换合约（含 Staking + PYUSD）
cp ~/Downloads/kitehive-upgrades/contracts/contracts/KiteHiveAttestation.sol \
   ./contracts/contracts/KiteHiveAttestation.sol

# #03 — 替换部署脚本
cp ~/Downloads/kitehive-upgrades/contracts/scripts/deploy.ts ./contracts/scripts/deploy.ts
cp ~/Downloads/kitehive-upgrades/contracts/hardhat.config.ts ./contracts/hardhat.config.ts

# #05 — 添加 Coordinator B
mkdir -p ./agents/coordinator-b
cp ~/Downloads/kitehive-upgrades/agents/coordinator-b/index.ts ./agents/coordinator-b/index.ts

# #08 — 替换 x402 服务器
cp ~/Downloads/kitehive-upgrades/agents/worker-template/x402-server.ts \
   ./agents/worker-template/x402-server.ts

# #01 — 替换 economy API
cp ~/Downloads/kitehive-upgrades/dashboard/app/api/economy/route.ts \
   ./dashboard/app/api/economy/route.ts

# #06 — 替换 LLM 配置
cp ~/Downloads/kitehive-upgrades/dashboard/lib/llm.ts ./dashboard/lib/llm.ts

# #07 — 替换模拟脚本
cp ~/Downloads/kitehive-upgrades/scripts/simulate-economy.ts ./scripts/simulate-economy.ts
```

---

## 步骤二：配置 .env

```bash
# 如果你还没有 .env，从 example 复制
cp .env.example .env

# 打开 .env 填入：
# - DEEPSEEK_API_KEY (必须)
# - COORDINATOR_B_WALLET_KEY (新增 — 可以用 cast wallet new 生成一个新钱包)
# - KITE_PRIVATE_KEY (必须)
# - 其他已有的 key 保持不变
```

---

## 步骤三：重新编译合约

```bash
cd contracts
npm install
npx hardhat compile

# 运行合约测试（CI 也会运行这个）
npm test
```

---

## 步骤四：部署合约

```bash
# Testnet（重新部署升级后的合约）
cd contracts
npm run deploy:testnet

# ⚠️  部署完成后，把新的合约地址更新到 .env：
# ATTESTATION_CONTRACT_TESTNET=<新地址>
# NEXT_PUBLIC_ATTESTATION_CONTRACT=<新地址>

# Mainnet（升级 #03）
npm run deploy:mainnet
# 更新 .env:
# ATTESTATION_CONTRACT_MAINNET=<mainnet地址>
```

---

## 步骤五：注册 Coordinator B

```bash
# 在 Hardhat console 或单独脚本里调用 registerCoordinator
# 合约 owner（deployer）才能调用

npx ts-node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider(process.env.KITE_TESTNET_RPC);
const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
const abi = ['function registerCoordinator(address) external'];
const contract = new ethers.Contract(process.env.ATTESTATION_CONTRACT_TESTNET, abi, wallet);
contract.registerCoordinator(process.env.COORDINATOR_B_WALLET).then(tx => tx.wait()).then(() => console.log('Coordinator B registered'));
"
```

---

## 步骤六：运行经济模拟（升级 #07）

```bash
cd /path/to/kitehive
npm run simulate

# 预计运行时间：~25 分钟（500 txs × 3 秒间隔）
# 完成后在 Kitescan 上验证：
# https://testnet.kitescan.ai/address/<你的合约地址>
```

---

## 步骤七：启动 Coordinator B（升级 #05）

```bash
# 在新的 terminal 窗口里运行
COORDINATOR_ID=B npx ts-node agents/coordinator-b/index.ts

# 它会运行 5 个任务，在链上产生 attestation
# 对比 Coordinator A 的准确率
```

---

## 步骤八：部署 Dashboard

```bash
cd dashboard
npm run build

# 如果用 Vercel：
# vercel --prod
# 确保所有新的 env vars 都在 Vercel 项目设置里配置了
```

---

## 步骤九：验证所有升级

```bash
# #01 — 打开 dashboard，Session Budget 显示是否正常
open https://kitehive.vercel.app

# #03 — 检查 mainnet 合约是否部署
open https://kitescan.ai

# #04 — 检查合约是否有 depositStake 函数（Kitescan → Contract → Read）
open https://testnet.kitescan.ai/address/<合约地址>

# #05 — 检查 Coordinator B 的 attestation 是否在链上
# recorder 字段应该显示 Coordinator B 的地址

# #06 — 检查 Vercel function logs，应该看到：
# [llm] Using DeepSeek (deepseek-chat) (provider: deepseek)

# #07 — 确认 Kitescan 上 attestation count > 500
open https://testnet.kitescan.ai/address/<合约地址>

# #08 — 检查 agent discovery endpoint 是否列出 PYUSD
curl http://localhost:3001/.well-known/agent | jq '.payment.x402.supportedTokens'

# #09 — README 首屏是否显示新的定位语
open https://github.com/0xCaptain888/kitehive

# #10 — CI badge 是否显示绿色
# Push 一个 commit 后在 Actions tab 检查
```

---

## README 中还需要手动更新的内容

1. Demo Video 链接：把 `https://youtube.com/YOUR_DEMO_LINK` 替换成真实链接
2. Mainnet 合约地址：部署后替换 `MAINNET_ADDRESS`
3. 具体 TX hashes：把 dispute/resolve 的真实 TX hash 填入表格
4. 经济历史 TX hash：把 tier promotion 事件的 TX hash 填入

---

## 提交前检查清单

- [ ] 合约编译无错误 (`npx hardhat compile`)
- [ ] 合约测试通过 (`npm run test:contracts`)
- [ ] Bandit 测试通过 (`npm run test:bandit`)
- [ ] Dashboard 本地运行正常 (`npm run dev`)
- [ ] Session Budget 显示不超额 (< $10.00)
- [ ] Testnet 合约已部署并验证
- [ ] Mainnet 合约已部署
- [ ] 至少有 200+ Kitescan attestation txs
- [ ] Coordinator B 有至少 5 条链上 attestation
- [ ] LLM 一致 — Vercel logs 显示 "DeepSeek"
- [ ] CI workflow 在 Actions tab 显示绿色
- [ ] Demo video 链接在 README 中有效
- [ ] README 顶部定位语已更新
