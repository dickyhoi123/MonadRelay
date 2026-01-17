// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MasterComposition
 * @dev 代表最终合成的完整音乐作品，支持多方所有权和收益分配
 */
contract MasterComposition is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    
    // Master NFT 元数据结构
    struct CompositionMetadata {
        uint256 sessionId;              // 所属 Session ID
        address[] contributors;         // 贡献者地址列表
        uint256[] trackIds;             // 关联的 Track NFT ID 列表
        uint256 createdAt;              // 创建时间
        bool isMinted;                  // 是否已铸造
        uint256 totalRevenue;           // 总收益
    }
    
    // 组合音乐数据结构（可选：如果需要直接在 Master NFT 中存储完整的组合数据）
    struct CompositionMusicData {
        uint8 bpm;                      // BPM
        uint16 totalSixteenthNotes;      // 总16分音符数
        bytes[] encodedTracks;           // 所有音轨的编码数据（索引对应 trackIds）
    }

    uint256 private _nextTokenId;
    
    // Token ID 到元数据的映射
    mapping(uint256 => CompositionMetadata) public compositionMetadata;
    
    // Token ID 到组合音乐数据的映射
    mapping(uint256 => CompositionMusicData) public compositionMusicData;
    
    // Session ID 到 Master Token ID 的映射
    mapping(uint256 => uint256) public sessionToMasterToken;
    
    // 贡献者地址到其参与的所有 Master Token ID 的映射
    mapping(address => uint256[]) public contributorCompositions;
    
    // 收益分润映射 (Master Token ID -> 贡献者地址 -> 可提取收益)
    mapping(uint256 => mapping(address => uint256)) public pendingRevenue;
    
    // Track 类型权重配置（可调整）
    mapping(uint256 => uint256) public trackWeights; // tokenId -> weight
    
    // 事件定义
    event MasterMinted(
        uint256 indexed masterTokenId,
        uint256 indexed sessionId,
        address[] contributors,
        uint256[] trackIds
    );

    event RevenueAdded(
        uint256 indexed masterTokenId,
        uint256 amount,
        address indexed payer
    );

    event RevenueWithdrawn(
        uint256 indexed masterTokenId,
        address indexed contributor,
        uint256 amount
    );

    constructor() ERC721("Monad Master Composition", "MMASTER") Ownable(msg.sender) {}

    /**
     * @dev 铸造 Master NFT 并存储完整的音乐数据（由 MusicSession 合约调用）
     * @param to 接收者地址
     * @param sessionId Session ID
     * @param contributors 贡献者地址列表
     * @param trackIds 关联的 Track NFT ID 列表
     * @param _tokenURI 元数据 URI
     * @param bpm BPM
     * @param totalSixteenthNotes 总16分音符数
     * @param encodedTracks 所有音轨的编码数据数组
     */
    function mintMasterWithData(
        address to,
        uint256 sessionId,
        address[] memory contributors,
        uint256[] memory trackIds,
        string memory _tokenURI,
        uint8 bpm,
        uint16 totalSixteenthNotes,
        bytes[] memory encodedTracks
    ) external nonReentrant returns (uint256) {
        require(contributors.length == trackIds.length, "Length mismatch");
        require(contributors.length > 0, "No contributors");
        require(sessionToMasterToken[sessionId] == 0, "Already minted");
        require(trackIds.length <= 4, "Too many tracks"); // 限制最多 4 条音轨
        require(trackIds.length == encodedTracks.length, "Tracks and data length mismatch");

        uint256 masterTokenId = _nextTokenId++;

        _safeMint(to, masterTokenId);
        _setTokenURI(masterTokenId, _tokenURI);

        // 存储元数据
        compositionMetadata[masterTokenId] = CompositionMetadata({
            sessionId: sessionId,
            contributors: contributors,
            trackIds: trackIds,
            createdAt: block.timestamp,
            isMinted: true,
            totalRevenue: 0
        });

        // 存储完整的音乐数据
        compositionMusicData[masterTokenId] = CompositionMusicData({
            bpm: bpm,
            totalSixteenthNotes: totalSixteenthNotes,
            encodedTracks: encodedTracks
        });

        // 记录 Session 映射
        sessionToMasterToken[sessionId] = masterTokenId;

        // 记录贡献者参与的作品
        for (uint256 i = 0; i < contributors.length; i++) {
            contributorCompositions[contributors[i]].push(masterTokenId);
        }

        emit MasterMinted(masterTokenId, sessionId, contributors, trackIds);

        return masterTokenId;
    }

    /**
     * @dev 铸造 Master NFT（由 MusicSession 合约调用）
     * @param to 接收者地址（可以是任意贡献者或 DAO）
     * @param sessionId Session ID
     * @param contributors 贡献者地址列表
     * @param trackIds 关联的 Track NFT ID 列表
     * @param _tokenURI 元数据 URI（可选，可以为空）
     */
    function mintMaster(
        address to,
        uint256 sessionId,
        address[] memory contributors,
        uint256[] memory trackIds,
        string memory _tokenURI
    ) external nonReentrant returns (uint256) {
        return _mintMasterWithMusicData(
            to,
            sessionId,
            contributors,
            trackIds,
            _tokenURI,
            120, // 默认 BPM
            0, // 默认 totalSixteenthNotes
            new bytes[](trackIds.length) // 默认空音轨数据
        );
    }

    /**
     * @dev 铸造 Master NFT 并存储完整的音乐数据
     * @param to 接收者地址
     * @param sessionId Session ID
     * @param contributors 贡献者地址列表
     * @param trackIds 关联的 Track NFT ID 列表
     * @param _tokenURI 元数据 URI
     * @param bpm BPM
     * @param totalSixteenthNotes 总16分音符数
     * @param encodedTracks 所有音轨的编码数据数组
     */
    function _mintMasterWithMusicData(
        address to,
        uint256 sessionId,
        address[] memory contributors,
        uint256[] memory trackIds,
        string memory _tokenURI,
        uint8 bpm,
        uint16 totalSixteenthNotes,
        bytes[] memory encodedTracks
    ) private nonReentrant returns (uint256) {
        require(contributors.length == trackIds.length, "Length mismatch");
        require(contributors.length > 0, "No contributors");
        require(sessionToMasterToken[sessionId] == 0, "Already minted");
        require(trackIds.length <= 4, "Too many tracks"); // 限制最多 4 条音轨
        require(trackIds.length == encodedTracks.length, "Tracks and data length mismatch");
        
        uint256 masterTokenId = _nextTokenId++;
        
        _safeMint(to, masterTokenId);
        _setTokenURI(masterTokenId, _tokenURI);
        
        // 存储元数据
        compositionMetadata[masterTokenId] = CompositionMetadata({
            sessionId: sessionId,
            contributors: contributors,
            trackIds: trackIds,
            createdAt: block.timestamp,
            isMinted: true,
            totalRevenue: 0
        });
        
        // 存储完整的音乐数据
        compositionMusicData[masterTokenId] = CompositionMusicData({
            bpm: bpm,
            totalSixteenthNotes: totalSixteenthNotes,
            encodedTracks: encodedTracks
        });
        
        // 记录 Session 映射
        sessionToMasterToken[sessionId] = masterTokenId;
        
        // 记录贡献者参与的作品
        for (uint256 i = 0; i < contributors.length; i++) {
            contributorCompositions[contributors[i]].push(masterTokenId);
        }
        
        emit MasterMinted(masterTokenId, sessionId, contributors, trackIds);
        
        return masterTokenId;
    }

    /**
     * @dev 添加收益到 Master NFT
     * @param masterTokenId Master Token ID
     */
    function addRevenue(uint256 masterTokenId) external payable nonReentrant {
        require(msg.value > 0, "No value sent");
        require(compositionMetadata[masterTokenId].isMinted, "Not minted");
        
        compositionMetadata[masterTokenId].totalRevenue += msg.value;
        
        // 根据权重分配收益
        _distributeRevenue(masterTokenId, msg.value);
        
        emit RevenueAdded(masterTokenId, msg.value, msg.sender);
    }

    /**
     * @dev 内部函数：根据权重分配收益
     */
    function _distributeRevenue(uint256 masterTokenId, uint256 amount) private {
        CompositionMetadata storage metadata = compositionMetadata[masterTokenId];
        uint256 totalWeight = 0;
        
        // 计算总权重
        for (uint256 i = 0; i < metadata.trackIds.length; i++) {
            uint256 weight = trackWeights[metadata.trackIds[i]];
            totalWeight += weight > 0 ? weight : 1; // 默认权重为 1
        }
        
        // 分配收益
        for (uint256 i = 0; i < metadata.trackIds.length; i++) {
            uint256 weight = trackWeights[metadata.trackIds[i]] > 0 
                ? trackWeights[metadata.trackIds[i]] 
                : 1;
            uint256 share = (amount * weight) / totalWeight;
            pendingRevenue[masterTokenId][metadata.contributors[i]] += share;
        }
    }

    /**
     * @dev 提取收益
     * @param masterTokenId Master Token ID
     */
    function withdrawRevenue(uint256 masterTokenId) external nonReentrant {
        uint256 amount = pendingRevenue[masterTokenId][msg.sender];
        require(amount > 0, "No pending revenue");
        
        pendingRevenue[masterTokenId][msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit RevenueWithdrawn(masterTokenId, msg.sender, amount);
    }

    /**
     * @dev 设置 Track 权重（仅 Owner）
     */
    function setTrackWeight(uint256 trackId, uint256 weight) external onlyOwner {
        trackWeights[trackId] = weight;
    }

    /**
     * @dev 获取贡献者的所有 Master Token IDs
     */
    function getContributorCompositions(address contributor) external view returns (uint256[] memory) {
        return contributorCompositions[contributor];
    }

    /**
     * @dev 获取 Master NFT 详细信息
     */
    function getCompositionInfo(uint256 masterTokenId) external view returns (
        uint256 sessionId,
        address[] memory contributors,
        uint256[] memory trackIds,
        uint256 createdAt,
        uint256 totalRevenue
    ) {
        CompositionMetadata memory metadata = compositionMetadata[masterTokenId];
        return (
            metadata.sessionId,
            metadata.contributors,
            metadata.trackIds,
            metadata.createdAt,
            metadata.totalRevenue
        );
    }

    /**
     * @dev 设置组合的音乐数据（由 MusicSession 合约调用）
     * @param masterTokenId Master Token ID
     * @param bpm BPM
     * @param totalSixteenthNotes 总16分音符数
     * @param encodedTracks 所有音轨的编码数据数组
     */
    function setCompositionMusicData(
        uint256 masterTokenId,
        uint8 bpm,
        uint16 totalSixteenthNotes,
        bytes[] memory encodedTracks
    ) external {
        require(compositionMetadata[masterTokenId].isMinted, "Not minted");
        require(encodedTracks.length == compositionMetadata[masterTokenId].trackIds.length, "Tracks length mismatch");

        compositionMusicData[masterTokenId] = CompositionMusicData({
            bpm: bpm,
            totalSixteenthNotes: totalSixteenthNotes,
            encodedTracks: encodedTracks
        });
    }

    /**
     * @dev 获取组合的音乐数据（如果有）
     */
    function getCompositionMusicData(uint256 masterTokenId) external view returns (
        uint8 bpm,
        uint16 totalSixteenthNotes,
        bytes[] memory encodedTracks
    ) {
        CompositionMusicData memory data = compositionMusicData[masterTokenId];
        return (
            data.bpm,
            data.totalSixteenthNotes,
            data.encodedTracks
        );
    }

    /**
     * @dev 检查 Session 是否已铸造 Master NFT
     */
    function isSessionMinted(uint256 sessionId) external view returns (bool) {
        return sessionToMasterToken[sessionId] != 0;
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
