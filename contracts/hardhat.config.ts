import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "../.env" });

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
    kiteTestnet: {
      url: "https://rpc-testnet.gokite.ai",
      chainId: 2368,
      accounts: process.env.KITE_PRIVATE_KEY ? [process.env.KITE_PRIVATE_KEY] : [],
    },
    kiteMainnet: {
      url: "https://rpc.gokite.ai",
      chainId: 2366,
      accounts: process.env.KITE_PRIVATE_KEY ? [process.env.KITE_PRIVATE_KEY] : [],
    },
  },
};

export default config;
