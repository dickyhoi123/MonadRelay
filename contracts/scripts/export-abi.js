const fs = require("fs");
const path = require("path");

const contracts = ["TrackNFT", "MasterComposition", "MusicSession"];

console.log("Exporting contract ABIs...");

contracts.forEach((contract) => {
  const artifactPath = path.join(__dirname, `../artifacts/src/${contract}.sol/${contract}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  
  const abiPath = path.join(__dirname, `../abi/${contract}.json`);
  const abiDir = path.dirname(abiPath);
  
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }
  
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  console.log(`✓ ${contract}.abi exported to ${abiPath}`);
});

console.log("\nAll ABIs exported successfully!");
