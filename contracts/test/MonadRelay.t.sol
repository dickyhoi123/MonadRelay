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

    event TrackMinted(uint256 indexed tokenId, address indexed creator, TrackNFT.TrackType trackType, uint8 bpm, uint16 totalSixteenthNotes);
    event SessionCreated(uint256 indexed sessionId, address indexed creator, string sessionName, string genre, uint256 bpm);
    event TrackCommitted(uint256 indexed sessionId, uint256 indexed trackId, address indexed contributor, TrackNFT.TrackType trackType, uint256 trackIndex);
    event SessionFinalized(uint256 indexed sessionId, uint256 masterTokenId, address[] contributors, uint256[] trackIds);
    event MasterMinted(uint256 indexed masterTokenId, uint256 indexed sessionId, address[] contributors, uint256[] trackIds);

    // 示例音乐数据（简化版）
    string constant ENCODED_DRUM_TRACK = '{"Drum":[[36,0,1,90,"kick"],[38,4,1,80,"snare"],[42,8,1,70,"hihat"]}';
    string constant ENCODED_BASS_TRACK = '{"Bass":[[28,0,4,85,"sine-bass"],[33,8,4,80,"saw-bass"]}';
    string constant ENCODED_SYNTH_TRACK = '{"Synth":[[60,0,2,75,"sine"],[64,4,2,70,"square"],[67,8,4,80,"triangle"]}';
    string constant ENCODED_VOCAL_TRACK = '{"Vocal":[[72,0,4,65,"sine"],[76,4,4,60,"sine"]]}';

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

    function testMintTrackWithMusicData() public {
        vm.startPrank(user1);

        uint256 trackId = trackNFT.mintTrackWithMusicData(
            user1,
            TrackNFT.TrackType.Drum,
            120,
            32,
            ENCODED_DRUM_TRACK
        );

        assertEq(trackId, 0);
        assertEq(trackNFT.ownerOf(trackId), user1);

        (TrackNFT.TrackType trackType, uint256 sessionId, uint256 createdAt, address creator, bool hasMusicData, bool isCommitted)
            = trackNFT.getTrackInfo(trackId);

        assertEq(uint(trackType), uint(TrackNFT.TrackType.Drum));
        assertEq(sessionId, 0);
        assertEq(creator, user1);
        assertEq(hasMusicData, true);
        assertEq(isCommitted, false);

        // 测试音乐数据
        (uint8 bpm, uint16 totalSixteenthNotes, string memory encodedTracks) = trackNFT.getMusicData(trackId);
        assertEq(bpm, 120);
        assertEq(totalSixteenthNotes, 32);
        assertEq(encodedTracks, ENCODED_DRUM_TRACK);

        vm.stopPrank();
    }

    function testCreateSession() public {
        vm.startPrank(owner);

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
        uint256 drumTrackId = trackNFT.mintTrackWithMusicData(
            user1,
            TrackNFT.TrackType.Drum,
            120,
            32,
            ENCODED_DRUM_TRACK
        );

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
        uint256 drumTrackId = trackNFT.mintTrackWithMusicData(
            user1,
            TrackNFT.TrackType.Drum,
            120,
            32,
            ENCODED_DRUM_TRACK
        );
        musicSession.joinAndCommit(sessionId, drumTrackId, TrackNFT.TrackType.Drum);
        vm.stopPrank();

        vm.startPrank(user2);
        uint256 bassTrackId = trackNFT.mintTrackWithMusicData(
            user2,
            TrackNFT.TrackType.Bass,
            120,
            32,
            ENCODED_BASS_TRACK
        );
        musicSession.joinAndCommit(sessionId, bassTrackId, TrackNFT.TrackType.Bass);
        vm.stopPrank();

        vm.startPrank(user3);
        uint256 synthTrackId = trackNFT.mintTrackWithMusicData(
            user3,
            TrackNFT.TrackType.Synth,
            120,
            32,
            ENCODED_SYNTH_TRACK
        );
        musicSession.joinAndCommit(sessionId, synthTrackId, TrackNFT.TrackType.Synth);
        vm.stopPrank();

        vm.startPrank(user4);
        uint256 vocalTrackId = trackNFT.mintTrackWithMusicData(
            user4,
            TrackNFT.TrackType.Vocal,
            120,
            32,
            ENCODED_VOCAL_TRACK
        );

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
        uint256 trackId = trackNFT.mintTrackWithMusicData(
            user1,
            TrackNFT.TrackType.Drum,
            120,
            32,
            ENCODED_DRUM_TRACK
        );

        vm.expectRevert("Invalid track type");
        musicSession.joinAndCommit(sessionId, trackId, TrackNFT.TrackType.Synth);

        vm.stopPrank();
    }

    function testRevert_TrackAlreadyFilled() public {
        vm.startPrank(owner);
        uint256 sessionId = musicSession.createSession("Test Session", "Test Description", "Techno", 120, 4);
        vm.stopPrank();

        vm.startPrank(user1);
        uint256 drumTrackId1 = trackNFT.mintTrackWithMusicData(
            user1,
            TrackNFT.TrackType.Drum,
            120,
            32,
            ENCODED_DRUM_TRACK
        );
        musicSession.joinAndCommit(sessionId, drumTrackId1, TrackNFT.TrackType.Drum);

        uint256 drumTrackId2 = trackNFT.mintTrackWithMusicData(
            user1,
            TrackNFT.TrackType.Drum,
            120,
            32,
            ENCODED_DRUM_TRACK
        );

        vm.expectRevert("Track already filled");
        musicSession.joinAndCommit(sessionId, drumTrackId2, TrackNFT.TrackType.Drum);

        vm.stopPrank();
    }

    function testRevert_NotTrackOwner() public {
        vm.startPrank(owner);
        uint256 sessionId = musicSession.createSession("Test Session", "Test Description", "Techno", 120, 4);
        uint256 trackId = trackNFT.mintTrackWithMusicData(
            owner,
            TrackNFT.TrackType.Drum,
            120,
            32,
            ENCODED_DRUM_TRACK
        );
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

    function testGetMusicData() public {
        vm.startPrank(user1);
        uint256 trackId = trackNFT.mintTrackWithMusicData(
            user1,
            TrackNFT.TrackType.Synth,
            140,
            64,
            ENCODED_SYNTH_TRACK
        );

        (uint8 bpm, uint16 totalSixteenthNotes, string memory encodedTracks) = trackNFT.getMusicData(trackId);

        assertEq(bpm, 140);
        assertEq(totalSixteenthNotes, 64);
        assertEq(encodedTracks, ENCODED_SYNTH_TRACK);

        vm.stopPrank();
    }

    function testHasMusicData() public {
        vm.startPrank(user1);
        uint256 trackId = trackNFT.mintTrackWithMusicData(
            user1,
            TrackNFT.TrackType.Synth,
            120,
            32,
            ENCODED_SYNTH_TRACK
        );

        bool hasData = trackNFT.hasMusicData(trackId);
        assertEq(hasData, true);

        vm.stopPrank();
    }

    function testRevert_EmptyEncodedTracks() public {
        vm.startPrank(user1);
        vm.expectRevert("Empty encoded tracks");
        trackNFT.mintTrackWithMusicData(
            user1,
            TrackNFT.TrackType.Synth,
            120,
            32,
            ""
        );
        vm.stopPrank();
    }

    function testRevert_EncodedTracksTooLarge() public {
        vm.startPrank(user1);
        
        // 创建过大的数据（超过5000字节）
        string memory largeData = "x";
        for(uint256 i = 0; i < 6000; i++) {
            largeData = string.concat(largeData, "a");
        }

        vm.expectRevert("Encoded tracks too large");
        trackNFT.mintTrackWithMusicData(
            user1,
            TrackNFT.TrackType.Synth,
            120,
            32,
            largeData
        );
        vm.stopPrank();
    }

    function testGetCompositionMusicData() public {
        testFullSessionFlow();

        (uint8 bpm, uint16 totalSixteenthNotes, bytes[] memory encodedTracks) = masterComposition.getCompositionMusicData(0);

        assertEq(bpm, 120); // 默认 BPM
        assertEq(totalSixteenthNotes, 0); // 初始为空
        assertEq(encodedTracks.length, 4); // 4条音轨
    }
}
