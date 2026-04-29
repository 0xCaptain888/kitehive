import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying KiteHiveAttestation with account:", deployer.address);
  console.log("Network:", network.name, "Chain ID:", network.config.chainId);

  const KiteHiveAttestation = await ethers.getContractFactory("KiteHiveAttestation");
  const contract = await KiteHiveAttestation.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const tx = contract.deploymentTransaction();
  console.log("KiteHiveAttestation deployed to:", address);
  console.log("Transaction hash:", tx?.hash);

  // Save deployment info
  const networkName = network.name === "kiteTestnet" ? "testnet" : "mainnet";
  const deploymentInfo = {
    address,
    txHash: tx?.hash,
    blockNumber: tx?.blockNumber,
    deployer: deployer.address,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(deploymentsDir, `${networkName}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`Deployment info saved to deployments/${networkName}.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
