// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TrackNFT
 * @dev 代表个人创作的单一音轨，每个 TrackNFT 质押到 MusicSession 中
 */
contract TrackNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    
    // Track 类型枚举
    enum TrackType {
        Drum,       // 鼓
        Bass,       // 贝斯
        Synth,      // 合成器/旋律
        Vocal       // 人声
    }

    // Track 元数据结构
    struct TrackMetadata {
        TrackType trackType;      // 音轨类型
        uint256 sessionId;        // 所属 Session ID
        uint256 createdAt;        // 创建时间
        address creator;          // 创建者地址
        string ipfsHash;          // 音频文件 IPFS 哈希
        bool isCommitted;         // 是否已提交到 Session
    }

    uint256 private _nextTokenId;
    
    // Token ID 到元数据的映射
    mapping(uint256 => TrackMetadata) public trackMetadata;
    
    // Creator 地址到其所有 Token ID 的映射
    mapping(address => uint256[]) public creatorTracks;

    // 事件定义
    event TrackMinted(
        uint256 indexed tokenId,
        address indexed creator,
        TrackType trackType,
        string ipfsHash
    );

    event TrackCommitted(
        uint256 indexed tokenId,
        uint256 indexed sessionId
    );

    constructor() ERC721("Monad Track NFT", "MTRACK") Ownable(msg.sender) {}

    /**
     * @dev 铸造新的 Track NFT
     * @param to 接收者地址
     * @param trackType 音轨类型
     * @param ipfsHash 音频文件 IPFS 哈希
     */
    function mintTrack(
        address to,
        TrackType trackType,
        string memory ipfsHash
    ) external nonReentrant returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, ipfsHash);
        
        // 存储元数据
        trackMetadata[tokenId] = TrackMetadata({
            trackType: trackType,
            sessionId: 0,
            createdAt: block.timestamp,
            creator: to,
            ipfsHash: ipfsHash,
            isCommitted: false
        });
        
        // 记录创建者的 Tracks
        creatorTracks[to].push(tokenId);
        
        emit TrackMinted(tokenId, to, trackType, ipfsHash);
        
        return tokenId;
    }

    // MusicSession 合约地址
    address public musicSession;

    /**
     * @dev 设置 MusicSession 合约地址（仅 Owner）
     */
    function setMusicSession(address _musicSession) external {
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
    ) external nonReentrant {
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
        string memory ipfsHash,
        bool isCommitted
    ) {
        TrackMetadata memory metadata = trackMetadata[tokenId];
        return (
            metadata.trackType,
            metadata.sessionId,
            metadata.createdAt,
            metadata.creator,
            metadata.ipfsHash,
            metadata.isCommitted
        );
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
