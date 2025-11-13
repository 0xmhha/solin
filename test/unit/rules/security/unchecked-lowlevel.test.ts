/**
 * Unchecked Low-Level Call Security Rule Tests
 */

import { UncheckedLowlevelRule } from '@/rules/security/unchecked-lowlevel';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('UncheckedLowlevelRule', () => {
  let rule: UncheckedLowlevelRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new UncheckedLowlevelRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/unchecked-lowlevel');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect unchecked .call()', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(address target) public {
            target.call("");
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message.toLowerCase()).toContain('call');
    });

    test('should detect unchecked .call() with data', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(address target, bytes memory data) public {
            target.call(data);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect unchecked .delegatecall()', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(address target, bytes memory data) public {
            target.delegatecall(data);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect unchecked .staticcall()', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(address target) public view {
            target.staticcall("");
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect unchecked call not using return value', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(address target) public {
            target.call("");
            // Return value is ignored
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect multiple unchecked calls', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(address a, address b) public {
            a.call("");
            b.delegatecall("");
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBe(2);
    });
  });

  describe('safe patterns', () => {
    test('should not report call with require check', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(address target) public {
            require(target.call(""), "Call failed");
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report call with assert check', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(address target) public {
            assert(target.call(""));
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report call with if statement check', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(address target) public pure returns (bool) {
            if (target.staticcall("")) {
              return true;
            }
            return false;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report call in require condition', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(address target) public {
            require(target.call(""));
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report call in ternary condition', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(address target) public pure returns (string memory) {
            return target.staticcall("") ? "success" : "failed";
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report contract without low-level calls', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public value;
          function setValue(uint v) public {
            value = v;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report transfer() or send() calls', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(address payable target) public {
            target.transfer(1 ether);
            target.send(1 ether);
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
