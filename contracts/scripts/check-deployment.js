const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const deployment = JSON.parse(fs.readFileSync("./deployment.json", "utf8"));

  console.log("=== 合约部署信息 ===");
  console.log("TrackNFT:", deployment.TrackNFT);
  console.log("MusicSession:", deployment.MusicSession);
  console.log("MasterComposition:", deployment.MasterComposition);

  const TrackNFT = await ethers.getContractFactory("TrackNFT");
  const trackNFT = TrackNFT.attach(deployment.TrackNFT);

  console.log("\n=== TrackNFT 状态 ===");
  console.log("Music session address:", await trackNFT.musicSession());
  console.log("Next token ID:", await trackNFT._nextTokenId());
  console.log("Owner:", await trackNFT.owner());

  // 尝试获取Token ID 1的音乐数据
  console.log("\n=== Token ID 1 信息 ===");
  try {
    const trackInfo = await trackNFT.getTrackInfo(1);
    console.log("Track info:", trackInfo);
  } catch (e) {
    console.log("No track info for Token ID 1");
  }

  try {
    const musicData = await trackNFT.getMusicData(1);
    console.log("Music data:", musicData);
  } catch (e) {
    console.log("No music data for Token ID 1:", e.message);
  }

  process.exit(0);
}

main().catch(console.error);
