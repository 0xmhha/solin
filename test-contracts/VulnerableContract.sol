// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// This contract contains intentional vulnerabilities for testing

contract VulnerableContract {
    mapping(address => uint256) public balances;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    // Reentrancy vulnerability
    function withdraw() public {
        uint256 amount = balances[msg.sender];
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        balances[msg.sender] = 0; // State change after external call
    }

    // tx.origin vulnerability
    function transferOwnership(address newOwner) public {
        require(tx.origin == owner, "Not owner"); // Should use msg.sender
        owner = newOwner;
    }

    // Unchecked send
    function sendEther(address payable recipient, uint256 amount) public {
        recipient.send(amount); // Return value not checked
    }

    // Timestamp dependence
    function generateRandom() public view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp))) % 100;
    }

    // Magic number
    function calculateFee(uint256 amount) public pure returns (uint256) {
        return amount * 5 / 100; // Magic numbers 5 and 100
    }

    // Missing zero address check
    function setOwner(address newOwner) public {
        require(msg.sender == owner, "Not owner");
        owner = newOwner; // No zero address check
    }

    receive() external payable {
        balances[msg.sender] += msg.value;
    }
}
