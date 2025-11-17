/**
 * Contract Name CamelCase Rule Tests
 */

import { ContractNameCamelCaseRule } from '@/rules/lint/contract-name-camelcase';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ContractNameCamelCaseRule', () => {
  let rule: ContractNameCamelCaseRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ContractNameCamelCaseRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/contract-name-camelcase');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });
  });

  describe('valid contract names', () => {
    test('should not report PascalCase contract names', async () => {
      const source = `pragma solidity ^0.8.0;
contract MyContract {
    function test() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report single word PascalCase', async () => {
      const source = `pragma solidity ^0.8.0;
contract Token {
    function test() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report multi-word PascalCase', async () => {
      const source = `pragma solidity ^0.8.0;
contract ERC20Token {
    function test() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report library names', async () => {
      const source = `pragma solidity ^0.8.0;
library SafeMath {
    function add(uint a, uint b) internal pure returns (uint) {
        return a + b;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report interface names', async () => {
      const source = `pragma solidity ^0.8.0;
interface IERC20 {
    function transfer(address to, uint amount) external;
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });

  describe('invalid contract names', () => {
    test('should detect lowercase contract names', async () => {
      const source = `pragma solidity ^0.8.0;
contract mycontract {
    function test() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('PascalCase');
    });

    test('should detect snake_case contract names', async () => {
      const source = `pragma solidity ^0.8.0;
contract my_contract {
    function test() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect camelCase contract names', async () => {
      const source = `pragma solidity ^0.8.0;
contract myContract {
    function test() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect all caps contract names', async () => {
      const source = `pragma solidity ^0.8.0;
contract MYCONTRACT {
    function test() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('multiple contracts', () => {
    test('should detect multiple naming violations', async () => {
      const source = `pragma solidity ^0.8.0;
contract mycontract {
    function test() public {}
}

contract another_contract {
    function test() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBe(2);
    });

    test('should only report invalid names', async () => {
      const source = `pragma solidity ^0.8.0;
contract ValidContract {
    function test() public {}
}

contract invalid_contract {
    function test() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBe(1);
      expect(issues[0]?.message).toContain('invalid_contract');
    });
  });

  describe('location reporting', () => {
    test('should report correct location for invalid name', async () => {
      const source = `pragma solidity ^0.8.0;
contract mycontract {
    function test() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBe(1);
      expect(issues[0]?.location.start.line).toBe(2);
    });
  });
});
