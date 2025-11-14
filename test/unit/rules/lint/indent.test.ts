/**
 * Indent Rule Tests
 */

import { IndentRule } from '@/rules/lint/indent';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('IndentRule', () => {
  let rule: IndentRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new IndentRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/indent');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });
  });

  describe('indentation violations', () => {
    test('should detect tab usage', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
\tfunction test() public {
\t\treturn;
\t}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.message.toLowerCase().includes('tab'))).toBe(true);
    });

    test('should detect inconsistent indentation (4 spaces expected)', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
   function test() public {
       uint x = 1;
   }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.message.includes('Expected indentation'))).toBe(true);
    });

    test('should detect inconsistent indentation (2 spaces expected)', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
   function test() public {
     uint x = 1;
   }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, {
        ...config,
        rules: { 'lint/indent': [Severity.INFO as any, { spaces: 2 }] },
      });
      const indentRule = new IndentRule();
      indentRule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect mixed indentation', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test1() public {
      uint x = 1;
    }
   function test2() public {
       uint y = 2;
   }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('correct indentation', () => {
    test('should not report consistent 4-space indentation', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {
        uint x = 1;
        if (x > 0) {
            x++;
        }
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report consistent 2-space indentation when configured', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
  function test() public {
    uint x = 1;
    if (x > 0) {
      x++;
    }
  }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, {
        ...config,
        rules: { 'lint/indent': [Severity.INFO as any, { spaces: 2 }] },
      });
      const indentRule = new IndentRule();
      indentRule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report empty lines', async () => {
      const source = `pragma solidity ^0.8.0;

contract Test {

    function test() public {
        uint x = 1;

        return;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report lines with only whitespace', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {

    function test() public {
        uint x = 1;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });

  describe('configuration', () => {
    test('should skip analysis with invalid configuration', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
   function test() public {
      uint x = 1;
   }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, {
        ...config,
        rules: { 'lint/indent': [Severity.INFO as any, { spaces: 3 }] }, // Invalid: not 2 or 4
      });
      const indentRule = new IndentRule();
      indentRule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });
});
