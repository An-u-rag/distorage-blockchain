// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.19;

contract Audit {

    bytes32 private c_genHash;
    address public client;
    address public host;
    uint public dataId;
    uint public salt;

    
    constructor () {
    }

    function setClient (address c) public {
        client = c;
    }

    event initiateAuditEvent(
        address indexed clientAddress,
        uint indexed dataId,
        uint indexed salt
    );

    function initiateAudit(bytes32 genHash, uint salt, address hostAddress, uint dataId) external payable{
        host = hostAddress;
        client = msg.sender;

        c_genHash = genHash;

        salt = salt;
        dataId = dataId;


        emit initiateAuditEvent(msg.sender, dataId, salt);
    }

    event AuditSuccess(bytes32 indexed hostGenHash);

    event AuditFailure(bytes32 indexed hostGenHash);

    function checkHash(bytes32 h_genHash) external payable{
        if (h_genHash == c_genHash){
            emit AuditSuccess(h_genHash);
            (bool success, ) = (msg.sender).call{value: address(this).balance}("");
            require(success, "transaction failed on success"); 
        } 
        else {
            emit AuditFailure(h_genHash);
            (bool success, ) = client.call{value: address(this).balance}("");
            require(success, "transaction failed on failure"); 
        }
    }
}