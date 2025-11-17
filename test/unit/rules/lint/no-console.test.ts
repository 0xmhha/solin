/**
 * No Console Rule Tests
 */

import { NoConsoleRule } from '@/rules/lint/no-console';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('NoConsoleRule', () => {
  let rule: NoConsoleRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new NoConsoleRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/no-console');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });
  });

  describe('console import detection', () => {
    test('should detect hardhat console import', async () => {
      const source = `pragma solidity ^0.8.0;
import "hardhat/console.sol";

contract Test {
    function test() public {
        return;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('console');
    });

    test('should detect hardhat console2 import', async () => {
      const source = `pragma solidity ^0.8.0;
import "hardhat/console2.sol";

contract Test {}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should not report non-console imports', async () => {
      const source = `pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Test {}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });

  describe('console function call detection', () => {
    test('should detect console.log call', async () => {
      const source = `pragma solidity ^0.8.0;

contract Test {
    function test() public {
        console.log("test");
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('console.log');
    });

    test('should detect console.logUint call', async () => {
      const source = `pragma solidity ^0.8.0;

contract Test {
    function test() public {
        console.logUint(123);
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect console2.log call', async () => {
      const source = `pragma solidity ^0.8.0;

contract Test {
    function test() public {
        console2.log("test");
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect multiple console calls', async () => {
      const source = `pragma solidity ^0.8.0;

contract Test {
    function test() public {
        console.log("test1");
        console.log("test2");
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBe(2);
    });
  });

  describe('edge cases', () => {
    test('should not report regular function calls', async () => {
      const source = `pragma solidity ^0.8.0;

contract Test {
    function test() public {
        someFunction();
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should handle comments with console', async () => {
      const source = `pragma solidity ^0.8.0;

contract Test {
    // This is a comment about console.log
    function test() public {
        return;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should handle console in string literals', async () => {
      const source = `pragma solidity ^0.8.0;

contract Test {
    string public message = "console.log is useful";
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });

  describe('location reporting', () => {
    test('should report correct location for console import', async () => {
      const source = `pragma solidity ^0.8.0;
import "hardhat/console.sol";

contract Test {}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBe(1);
      expect(issues[0]?.location.start.line).toBe(2);
    });

    test('should report correct location for console.log call', async () => {
      const source = `pragma solidity ^0.8.0;

contract Test {
    function test() public {
        console.log("test");
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBe(1);
      expect(issues[0]?.location.start.line).toBe(5);
    });
  });
});
