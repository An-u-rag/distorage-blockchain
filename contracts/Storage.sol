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
        bytes32 locHash;
        uint dataCount;
    }

    struct Data {
        bytes32 genHash;
        address clientAddress;
        address hostAddress;
        uint auditInterval;
        uint size;
        string salt;
    }

    mapping(uint => Host) public hosts;
    mapping(address => bool) public isHost;
    mapping(address => uint) public clientDataCount;
    mapping(address => bytes32[]) public clientDataMap;
    mapping(bytes32 => Data) public datas;
    mapping(bytes32 => Host) private dataToHost; // since the mapping is one-to-many between host and data.
    uint public hostCount;
    uint public dataCount;
    
    constructor () {
    }

    function getClientData(address addr, uint index) public view returns(bytes32){
        return clientDataMap[addr][index];
    }

    event addHostEvent (
        uint indexed id,
        address indexed myAddress,
        bytes32 indexed locHash
    );

    function addHost (string memory _name, uint port, string memory ip, bytes32 locHash, uint diskspace) public {
        require(!isHost[msg.sender]);

        hosts[hostCount] = Host(hostCount, msg.sender, ip, port, _name, diskspace, locHash, 0);
        isHost[msg.sender] = true;

        emit addHostEvent(hostCount, msg.sender, locHash);
        hostCount ++;
    }

    event initiateStorageEvent(
        uint indexed hostId,
        address clientAddress,
        uint remainingHostDiskspace,
        uint indexed interval,
        string indexed salt
    );

    // TO initiate storage of a file from client to host
    // lochash - hash of Host ip, port, and name
    // genHash - Hash of the encrypted file
    // salt - salt of the hashing function 
    function initiateStorage (uint id, bytes32 genHash, uint size, uint interval, string memory salt) public {
        // Overall datacount update
        require(!isHost[msg.sender]);
        require(isHost[hosts[id].myAddress]);
        require(size <= hosts[id].diskspace);
        // Now that we get the input, we have to emit an event which is used as a check for socket transmission

        // Create a Data Instance
        datas[genHash] = Data(genHash, msg.sender, hosts[id].myAddress, interval, size, salt);

        // Link Data to Host
        dataToHost[genHash] = hosts[id];

        // Update diskspace and dataCount of host
        hosts[id].diskspace -= size;
        hosts[id].dataCount += 1;

        dataCount ++;
        clientDataCount[msg.sender] += 1;
        clientDataMap[msg.sender].push(genHash);
        emit initiateStorageEvent(id, msg.sender, hosts[id].diskspace, interval, salt);
    } 

}