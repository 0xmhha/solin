/**
 * Unchecked Return Value Security Rule Tests
 */

import { UncheckedReturnRule } from '@/rules/security/unchecked-return';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('UncheckedReturnRule', () => {
  let rule: UncheckedReturnRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new UncheckedReturnRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/unchecked-return');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect unchecked delegatecall return value', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          function execute(address target, bytes memory data) public {
            target.delegatecall(data);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message.toLowerCase()).toContain('unchecked');
    });

    test('should detect unchecked send return value', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          function sendEther(address payable to, uint amount) public {
            to.send(amount);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect unchecked delegatecall', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          function execute(address target, bytes memory data) public {
            target.delegatecall(data);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect unchecked staticcall', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          function execute(address target, bytes memory data) public {
            target.staticcall(data);
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

  describe('safe patterns', () => {
    test('should not report when return value is checked', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          function send(address to) public payable {
            (bool success, ) = to.call{value: msg.value}("");
            require(success, "Transfer failed");
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report internal calls', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          function _internal() internal returns (bool) {
            return true;
          }

          function execute() public {
            _internal();
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report view/pure functions', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          function getValue() public pure returns (uint) {
            return 42;
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
