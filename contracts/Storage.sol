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
        uint salt;
        uint dataId;
    }

    mapping(uint => Host) public hosts;
    mapping(address => bool) public isHost;
    mapping(address => uint) public clientDataCount;
    mapping(address => uint[]) public clientDataMap;
    mapping(uint => Data) public datas;
    mapping(uint => bool) public isData;
    mapping(uint => Host) private dataToHost; // since the mapping is one-to-many between host and data.
    uint public hostCount;
    uint public dataCount;
    
    constructor () {
    }

    function getClientData(address addr, uint index) public view returns(uint){
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

    function confirmStorage(address payable _to, uint256 amount) external payable{
        (bool success, ) = _to.call{value: amount}("");
        require(success, "transaction failed");
    }

    event initiateStorageEvent(
        address indexed hostId,
        address clientAddress,
        uint remainingHostDiskspace,
        uint indexed dataId,
        uint interval,
        uint indexed salty
    );

    // TO initiate storage of a file from client to host
    // lochash - hash of Host ip, port, and name
    // genHash - Hash of the encrypted file
    // salt - salt of the hashing function 
    function initiateStorage (uint id, bytes32 genHash, uint size, uint interval, uint salty) public payable {
        // Overall datacount update
        require(!isHost[msg.sender]);
        require(isHost[hosts[id].myAddress]);
        require(size <= hosts[id].diskspace);
        // Now that we get the input, we have to emit an event which is used as a check for socket transmission

        uint dataid = dataCount;

        // Create a Data Instance
        datas[dataid] = Data(genHash, msg.sender, hosts[id].myAddress, interval, size, salty, dataid);

        // Link Data to Host
        dataToHost[dataid] = hosts[id];

        // Update diskspace and dataCount of host
        hosts[id].diskspace -= size;
        hosts[id].dataCount += 1;

        dataCount ++;
        clientDataCount[msg.sender] += 1;
        clientDataMap[msg.sender].push(dataid);
        emit initiateStorageEvent(hosts[id].myAddress, msg.sender, hosts[id].diskspace, dataid, interval, salty);
    } 

}