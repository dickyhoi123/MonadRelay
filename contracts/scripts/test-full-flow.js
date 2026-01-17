/**
 * 完整测试脚本：测试 Track NFT → Session → Master NFT 完整流程
 * 重点测试 Master NFT 能否正确存储所有音轨的音乐数据
 */

const { ethers } = require("hardhat");

async function main() {
  console.log("=== 开始测试完整 NFT 流程 ===\n");

  const [deployer, user1, user2, user3, user4] = await ethers.getSigners();
  console.log("测试账户:");
  console.log("  部署者:", deployer.address);
  console.log("  用户1:", user1.address);
  console.log("  用户2:", user2.address);
  console.log("  用户3:", user3.address);
  console.log("  用户4:", user4.address);
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

  // 准备测试音乐数据
  const createMusicData = (trackType, seed) => {
    const trackData = {
      bpm: 120,
      totalSixteenthNotes: 64,
      tracks: {
        Drum: [],
        Bass: [],
        Synth: [],
        Vocal: []
      }
    };

    // 添加音符数据到对应的轨道类型
    trackData.tracks[trackType] = [
      { note: "C", octave: 3, startTime: seed % 16, duration: 4, velocity: 100, instrumentType: `${trackType.toLowerCase()}_1` },
      { note: "E", octave: 4, startTime: (seed + 4) % 16, duration: 4, velocity: 90, instrumentType: `${trackType.toLowerCase()}_2` },
      { note: "G", octave: 4, startTime: (seed + 8) % 16, duration: 4, velocity: 85, instrumentType: `${trackType.toLowerCase()}_3` },
      { note: "B", octave: 4, startTime: (seed + 12) % 16, duration: 4, velocity: 80, instrumentType: `${trackType.toLowerCase()}_4` }
    ];

    return JSON.stringify(trackData);
  };

  console.log("=== 测试 1: 创建 Session ===");
  const createSessionTx = await musicSession.connect(user1).createSession(
    "Test Full Flow Session",
    "Complete test session with all tracks",
    "Electronic",
    120,
    4
  );
  const sessionReceipt = await createSessionTx.wait();

  let sessionId;
  if (sessionReceipt.logs && sessionReceipt.logs.length > 0) {
    try {
      const sessionIdHex = sessionReceipt.logs[0].topics[1];
      sessionId = parseInt(sessionIdHex, 16);
    } catch (e) {
      sessionId = 1; // 默认值
    }
  } else {
    sessionId = 1; // 默认值
  }
  console.log("  ✅ Session 创建成功！ID:", sessionId);

  console.log("\n=== 测试 2: 铸造 4 个 Track NFTs ===");
  const trackTypes = ["Drum", "Bass", "Synth", "Vocal"];
  const trackTypeEnum = [0, 1, 2, 3];
  const trackIds = [];

  for (let i = 0; i < 4; i++) {
    const trackType = trackTypes[i];
    const musicData = createMusicData(trackType, i * 10);
    console.log(`  铸造 ${trackType} Track...`);

    const mintTx = await trackNFT.connect([user1, user2, user3, user4][i]).mintTrackWithMusicData(
      [user1, user2, user3, user4][i].address,
      trackTypeEnum[i],
      120,
      64,
      musicData
    );

    const receipt = await mintTx.wait();
    let tokenId;
    if (receipt.logs && receipt.logs.length > 0) {
      try {
        const tokenIdHex = receipt.logs[receipt.logs.length - 1].topics[3];
        tokenId = parseInt(tokenIdHex, 16);
      } catch (e) {
        tokenId = i + 1; // 默认值
      }
    } else {
      tokenId = i + 1; // 默认值
    }
    trackIds.push(tokenId);
    console.log(`  ✅ ${trackType} Track 铸造成功！Token ID: ${tokenId}`);
  }

  console.log("\n=== 测试 3: 验证 Track NFT 音乐数据 ===");
  for (let i = 0; i < 4; i++) {
    const musicData = await trackNFT.getMusicData(trackIds[i]);
    const decoded = JSON.parse(musicData.encodedTracks);
    console.log(`  Track ${trackTypes[i]} (ID: ${trackIds[i]}):`);
    console.log(`    - BPM: ${musicData.bpm}`);
    console.log(`    - Total notes: ${musicData.totalSixteenthNotes}`);
    console.log(`    - Has ${trackTypes[i]} data: ${decoded.tracks[trackTypes[i]].length > 0}`);
  }

  console.log("\n=== 测试 4: 依次提交所有 Track 到 Session ===");
  for (let i = 0; i < 4; i++) {
    const joinTx = await musicSession.connect([user1, user2, user3, user4][i]).joinAndCommit(
      sessionId,
      trackIds[i],
      trackTypeEnum[i]
    );
    const joinReceipt = await joinTx.wait();
    console.log(`  ✅ ${trackTypes[i]} Track 提交成功！Gas used: ${joinReceipt.gasUsed.toString()}`);

    // 检查是否有 MasterMinted 事件
    if (joinReceipt.logs.length > 0) {
      console.log(`  Transaction has ${joinReceipt.logs.length} events`);
    }
  }

  console.log("\n=== 测试 5: 获取 Session 信息 ===");
  const sessionInfo = await musicSession.getSessionInfo(sessionId);
  console.log("  Session ID:", sessionInfo[0].toString());
  console.log("  名称:", sessionInfo[1]);
  console.log("  进度:", sessionInfo[6].toString(), "/", sessionInfo[5].toString());
  console.log("  是否完成:", sessionInfo[7]);
  console.log("  Track IDs:", sessionInfo[11].map(id => id.toString()));

  console.log("\n=== 测试 6: 验证 Master NFT 已铸造 ===");
  const isMinted = await masterComposition.isSessionMinted(sessionId);
  console.log("  Session 是否已铸造 Master NFT:", isMinted);

  if (isMinted) {
    const masterTokenId = await masterComposition.sessionToMasterToken(sessionId);
    console.log("  Master Token ID:", masterTokenId.toString());

    console.log("\n=== 测试 7: 获取 Master NFT 信息 ===");
    const masterInfo = await masterComposition.getCompositionInfo(masterTokenId);
    console.log("  Session ID:", masterInfo[0].toString());
    console.log("  贡献者数量:", masterInfo[1].length);
    console.log("  Track 数量:", masterInfo[2].length);

    console.log("\n=== 测试 8: 获取 Master NFT 完整音乐数据（关键测试） ===");
    const masterMusicData = await masterComposition.getCompositionMusicData(masterTokenId);
    console.log("  BPM:", Number(masterMusicData[0]));
    console.log("  Total 16th notes:", Number(masterMusicData[1]));
    console.log("  编码音轨数量:", masterMusicData[2].length);

    // 解码每个音轨的数据
    for (let i = 0; i < masterMusicData[2].length; i++) {
      const encodedTrack = ethers.toUtf8String(masterMusicData[2][i]);
      console.log(`\n  Track ${i + 1} (${trackTypes[i]}):`);
      console.log(`    - 原始长度: ${encodedTrack.length} 字符`);
      console.log(`    - 原始 JSON: ${encodedTrack}`);

      try {
        const decodedTrack = JSON.parse(encodedTrack);
        console.log(`    - 解码后的 tracks 对象:`, JSON.stringify(decodedTrack.tracks));

        // 检查是否有对应类型的数据
        const trackType = trackTypes[i];
        if (decodedTrack.tracks && decodedTrack.tracks[trackType]) {
          console.log(`    - ${trackType} 音符数: ${decodedTrack.tracks[trackType].length}`);
          if (decodedTrack.tracks[trackType].length > 0) {
            console.log(`    - 第一个音符: ${JSON.stringify(decodedTrack.tracks[trackType][0])}`);
          }
        } else {
          console.log(`    - ⚠️ 缺少 ${trackType} 数据！`);
        }
      } catch (e) {
        console.log(`    - ❌ 解码失败: ${e.message}`);
      }
    }

    console.log("\n=== 测试 9: 验证 Master NFT 包含所有音轨数据 ===");
    let allTracksPresent = true;
    for (let i = 0; i < masterMusicData[2].length; i++) {
      const encodedTrack = ethers.toUtf8String(masterMusicData[2][i]);
      const trackType = trackTypes[i];

      try {
        const decodedTrack = JSON.parse(encodedTrack);

        if (!decodedTrack.tracks || !decodedTrack.tracks[trackType] || decodedTrack.tracks[trackType].length === 0) {
          console.log(`  ❌ Track ${trackType} 数据缺失！`);
          allTracksPresent = false;
        } else {
          console.log(`  ✅ Track ${trackType} 数据完整 (${decodedTrack.tracks[trackType].length} notes)`);
        }
      } catch (e) {
        console.log(`  ❌ Track ${trackType} 解码失败: ${e.message}`);
        allTracksPresent = false;
      }
    }

    if (allTracksPresent) {
      console.log("\n=== ✅ 所有测试通过！Master NFT 成功存储所有音轨的完整音乐数据！ ===");
    } else {
      console.log("\n=== ❌ 测试失败：Master NFT 缺少部分音轨数据！ ===");
    }
  } else {
    console.log("\n=== ❌ 测试失败：Master NFT 未铸造！ ===");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("测试失败:", error);
    process.exit(1);
  });
