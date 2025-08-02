const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance));

  // Deploy WillsNFT contract
  console.log("\nDeploying WillsNFT contract...");
  const WillsNFT = await ethers.getContractFactory("WillsNFT");
  const willsNFT = await WillsNFT.deploy();
  await willsNFT.waitForDeployment();
  const willsNFTAddress = await willsNFT.getAddress();
  console.log("WillsNFT deployed to:", willsNFTAddress);

  // Deploy WillExecutor contract
  console.log("\nDeploying WillExecutor contract...");
  const WillExecutor = await ethers.getContractFactory("WillExecutor");
  const willExecutor = await WillExecutor.deploy(willsNFTAddress);
  await willExecutor.waitForDeployment();
  const willExecutorAddress = await willExecutor.getAddress();
  console.log("WillExecutor deployed to:", willExecutorAddress);

  // Authorize the executor contract to execute wills
  console.log("\nAuthorizing WillExecutor contract...");
  const authTx = await willsNFT.authorizeContract(willExecutorAddress);
  await authTx.wait();
  console.log("WillExecutor contract authorized");

  // Verify the authorization
  const isAuthorized = await willsNFT.authorizedContracts(willExecutorAddress);
  console.log("Authorization verified:", isAuthorized);

  // Save deployment addresses to a file for frontend use
  const fs = require('fs');
  const deploymentInfo = {
    network: "localhost",
    chainId: 31337,
    contracts: {
      WillsNFT: {
        address: willsNFTAddress,
        deployer: deployer.address
      },
      WillExecutor: {
        address: willExecutorAddress,
        deployer: deployer.address
      }
    },
    deployedAt: new Date().toISOString(),
    deployer: deployer.address
  };

  fs.writeFileSync(
    'deployment-addresses.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n=== Deployment Complete ===");
  console.log(`WillsNFT: ${willsNFTAddress}`);
  console.log(`WillExecutor: ${willExecutorAddress}`);
  console.log("Deployment info saved to deployment-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });