/**
 * 测试脚本：测试完整的 NFT 编码-解码-上链流程
 * 使用 ethers.js 直接调用合约
 */

const { ethers } = require("hardhat");

async function main() {
  console.log("=== 开始测试 NFT 编码-解码-上链流程 ===\n");

  const [deployer, user1, user2] = await ethers.getSigners();
  console.log("测试账户:");
  console.log("  部署者:", deployer.address);
  console.log("  用户1:", user1.address);
  console.log("  用户2:", user2.address);
  console.log("");

  // 读取部署信息
  const fs = require("fs");
  const deployment = JSON.parse(fs.readFileSync("./deployment.json", "utf8"));

  console.log("=== 合约地址 ===");
  console.log("  TrackNFT:", deployment.TrackNFT);
  console.log("  MusicSession:", deployment.MusicSession);
  console.log("  MasterComposition:", deployment.MasterComposition);
  console.log("");

  // 获取合约实例
  const TrackNFT = await ethers.getContractFactory("TrackNFT");
  const trackNFT = TrackNFT.attach(deployment.TrackNFT);

  const MusicSession = await ethers.getContractFactory("MusicSession");
  const musicSession = MusicSession.attach(deployment.MusicSession);

  const MasterComposition = await ethers.getContractFactory("MasterComposition");
  const masterComposition = MasterComposition.attach(deployment.MasterComposition);

  console.log("=== 测试 1: 铸造 Track NFT ===");
  const testMusicData = JSON.stringify({
    bpm: 120,
    totalSixteenthNotes: 64,
    tracks: {
      "Drum": [
        { note: "C", octave: 3, startTime: 0, duration: 4, velocity: 100, instrumentType: "drum_kick" },
        { note: "C", octave: 3, startTime: 4, duration: 4, velocity: 100, instrumentType: "drum_kick" },
        { note: "C", octave: 3, startTime: 8, duration: 4, velocity: 100, instrumentType: "drum_kick" },
        { note: "C", octave: 3, startTime: 12, duration: 4, velocity: 100, instrumentType: "drum_kick" }
      ],
      "Bass": [
        { note: "C", octave: 2, startTime: 0, duration: 16, velocity: 90, instrumentType: "bass_synth" }
      ],
      "Synth": [
        { note: "E", octave: 4, startTime: 0, duration: 4, velocity: 80, instrumentType: "synth_lead" },
        { note: "G", octave: 4, startTime: 4, duration: 4, velocity: 80, instrumentType: "synth_lead" },
        { note: "A", octave: 4, startTime: 8, duration: 4, velocity: 80, instrumentType: "synth_lead" },
        { note: "B", octave: 4, startTime: 12, duration: 4, velocity: 80, instrumentType: "synth_lead" }
      ],
      "Vocal": []
    }
  });

  console.log("  编码的音乐数据长度:", testMusicData.length, "字符");

  const mintTx = await trackNFT.connect(user1).mintTrackWithMusicData(
    user1.address,
    0, // Drum
    120, // BPM
    64, // Total 16th notes
    testMusicData
  );

  console.log("  交易哈希:", mintTx.hash);
  const receipt = await mintTx.wait();
  console.log("  ✅ Track NFT 铸造成功！");

  // 从事件中获取 Token ID
  const transferEvent = receipt.logs.find(
    log => log.topics.length === 4
  );

  if (transferEvent) {
    const tokenId = ethers.toNumber(transferEvent.topics[3]);
    console.log("  Token ID:", tokenId);

    console.log("\n=== 测试 2: 从 NFT 读取音乐数据 ===");
    const musicData = await trackNFT.getMusicData(tokenId);
    console.log("  BPM:", musicData.bpm.toString());
    console.log("  Total 16th notes:", musicData.totalSixteenthNotes.toString());
    console.log("  编码数据长度:", musicData.encodedTracks.length);

    const decodedData = JSON.parse(musicData.encodedTracks);
    console.log("  解码的轨道类型:", Object.keys(decodedData.tracks));
    console.log("  ✅ 音乐数据读取成功！");

    console.log("\n=== 测试 3: 创建 Music Session ===");
    const createSessionTx = await musicSession.connect(user1).createSession(
      "Test Session",
      "This is a test session",
      "Electronic",
      120, // BPM
      4    // Max tracks
    );

    console.log("  交易哈希:", createSessionTx.hash);
    const sessionReceipt = await createSessionTx.wait();

    // 从事件中获取 Session ID
    const sessionEvent = sessionReceipt.logs.find(
      log => log.topics.length > 0
    );

    let sessionId = 0;
    if (sessionEvent) {
      sessionId = ethers.toNumber(sessionEvent.topics[1]);
      console.log("  ✅ Session 创建成功！ID:", sessionId);
    }

    console.log("\n=== 测试 4: 加入 Session 并提交 Track ===");
    const joinTx = await musicSession.connect(user1).joinAndCommit(
      sessionId,
      tokenId,
      0 // Drum
    );

    console.log("  交易哈希:", joinTx.hash);
    await joinTx.wait();
    console.log("  ✅ Track 提交成功！");

    console.log("\n=== 测试 5: 获取 Session 信息 ===");
    const sessionInfo = await musicSession.getSessionInfo(sessionId);
    console.log("  Session ID:", sessionInfo[0].toString());
    console.log("  名称:", sessionInfo[1]);
    console.log("  贡献者数量:", sessionInfo[10].length);
    console.log("  Track IDs:", sessionInfo[11].map(id => id.toString()));
    console.log("  是否完成:", sessionInfo[7]);
    console.log("  ✅ Session 信息读取成功！");

    console.log("\n=== 所有测试通过！✅ ===");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("测试失败:", error);
    process.exit(1);
  });
