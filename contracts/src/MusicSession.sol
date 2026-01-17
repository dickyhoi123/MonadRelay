z// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TrackNFT.sol";
import "./MasterComposition.sol";

/**
 * @title MusicSession
 * @dev 核心逻辑合约，管理音乐创作的接力流程
 */
contract MusicSession is Ownable, ReentrancyGuard {

    // Session 状态结构
    struct Session {
        uint256 id;                        // Session ID
        address[] contributors;            // 贡献者地址数组
        uint256[] trackIds;                // 音轨 NFT 数组（按顺序）
        mapping(TrackNFT.TrackType => bool) trackFilled; // 各类型是否已填满
        uint256 currentTrackIndex;         // 当前应该提交的音轨索引
        bool isFinalized;                  // 是否完成
        uint256 createdAt;                 // 创建时间
        uint256 completedAt;               // 完成时间
        string sessionName;                // Session 名称
        string description;                // 描述
        string genre;                      // 音乐风格
        uint256 bpm;                       // BPM
        uint256 maxTracks;                 // 最大音轨数（默认为 4）
    }

    // Track 类型到索引的映射
    mapping(TrackNFT.TrackType => uint256) public trackTypeToIndex;
    
    // Session 存储
    mapping(uint256 => Session) public sessions;
    
    uint256 private _nextSessionId;
    uint256 public totalSessions;
    
    // Track NFT 合约地址
    TrackNFT public trackNFT;
    
    // Master NFT 合约地址
    MasterComposition public masterComposition;
    
    // 配置参数
    uint256 public constant DEFAULT_MAX_TRACKS = 4;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 500;
    
    // 事件定义
    event SessionCreated(
        uint256 indexed sessionId,
        address indexed creator,
        string sessionName,
        string genre,
        uint256 bpm
    );

    event TrackCommitted(
        uint256 indexed sessionId,
        uint256 indexed trackId,
        address indexed contributor,
        TrackNFT.TrackType trackType,
        uint256 trackIndex
    );

    event SessionFinalized(
        uint256 indexed sessionId,
        uint256 masterTokenId,
        address[] contributors,
        uint256[] trackIds
    );

    event SessionCancelled(
        uint256 indexed sessionId,
        address indexed creator
    );

    modifier onlyValidSession(uint256 sessionId) {
        require(sessionId < totalSessions, "Invalid session");
        _;
    }

    modifier onlySessionNotFinalized(uint256 sessionId) {
        require(!sessions[sessionId].isFinalized, "Session already finalized");
        _;
    }

    /**
     * @dev 构造函数，设置 Track 类型索引映射
     */
    constructor() Ownable(msg.sender) {
        // 初始化 Track 类型到索引的映射
        trackTypeToIndex[TrackNFT.TrackType.Drum] = 0;
        trackTypeToIndex[TrackNFT.TrackType.Bass] = 1;
        trackTypeToIndex[TrackNFT.TrackType.Synth] = 2;
        trackTypeToIndex[TrackNFT.TrackType.Vocal] = 3;
    }

    /**
     * @dev 设置 Track NFT 合约地址
     */
    function setTrackNFT(address _trackNFT) external onlyOwner {
        require(_trackNFT != address(0), "Invalid address");
        trackNFT = TrackNFT(_trackNFT);
        TrackNFT(_trackNFT).setMusicSession(address(this));
    }

    /**
     * @dev 设置 Master NFT 合约地址
     */
    function setMasterComposition(address _masterComposition) external onlyOwner {
        require(_masterComposition != address(0), "Invalid address");
        masterComposition = MasterComposition(_masterComposition);
    }

    /**
     * @dev 创建新的音乐创作 Session
     */
    function createSession(
        string memory sessionName,
        string memory description,
        string memory genre,
        uint256 bpm,
        uint256 maxTracks
    ) external nonReentrant returns (uint256) {
        require(maxTracks > 0 && maxTracks <= 10, "Invalid max tracks");
        require(bytes(sessionName).length > 0, "Session name required");
        require(bytes(description).length <= MAX_DESCRIPTION_LENGTH, "Description too long");
        require(address(trackNFT) != address(0), "TrackNFT not set");
        require(address(masterComposition) != address(0), "MasterComposition not set");
        
        uint256 sessionId = _nextSessionId++;
        totalSessions++;
        
        Session storage session = sessions[sessionId];
        session.id = sessionId;
        session.sessionName = sessionName;
        session.description = description;
        session.genre = genre;
        session.bpm = bpm;
        session.maxTracks = maxTracks;
        session.createdAt = block.timestamp;
        session.currentTrackIndex = 0;
        session.isFinalized = false;
        
        emit SessionCreated(sessionId, msg.sender, sessionName, genre, bpm);
        
        return sessionId;
    }

    /**
     * @dev 加入 Session 并提交音轨（核心函数）
     * @param sessionId Session ID
     * @param trackId Track NFT ID
     * @param trackType Track 类型
     */
    function joinAndCommit(
        uint256 sessionId,
        uint256 trackId,
        TrackNFT.TrackType trackType
    ) external nonReentrant onlyValidSession(sessionId) onlySessionNotFinalized(sessionId) {
        Session storage session = sessions[sessionId];
        
        uint256 trackIndex = trackTypeToIndex[trackType];
        require(trackIndex < session.maxTracks, "Invalid track type");
        require(!session.trackFilled[trackType], "Track already filled");
        
        // 验证 Track NFT 所有权
        require(trackNFT.ownerOf(trackId) == msg.sender, "Not track owner");
        
        // 提交 Track 到 Session
        trackNFT.commitToSession(trackId, sessionId);
        
        // 更新 Session 状态
        session.contributors.push(msg.sender);
        session.trackIds.push(trackId);
        session.trackFilled[trackType] = true;
        
        emit TrackCommitted(sessionId, trackId, msg.sender, trackType, trackIndex);
        
        // 检查是否所有音轨都已填满
        uint256 filledCount = 0;
        for (uint256 i = 0; i < session.maxTracks; i++) {
            TrackNFT.TrackType t = TrackNFT.TrackType(i);
            if (session.trackFilled[t]) {
                filledCount++;
            }
        }
        
        if (filledCount == session.maxTracks) {
            _finalizeSession(sessionId);
        } else {
            session.currentTrackIndex++;
        }
    }

    /**
     * @dev 完成 Session 并铸造 Master NFT
     */
    function _finalizeSession(uint256 sessionId) private {
        Session storage session = sessions[sessionId];
        session.isFinalized = true;
        session.completedAt = block.timestamp;
        
        // 准备 Master NFT 元数据
        string memory masterURI = string(abi.encodePacked(
            "ipfs://",
            _generateMasterMetadata(sessionId)
        ));
        
        // 铸造 Master NFT（传给第一个贡献者）
        uint256 masterTokenId = masterComposition.mintMaster(
            session.contributors[0],
            sessionId,
            session.contributors,
            session.trackIds,
            masterURI
        );
        
        emit SessionFinalized(
            sessionId,
            masterTokenId,
            session.contributors,
            session.trackIds
        );
    }

    /**
     * @dev 生成 Master 元数据（IPFS 哈希，实际应由后端生成）
     */
    function _generateMasterMetadata(uint256 sessionId) private view returns (string memory) {
        // 简化版：返回基于 Session ID 的哈希
        // 实际应用中应由后端服务生成完整的元数据并上传到 IPFS
        return _bytes32ToString(keccak256(abi.encodePacked(sessionId, block.timestamp)));
    }

    /**
     * @dev 取消 Session（仅创建者，且只能在未完成时）
     */
    function cancelSession(uint256 sessionId) external nonReentrant onlyValidSession(sessionId) onlySessionNotFinalized(sessionId) {
        Session storage session = sessions[sessionId];
        
        require(session.contributors.length > 0, "No tracks committed");
        require(session.contributors[0] == msg.sender, "Not session creator");
        
        session.isFinalized = true;
        session.completedAt = block.timestamp;
        
        emit SessionCancelled(sessionId, msg.sender);
    }

    /**
     * @dev 获取 Session 详细信息
     */
    function getSessionInfo(uint256 sessionId) external view onlyValidSession(sessionId) returns (
        uint256 id,
        string memory sessionName,
        string memory description,
        string memory genre,
        uint256 bpm,
        uint256 maxTracks,
        uint256 currentTrackIndex,
        bool isFinalized,
        uint256 createdAt,
        uint256 completedAt,
        address[] memory contributors,
        uint256[] memory trackIds,
        bool[4] memory trackFilledStatus
    ) {
        Session storage session = sessions[sessionId];
        
        // 准备 Track 填充状态
        for (uint256 i = 0; i < 4; i++) {
            TrackNFT.TrackType t = TrackNFT.TrackType(i);
            trackFilledStatus[i] = session.trackFilled[t];
        }
        
        return (
            session.id,
            session.sessionName,
            session.description,
            session.genre,
            session.bpm,
            session.maxTracks,
            session.currentTrackIndex,
            session.isFinalized,
            session.createdAt,
            session.completedAt,
            session.contributors,
            session.trackIds,
            trackFilledStatus
        );
    }

    /**
     * @dev 获取所有 Session ID 列表
     */
    function getAllSessionIds() external view returns (uint256[] memory) {
        uint256[] memory sessionIds = new uint256[](totalSessions);
        for (uint256 i = 0; i < totalSessions; i++) {
            sessionIds[i] = i + 1; // Session ID 从 1 开始
        }
        return sessionIds;
    }

    /**
     * @dev 获取当前应该提交的 Track 类型
     */
    function getCurrentTrackType(uint256 sessionId) external view onlyValidSession(sessionId) returns (TrackNFT.TrackType) {
        Session storage session = sessions[sessionId];
        return TrackNFT.TrackType(session.currentTrackIndex);
    }

    /**
     * @dev 获取 Session 进度（已填充音轨数 / 总音轨数）
     */
    function getSessionProgress(uint256 sessionId) external view onlyValidSession(sessionId) returns (uint256, uint256) {
        Session storage session = sessions[sessionId];
        
        uint256 filledCount = 0;
        for (uint256 i = 0; i < session.maxTracks; i++) {
            TrackNFT.TrackType t = TrackNFT.TrackType(i);
            if (session.trackFilled[t]) {
                filledCount++;
            }
        }
        
        return (filledCount, session.maxTracks);
    }

    /**
     * @dev 辅助函数：bytes32 转 string
     */
    function _bytes32ToString(bytes32 data) private pure returns (string memory) {
        bytes memory bytesString = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            bytesString[i * 2] = _toHexChar(uint8(data[i]) >> 4);
            bytesString[i * 2 + 1] = _toHexChar(uint8(data[i]) & 0x0f);
        }
        return string(bytesString);
    }

    /**
     * @dev 辅助函数：数字转十六进制字符
     */
    function _toHexChar(uint8 value) private pure returns (bytes1) {
        if (value < 10) {
            return bytes1(value + 48); // '0' - '9'
        } else {
            return bytes1(value + 87); // 'a' - 'f'
        }
    }
}
