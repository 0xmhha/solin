/**
 * Arbitrary Send Security Rule Tests
 *
 * Testing detection of dangerous send/transfer calls where recipient can be controlled by external input
 */

import { ArbitrarySendRule } from '@/rules/security/arbitrary-send';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ArbitrarySendRule', () => {
  let rule: ArbitrarySendRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ArbitrarySendRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/arbitrary-send');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('dangerous send patterns', () => {
    test('should detect send to function parameter', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          function withdraw(address payable recipient) public {
            recipient.send(1 ether);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/arbitrary.*send/i);
    });

    test('should detect transfer to function parameter', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          function sendEther(address payable to) external {
            to.transfer(address(this).balance);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/arbitrary/i);
    });

    test('should detect send to mapping value', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          mapping(uint256 => address payable) public recipients;

          function payout(uint256 id) public {
            recipients[id].send(100 wei);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect transfer to array element', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          address payable[] public users;

          function distribute(uint256 index) public {
            users[index].transfer(1 ether);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect send with user-controlled index', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          mapping(address => address payable) public beneficiaries;

          function withdraw(address user) external {
            beneficiaries[user].send(1 ether);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect multiple arbitrary sends in one function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MultiVulnerable {
          function doubleSend(address payable a, address payable b) public {
            a.send(1 ether);
            b.transfer(2 ether);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBe(2);
    });

    test('should detect send to storage variable set by function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          address payable public recipient;

          function setRecipient(address payable _recipient) public {
            recipient = _recipient;
          }

          function withdraw() public {
            recipient.send(1 ether);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Should detect the send in withdraw function
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('safe send patterns', () => {
    test('should not report send to msg.sender', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          function withdraw() public {
            payable(msg.sender).send(1 ether);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report send to contract owner with access control', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          address payable public owner;

          constructor() {
            owner = payable(msg.sender);
          }

          function withdraw() public {
            require(msg.sender == owner, "Not owner");
            owner.transfer(address(this).balance);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Should not report because owner is set in constructor and has access control
      expect(issues).toHaveLength(0);
    });

    test('should not report send to immutable address', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          address payable public immutable beneficiary;

          constructor(address payable _beneficiary) {
            beneficiary = _beneficiary;
          }

          function payout() public {
            beneficiary.send(1 ether);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Immutable addresses set in constructor are safe
      expect(issues).toHaveLength(0);
    });

    test('should not report send to hardcoded address', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          function donate() public {
            payable(0x1234567890123456789012345678901234567890).transfer(1 ether);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report send to constant address', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          address payable public constant TREASURY = payable(0x1234567890123456789012345678901234567890);

          function sendToTreasury() public {
            TREASURY.send(1 ether);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    test('should handle contract without send/transfer calls', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract NoSend {
          uint256 public value;

          function setValue(uint256 _value) public {
            value = _value;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle multiple contracts', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          function send(address payable to) public {
            to.send(1 ether);
          }
        }

        contract Safe {
          function withdraw() public {
            payable(msg.sender).transfer(1 ether);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Only report issue in Vulnerable contract
      expect(issues.length).toBe(1);
    });

    test('should handle nested function calls', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          function getRecipient(address user) internal view returns (address payable) {
            return payable(user);
          }

          function withdraw(address user) public {
            getRecipient(user).send(1 ether);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });
  });
});
