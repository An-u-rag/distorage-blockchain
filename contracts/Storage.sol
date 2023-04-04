// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.19;

contract Storage {
    // MODEL A Host
    struct Host {
        uint id;
        address myAddress;
        string ip;
        uint port;
        string name;
        uint diskspace;
    }

    mapping(uint => Host) public hosts;
    mapping(address => bool) public isHost;
    mapping(bytes32 => address) public location_address; 
    mapping(bytes32 => bytes32) private locHash_genHash;
    uint public hostCount;
    
    constructor () {
    }

    event addHostEvent (
        uint indexed id,
        address indexed myAddress,
        bytes32 indexed locHash
    );

    function addHost (string memory _name, uint port, string memory ip, bytes32 locHash, uint diskspace) public {
        require(!isHost[msg.sender]);

        hosts[hostCount] = Host(hostCount, msg.sender, ip, port, _name, diskspace);
        isHost[msg.sender] = true;
        location_address[locHash] = msg.sender;

        emit addHostEvent(hostCount, msg.sender, locHash);
        hostCount ++;
    }

    // event initiateStorage(
        
    // )

    // // TO initiate storage of a file from client to host
    // // lochash - hash of Host ip, port, and name
    // // genHash - Hash of the encrypted file
    // // salt - salt of the hashing function 
    // function initiateStorage (bytes32 lochash, bytes32 genhash, uint salt) public {
    //     // Now that we get the input, we have to emit an event which is used as a check for socket transmission
        
    // } 

}