/**
 * Var Name Mixedcase Rule Tests
 */

import { VarNameMixedcaseRule } from '@/rules/lint/var-name-mixedcase';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('VarNameMixedcaseRule', () => {
  let rule: VarNameMixedcaseRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new VarNameMixedcaseRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/var-name-mixedcase');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });
  });

  describe('valid variable names', () => {
    test('should not report mixedCase local variables', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {
        uint myVariable = 1;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report single word lowercase variables', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {
        uint balance = 100;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report multi-word mixedCase', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {
        uint totalBalance = 100;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should allow state variables with underscore prefix', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    uint private _balance;
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should allow function parameters', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function transfer(address recipient, uint amount) public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });

  describe('invalid variable names', () => {
    test('should detect PascalCase variable names', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {
        uint MyVariable = 1;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('mixedCase');
    });

    test('should detect snake_case variable names', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {
        uint my_variable = 1;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect all caps variable names', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {
        uint MYVARIABLE = 1;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect state variable with snake_case', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    uint public total_balance;
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('multiple variables', () => {
    test('should detect multiple naming violations', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {
        uint MyVariable = 1;
        uint another_variable = 2;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBe(2);
    });

    test('should only report invalid names', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {
        uint validVariable = 1;
        uint Invalid_Variable = 2;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBe(1);
      expect(issues[0]?.message).toContain('Invalid_Variable');
    });
  });

  describe('location reporting', () => {
    test('should report correct location for invalid name', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {
        uint MyVariable = 1;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBe(1);
      expect(issues[0]?.location.start.line).toBe(4);
    });
  });
});
