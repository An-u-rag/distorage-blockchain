// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.19;



contract AuditLog {
    event LogEntry(address indexed sender, string message);
    
    function log(string memory message) public {
        emit LogEntry(msg.sender, message);
    }
}