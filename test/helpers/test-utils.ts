/**
 * Test utilities for creating test fixtures and mock objects
 */

/**
 * Creates a mock Analysis Context for testing rules
 */
export function createMockContext(sourceCode: string, filePath = 'test.sol'): any {
  return {
    sourceCode,
    filePath,
    ast: null, // Will be populated when parser is implemented
    config: {},
  };
}

/**
 * Creates a sample Solidity contract for testing
 */
export function createSampleContract(name = 'TestContract'): string {
  return `
    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.0;

    contract ${name} {
      uint256 public value;

      function setValue(uint256 _value) public {
        value = _value;
      }

      function getValue() public view returns (uint256) {
        return value;
      }
    }
  `;
}

/**
 * Creates a vulnerable contract for security testing
 */
export function createVulnerableContract(): string {
  return `
    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.0;

    contract Vulnerable {
      mapping(address => uint256) public balances;

      function deposit() public payable {
        balances[msg.sender] += msg.value;
      }

      function withdraw() public {
        uint256 amount = balances[msg.sender];
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        balances[msg.sender] = 0; // State change after external call
      }
    }
  `;
}

/**
 * Strips whitespace for easier string comparison
 */
export function stripWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}
