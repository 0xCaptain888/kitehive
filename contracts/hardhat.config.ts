import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x" + "0".repeat(64);

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // ── Local ──────────────────────────────────────────────────────────────
    hardhat: {},

    // ── Kite Testnet (Chain ID: 2368) ──────────────────────────────────────
    "kite-testnet": {
      url:      process.env.KITE_TESTNET_RPC || "https://rpc-testnet.gokite.ai",
      chainId:  2368,
      accounts: [DEPLOYER_KEY],
      gasPrice: "auto",
    },

    // ── Kite Mainnet (Chain ID: 2366) ──────────────────────────────────────
    "kite-mainnet": {
      url:      process.env.KITE_MAINNET_RPC || "https://rpc.gokite.ai",
      chainId:  2366,
      accounts: [DEPLOYER_KEY],
      gasPrice: "auto",
    },
  },
  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
