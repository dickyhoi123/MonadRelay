// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TrackNFT.sol";
import "../src/MasterComposition.sol";
import "../src/MusicSession.sol";

contract DeployScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying with address:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        TrackNFT trackNFT = new TrackNFT();
        console.log("TrackNFT deployed at:", address(trackNFT));
        
        MasterComposition masterComposition = new MasterComposition();
        console.log("MasterComposition deployed at:", address(masterComposition));
        
        MusicSession musicSession = new MusicSession();
        console.log("MusicSession deployed at:", address(musicSession));
        
        musicSession.setTrackNFT(address(trackNFT));
        console.log("TrackNFT address set in MusicSession");
        
        musicSession.setMasterComposition(address(masterComposition));
        console.log("MasterComposition address set in MusicSession");
        
        vm.stopBroadcast();
        
        console.log("\n=== Deployment Summary ===");
        console.log("TrackNFT:", address(trackNFT));
        console.log("MasterComposition:", address(masterComposition));
        console.log("MusicSession:", address(musicSession));
    }
}
