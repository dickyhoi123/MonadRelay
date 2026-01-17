// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TrackNFT.sol";
import "../src/MasterComposition.sol";
import "../src/MusicSession.sol";

contract MonadRelayTest is Test {
    TrackNFT public trackNFT;
    MasterComposition public masterComposition;
    MusicSession public musicSession;

    address public owner = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    address public user3 = address(0x4);
    address public user4 = address(0x5);

    event TrackMinted(uint256 indexed tokenId, address indexed creator, TrackNFT.TrackType trackType, string ipfsHash);
    event SessionCreated(uint256 indexed sessionId, address indexed creator, string sessionName, string genre, uint256 bpm);
    event TrackCommitted(uint256 indexed sessionId, uint256 indexed trackId, address indexed contributor, TrackNFT.TrackType trackType, uint256 trackIndex);
    event SessionFinalized(uint256 indexed sessionId, uint256 masterTokenId, address[] contributors, uint256[] trackIds);
    event MasterMinted(uint256 indexed masterTokenId, uint256 indexed sessionId, address[] contributors, uint256[] trackIds);

    function setUp() public {
        vm.startPrank(owner);
        
        trackNFT = new TrackNFT();
        masterComposition = new MasterComposition();
        musicSession = new MusicSession();
        
        musicSession.setTrackNFT(address(trackNFT));
        musicSession.setMasterComposition(address(masterComposition));
        
        vm.stopPrank();
    }

    function testDeployment() public view {
        assertEq(address(trackNFT).code.length > 0, true);
        assertEq(address(masterComposition).code.length > 0, true);
        assertEq(address(musicSession).code.length > 0, true);
    }

    function testContractReferences() public view {
        assertEq(address(musicSession.trackNFT()), address(trackNFT));
        assertEq(address(musicSession.masterComposition()), address(masterComposition));
    }

    function testMintTrack() public {
        vm.startPrank(user1);
        
        vm.expectEmit(true, true, true, true);
        emit TrackMinted(0, user1, TrackNFT.TrackType.Drum, "ipfs://test");
        
        uint256 trackId = trackNFT.mintTrack(user1, TrackNFT.TrackType.Drum, "ipfs://test");
        
        assertEq(trackId, 0);
        assertEq(trackNFT.ownerOf(trackId), user1);
        
        (TrackNFT.TrackType trackType, uint256 sessionId, uint256 createdAt, address creator, string memory ipfsHash, bool isCommitted) 
            = trackNFT.getTrackInfo(trackId);
        
        assertEq(uint(trackType), uint(TrackNFT.TrackType.Drum));
        assertEq(sessionId, 0);
        assertEq(creator, user1);
        assertEq(ipfsHash, "ipfs://test");
        assertEq(isCommitted, false);
        
        vm.stopPrank();
    }

    function testCreateSession() public {
        vm.startPrank(owner);
        
        vm.expectEmit(true, true, false, false);
        emit SessionCreated(0, owner, "Test Session", "Techno", 120);
        
        uint256 sessionId = musicSession.createSession("Test Session", "Test Description", "Techno", 120, 4);
        
        assertEq(sessionId, 0);
        assertEq(musicSession.totalSessions(), 1);
        
        vm.stopPrank();
    }

    function testJoinAndCommit() public {
        vm.startPrank(owner);
        uint256 sessionId = musicSession.createSession("Test Session", "Test Description", "Techno", 120, 4);
        vm.stopPrank();
        
        vm.startPrank(user1);
        uint256 drumTrackId = trackNFT.mintTrack(user1, TrackNFT.TrackType.Drum, "ipfs://drum");
        
        vm.expectEmit(true, true, true, false);
        emit TrackCommitted(sessionId, drumTrackId, user1, TrackNFT.TrackType.Drum, 0);
        
        musicSession.joinAndCommit(sessionId, drumTrackId, TrackNFT.TrackType.Drum);
        
        (, uint256 committedSessionId, , , , bool isCommitted) = trackNFT.getTrackInfo(drumTrackId);
        assertEq(committedSessionId, sessionId);
        assertEq(isCommitted, true);
        
        (uint256 filled, uint256 max) = musicSession.getSessionProgress(sessionId);
        assertEq(filled, 1);
        assertEq(max, 4);
        
        vm.stopPrank();
    }

    function testFullSessionFlow() public {
        vm.startPrank(owner);
        uint256 sessionId = musicSession.createSession("Test Session", "Test Description", "Techno", 120, 4);
        vm.stopPrank();
        
        vm.startPrank(user1);
        uint256 drumTrackId = trackNFT.mintTrack(user1, TrackNFT.TrackType.Drum, "ipfs://drum");
        musicSession.joinAndCommit(sessionId, drumTrackId, TrackNFT.TrackType.Drum);
        vm.stopPrank();
        
        vm.startPrank(user2);
        uint256 bassTrackId = trackNFT.mintTrack(user2, TrackNFT.TrackType.Bass, "ipfs://bass");
        musicSession.joinAndCommit(sessionId, bassTrackId, TrackNFT.TrackType.Bass);
        vm.stopPrank();
        
        vm.startPrank(user3);
        uint256 synthTrackId = trackNFT.mintTrack(user3, TrackNFT.TrackType.Synth, "ipfs://synth");
        musicSession.joinAndCommit(sessionId, synthTrackId, TrackNFT.TrackType.Synth);
        vm.stopPrank();
        
        vm.startPrank(user4);
        uint256 vocalTrackId = trackNFT.mintTrack(user4, TrackNFT.TrackType.Vocal, "ipfs://vocal");
        
        vm.expectEmit(true, true, false, false);
        emit SessionFinalized(sessionId, 0, new address[](0), new uint256[](0));
        
        musicSession.joinAndCommit(sessionId, vocalTrackId, TrackNFT.TrackType.Vocal);
        
        assertEq(masterComposition.ownerOf(0), user1);
        
        vm.stopPrank();
    }

    function testRevenueDistribution() public {
        testFullSessionFlow();
        
        address payer = address(0x6);
        vm.deal(payer, 1 ether);
        
        vm.startPrank(payer);
        masterComposition.addRevenue{value: 1 ether}(0);
        vm.stopPrank();
        
        uint256 user1Balance = masterComposition.pendingRevenue(0, user1);
        uint256 user2Balance = masterComposition.pendingRevenue(0, user2);
        uint256 user3Balance = masterComposition.pendingRevenue(0, user3);
        uint256 user4Balance = masterComposition.pendingRevenue(0, user4);
        
        assertEq(user1Balance, 0.25 ether);
        assertEq(user2Balance, 0.25 ether);
        assertEq(user3Balance, 0.25 ether);
        assertEq(user4Balance, 0.25 ether);
        
        vm.startPrank(user1);
        uint256 prevBalance = user1.balance;
        masterComposition.withdrawRevenue(0);
        assertEq(user1.balance - prevBalance, 0.25 ether);
        vm.stopPrank();
    }

    function testRevert_InvalidTrackType() public {
        vm.startPrank(owner);
        uint256 sessionId = musicSession.createSession("Test Session", "Test Description", "Techno", 120, 2);
        vm.stopPrank();
        
        vm.startPrank(user1);
        uint256 trackId = trackNFT.mintTrack(user1, TrackNFT.TrackType.Drum, "ipfs://test");
        
        vm.expectRevert("Invalid track type");
        musicSession.joinAndCommit(sessionId, trackId, TrackNFT.TrackType.Synth);
        
        vm.stopPrank();
    }

    function testRevert_TrackAlreadyFilled() public {
        vm.startPrank(owner);
        uint256 sessionId = musicSession.createSession("Test Session", "Test Description", "Techno", 120, 4);
        vm.stopPrank();
        
        vm.startPrank(user1);
        uint256 drumTrackId1 = trackNFT.mintTrack(user1, TrackNFT.TrackType.Drum, "ipfs://drum1");
        musicSession.joinAndCommit(sessionId, drumTrackId1, TrackNFT.TrackType.Drum);
        
        uint256 drumTrackId2 = trackNFT.mintTrack(user1, TrackNFT.TrackType.Drum, "ipfs://drum2");
        
        vm.expectRevert("Track already filled");
        musicSession.joinAndCommit(sessionId, drumTrackId2, TrackNFT.TrackType.Drum);
        
        vm.stopPrank();
    }

    function testRevert_NotTrackOwner() public {
        vm.startPrank(owner);
        uint256 sessionId = musicSession.createSession("Test Session", "Test Description", "Techno", 120, 4);
        uint256 trackId = trackNFT.mintTrack(owner, TrackNFT.TrackType.Drum, "ipfs://test");
        vm.stopPrank();
        
        vm.startPrank(user1);
        vm.expectRevert("Not track owner");
        musicSession.joinAndCommit(sessionId, trackId, TrackNFT.TrackType.Drum);
        vm.stopPrank();
    }

    function testTrackWeights() public {
        testFullSessionFlow();
        
        vm.startPrank(owner);
        masterComposition.setTrackWeight(0, 2);
        
        address payer = address(0x6);
        vm.deal(payer, 1 ether);
        
        vm.startPrank(payer);
        masterComposition.addRevenue{value: 1 ether}(0);
        vm.stopPrank();
        
        uint256 user1Balance = masterComposition.pendingRevenue(0, user1);
        
        assertEq(user1Balance, 0.4 ether);
        
        vm.stopPrank();
    }
}
