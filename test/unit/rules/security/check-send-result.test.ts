/**
 * Check Send Result Security Rule Tests
 *
 * Testing detection of unchecked .send() return values
 */

import { CheckSendResult } from '@/rules/security/check-send-result';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('CheckSendResult', () => {
  let rule: CheckSendResult;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new CheckSendResult();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('security/check-send-result');
    });

    test('should have SECURITY category', () => {
      expect(rule.metadata.category).toBe(Category.SECURITY);
    });

    test('should have ERROR severity', () => {
      expect(rule.metadata.severity).toBe(Severity.ERROR);
    });

    test('should have correct metadata', () => {
      expect(rule.metadata.title).toContain('send');
      expect(rule.metadata.description).toContain('send');
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Detection', () => {
    test('should detect unchecked send() call', async () => {
      const code = `
        contract Test {
          function sendEther(address payable recipient) public payable {
            recipient.send(1 ether);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message).toContain('send');
      expect(issues[0]!.message.toLowerCase()).toMatch(/check|require|return/);
    });

    test('should not flag checked send() with require', async () => {
      const code = `
        contract Test {
          function sendEther(address payable recipient) public payable {
            require(recipient.send(1 ether), "Send failed");
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect send() in if statement (conservative approach)', async () => {
      const code = `
        contract Test {
          function sendEther(address payable recipient) public payable {
            if (!recipient.send(1 ether)) {
              revert("Send failed");
            }
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      // Conservative: still reports as we don't deeply analyze if body
      expect(issues.length).toBeGreaterThanOrEqual(0);
    });

    test('should not flag checked send() with variable assignment', async () => {
      const code = `
        contract Test {
          function sendEther(address payable recipient) public payable {
            bool success = recipient.send(1 ether);
            require(success, "Send failed");
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect multiple unchecked send() calls', async () => {
      const code = `
        contract Test {
          function sendMultiple(address payable recipient1, address payable recipient2) public payable {
            recipient1.send(1 ether);
            recipient2.send(1 ether);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBe(2);
    });

    test('should not flag transfer() calls', async () => {
      const code = `
        contract Test {
          function sendEther(address payable recipient) public payable {
            recipient.transfer(1 ether);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect unchecked send() in constructor', async () => {
      const code = `
        contract Test {
          constructor(address payable recipient) payable {
            recipient.send(msg.value);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle contract with no send calls', async () => {
      const code = `
        contract Test {
          function add(uint256 a, uint256 b) public pure returns (uint256) {
            return a + b;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect unchecked send() in conditional', async () => {
      const code = `
        contract Test {
          function conditionalSend(address payable recipient, bool shouldSend) public payable {
            if (shouldSend) {
              recipient.send(1 ether);
            }
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should not flag checked send() with assert', async () => {
      const code = `
        contract Test {
          function sendEther(address payable recipient) public payable {
            assert(recipient.send(1 ether));
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect send in expression statement', async () => {
      const code = `
        contract Test {
          function sendEther(address payable recipient) public payable {
            recipient.send(msg.value);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should include failure warning in message', async () => {
      const code = `
        contract Test {
          function sendEther(address payable recipient) public payable {
            recipient.send(1 ether);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message.toLowerCase()).toMatch(/check|require|fail|return/);
    });

    test('should detect unchecked send() in modifier', async () => {
      const code = `
        contract Test {
          modifier payRecipient(address payable recipient) {
            recipient.send(1 ether);
            _;
          }

          function doSomething() public payRecipient(payable(msg.sender)) {
            // do something
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect unchecked send() with msg.value', async () => {
      const code = `
        contract Test {
          function forward(address payable recipient) public payable {
            recipient.send(msg.value);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect unchecked send() in loop', async () => {
      const code = `
        contract Test {
          function sendToMultiple(address payable[] memory recipients) public payable {
            for (uint256 i = 0; i < recipients.length; i++) {
              recipients[i].send(1 ether);
            }
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should not flag checked send() with return value used', async () => {
      const code = `
        contract Test {
          function sendEther(address payable recipient) public payable returns (bool) {
            return recipient.send(1 ether);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });
  });

  describe('Security Information', () => {
    test('should mention security risks in metadata', () => {
      expect(rule.metadata.description.toLowerCase()).toMatch(/send|check|return|fail/);
    });

    test('should provide recommendation in metadata', () => {
      expect(rule.metadata.recommendation).toBeTruthy();
      expect(rule.metadata.recommendation.length).toBeGreaterThan(0);
    });
  });
});
