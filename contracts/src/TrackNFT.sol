// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TrackNFT
 * @dev 代表个人创作的单一音轨，每个 TrackNFT 包含编码的音乐数据
 */
contract TrackNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    
    // Track 类型枚举
    enum TrackType {
        Drum,       // 鼓
        Bass,       // 贝斯
        Synth,      // 合成器/旋律
        Vocal       // 人声
    }

    // 音乐数据结构（存储编码的 JSON）
    struct MusicData {
        uint8 bpm;                  // BPM (每分钟节拍数）
        uint16 totalSixteenthNotes; // 总16分音符数
        bytes encodedTracks;         // 编码的音轨数据（JSON 字符串）
    }

    // Track 元数据结构
    struct TrackMetadata {
        TrackType trackType;      // 音轨类型
        uint256 sessionId;        // 所属 Session ID
        uint256 createdAt;        // 创建时间
        address creator;          // 创建者地址
        bool hasMusicData;        // 是否包含音乐数据
        bool isCommitted;         // 是否已提交到 Session
    }

    uint256 private _nextTokenId;
    
    // Token ID 到元数据的映射
    mapping(uint256 => TrackMetadata) public trackMetadata;
    
    // Token ID 到音乐数据的映射
    mapping(uint256 => MusicData) public trackMusicData;
    
    // Creator 地址到其所有 Token ID 的映射
    mapping(address => uint256[]) public creatorTracks;

    // 事件定义
    event TrackMinted(
        uint256 indexed tokenId,
        address indexed creator,
        TrackType trackType,
        uint8 bpm,
        uint16 totalSixteenthNotes
    );

    event TrackCommitted(
        uint256 indexed tokenId,
        uint256 indexed sessionId
    );

    constructor() ERC721("Monad Track NFT", "MTRACK") Ownable(msg.sender) {}

    /**
     * @dev 铸造新的 Track NFT（包含编码的音乐数据）
     * @param to 接收者地址
     * @param trackType 音轨类型
     * @param bpm BPM
     * @param totalSixteenthNotes 总16分音符数
     * @param encodedTracks 编码的音轨数据（JSON 字符串）
     */
    function mintTrackWithMusicData(
        address to,
        TrackType trackType,
        uint8 bpm,
        uint16 totalSixteenthNotes,
        string memory encodedTracks
    ) external nonReentrant returns (uint256) {
        require(to != address(0), "Invalid address");
        require(bpm > 0, "Invalid BPM");
        require(totalSixteenthNotes > 0, "Invalid total sixteenth notes");
        require(bytes(encodedTracks).length > 0, "Empty encoded tracks");
        require(bytes(encodedTracks).length <= 5000, "Encoded tracks too large"); // 限制约 5KB
        
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, ""); // 空 URI，因为数据直接存储在链上
        
        // 存储元数据
        trackMetadata[tokenId] = TrackMetadata({
            trackType: trackType,
            sessionId: 0,
            createdAt: block.timestamp,
            creator: to,
            hasMusicData: true,
            isCommitted: false
        });
        
        // 存储编码的音乐数据
        trackMusicData[tokenId] = MusicData({
            bpm: bpm,
            totalSixteenthNotes: totalSixteenthNotes,
            encodedTracks: bytes(encodedTracks)
        });
        
        // 记录创建者的 Tracks
        creatorTracks[to].push(tokenId);
        
        emit TrackMinted(tokenId, to, trackType, bpm, totalSixteenthNotes);
        
        return tokenId;
    }

    // MusicSession 合约地址
    address public musicSession;

    /**
     * @dev 设置 MusicSession 合约地址（仅 Owner）
     */
    function setMusicSession(address _musicSession) external {
        require(_musicSession != address(0), "Invalid address");
        musicSession = _musicSession;
    }

    /**
     * @dev 将 Track 提交到 Session（由 MusicSession 合约调用）
     * @param tokenId Track NFT ID
     * @param sessionId 目标 Session ID
     */
    function commitToSession(
        uint256 tokenId,
        uint256 sessionId
    ) external {
        require(msg.sender == musicSession, "Not authorized");
        require(!trackMetadata[tokenId].isCommitted, "Already committed");

        trackMetadata[tokenId].sessionId = sessionId;
        trackMetadata[tokenId].isCommitted = true;

        emit TrackCommitted(tokenId, sessionId);
    }

    /**
     * @dev 获取创建者的所有 Track IDs
     */
    function getCreatorTracks(address creator) external view returns (uint256[] memory) {
        return creatorTracks[creator];
    }

    /**
     * @dev 获取 Track 详细信息
     */
    function getTrackInfo(uint256 tokenId) external view returns (
        TrackType trackType,
        uint256 sessionId,
        uint256 createdAt,
        address creator,
        bool hasData,
        bool isCommitted
    ) {
        TrackMetadata memory metadata = trackMetadata[tokenId];
        return (
            metadata.trackType,
            metadata.sessionId,
            metadata.createdAt,
            metadata.creator,
            metadata.hasMusicData,
            metadata.isCommitted
        );
    }

    /**
     * @dev 获取音乐数据（编码的 JSON）
     * @param tokenId Token ID
     * @return bpm BPM
     * @return totalSixteenthNotes 总16分音符数
     * @return encodedTracks 编码的音轨数据
     */
    function getMusicData(uint256 tokenId) external view returns (
        uint8 bpm,
        uint16 totalSixteenthNotes,
        string memory encodedTracks
    ) {
        MusicData memory data = trackMusicData[tokenId];
        return (
            data.bpm,
            data.totalSixteenthNotes,
            string(data.encodedTracks)
        );
    }

    /**
     * @dev 检查 Token 是否包含音乐数据
     */
    function hasMusicData(uint256 tokenId) external view returns (bool) {
        return trackMetadata[tokenId].hasMusicData;
    }

    // 必须实现的 ERC721URIStorage 函数
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
