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
    uint public hostCount;
    
    constructor () {
    }

    event addHostEvent (
        uint indexed id,
        address indexed myAddress
    );

    function addHost (string memory _name, uint port, string memory ip, uint diskspace) public {
        require(!isHost[msg.sender]);

        hosts[hostCount] = Host(hostCount, msg.sender, ip, port, _name, diskspace);
        isHost[msg.sender] = true;

        emit addHostEvent(hostCount, msg.sender);
        hostCount ++;
    }

}