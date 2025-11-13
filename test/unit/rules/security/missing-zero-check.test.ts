/**
 * Missing Zero Check Security Rule Tests
 */

import { MissingZeroCheckRule } from '@/rules/security/missing-zero-check';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('MissingZeroCheckRule', () => {
  let rule: MissingZeroCheckRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new MissingZeroCheckRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/missing-zero-check');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect missing zero check in constructor', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address public owner;
          constructor(address _owner) {
            owner = _owner;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('zero');
    });

    test('should detect missing zero check in setter function', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address public admin;
          function setAdmin(address _admin) external {
            admin = _admin;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect missing zero check with multiple address parameters', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address public owner;
          address public admin;
          function setAddresses(address _owner, address _admin) external {
            owner = _owner;
            admin = _admin;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBe(2);
    });

    test('should detect missing zero check in transfer function', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function transfer(address recipient, uint amount) external {
            // transfer logic
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect missing zero check with payable address', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address payable public recipient;
          function setRecipient(address payable _recipient) external {
            recipient = _recipient;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });
  });

  describe('safe patterns', () => {
    test('should not report when zero check is present', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address public owner;
          function setOwner(address _owner) external {
            require(_owner != address(0), "Zero address");
            owner = _owner;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report when using assert for zero check', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address public admin;
          function setAdmin(address _admin) external {
            assert(_admin != address(0));
            admin = _admin;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report when using if statement for zero check', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address public owner;
          function setOwner(address _owner) external {
            if (_owner == address(0)) revert();
            owner = _owner;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report view functions', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function getBalance(address account) external view returns (uint) {
            return account.balance;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report pure functions', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function hash(address account) external pure returns (bytes32) {
            return keccak256(abi.encodePacked(account));
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report functions without address parameters', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public value;
          function setValue(uint _value) external {
            value = _value;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report internal functions', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address public owner;
          function _setOwner(address _owner) internal {
            owner = _owner;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report private functions', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address public admin;
          function _updateAdmin(address _admin) private {
            admin = _admin;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report contract without address parameters', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public value;
          function test() public {
            value = 123;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });
});
