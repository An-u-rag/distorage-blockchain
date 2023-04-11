// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.19;



contract PingContract {
    uint256 private lastPingTime;
    uint256 private constant PING_INTERVAL = 20 minutes;

    event Ping(uint256 timestamp);

    constructor() {
        lastPingTime = block.timestamp;
    }

    function sendPing() public {
        require(block.timestamp >= lastPingTime + PING_INTERVAL, "Not enough time has passed since the last ping");
        lastPingTime = block.timestamp;
        emit Ping(lastPingTime);
    }
}