const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy TrackNFT
  console.log("\n1. Deploying TrackNFT...");
  const TrackNFT = await ethers.getContractFactory("TrackNFT");
  const trackNFT = await TrackNFT.deploy();
  await trackNFT.waitForDeployment();
  const trackNFTAddress = await trackNFT.getAddress();
  console.log("   TrackNFT deployed to:", trackNFTAddress);

  // Deploy MasterComposition
  console.log("\n2. Deploying MasterComposition...");
  const MasterComposition = await ethers.getContractFactory("MasterComposition");
  const masterComposition = await MasterComposition.deploy();
  await masterComposition.waitForDeployment();
  const masterCompositionAddress = await masterComposition.getAddress();
  console.log("   MasterComposition deployed to:", masterCompositionAddress);

  // Deploy MusicSession
  console.log("\n3. Deploying MusicSession...");
  const MusicSession = await ethers.getContractFactory("MusicSession");
  const musicSession = await MusicSession.deploy();
  await musicSession.waitForDeployment();
  const musicSessionAddress = await musicSession.getAddress();
  console.log("   MusicSession deployed to:", musicSessionAddress);

  // Configure MusicSession
  console.log("\n4. Configuring MusicSession...");
  const tx1 = await musicSession.setTrackNFT(trackNFTAddress);
  await tx1.wait();
  console.log("   TrackNFT address set in MusicSession");

  const tx2 = await musicSession.setMasterComposition(masterCompositionAddress);
  await tx2.wait();
  console.log("   MasterComposition address set in MusicSession");

  console.log("\n=== Deployment Summary ===");
  console.log("TrackNFT:", trackNFTAddress);
  console.log("MasterComposition:", masterCompositionAddress);
  console.log("MusicSession:", musicSessionAddress);
  console.log("\nDeployment completed successfully!");

  // Save deployment addresses to a file
  const deployment = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    TrackNFT: trackNFTAddress,
    MasterComposition: masterCompositionAddress,
    MusicSession: musicSessionAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  const fs = require("fs");
  fs.writeFileSync(
    "./deployment.json",
    JSON.stringify(deployment, null, 2)
  );
  console.log("\nDeployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
