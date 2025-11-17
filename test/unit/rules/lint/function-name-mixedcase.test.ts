/**
 * Function Name Mixedcase Rule Tests
 */

import { FunctionNameMixedcaseRule } from '@/rules/lint/function-name-mixedcase';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('FunctionNameMixedcaseRule', () => {
  let rule: FunctionNameMixedcaseRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new FunctionNameMixedcaseRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/function-name-mixedcase');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });
  });

  describe('valid function names', () => {
    test('should not report mixedCase function names', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function myFunction() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report single word lowercase function names', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function transfer() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report multi-word mixedCase', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function transferFrom() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should allow internal functions with underscore prefix', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function _internalFunction() internal {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should allow private functions with underscore prefix', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function _privateFunction() private {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });

  describe('invalid function names', () => {
    test('should detect PascalCase function names', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function MyFunction() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('mixedCase');
    });

    test('should detect snake_case function names', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function my_function() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect all caps function names', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function MYFUNCTION() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect underscore in middle of name', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function my_Function() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('special functions', () => {
    test('should not report constructor', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    constructor() {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report fallback function', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    fallback() external payable {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report receive function', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    receive() external payable {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });

  describe('multiple functions', () => {
    test('should detect multiple naming violations', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function MyFunction() public {}
    function another_function() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBe(2);
    });

    test('should only report invalid names', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function validFunction() public {}
    function Invalid_Function() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBe(1);
      expect(issues[0]?.message).toContain('Invalid_Function');
    });
  });

  describe('location reporting', () => {
    test('should report correct location for invalid name', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function MyFunction() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBe(1);
      expect(issues[0]?.location.start.line).toBe(3);
    });
  });
});
