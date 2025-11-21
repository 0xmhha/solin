/**
 * Separate By One Line Rule Tests
 *
 * Testing blank line enforcement between top-level declarations
 */

import { SeparateByOneLineRule } from '@/rules/lint/separate-by-one-line';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('SeparateByOneLineRule', () => {
  let rule: SeparateByOneLineRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new SeparateByOneLineRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/separate-by-one-line');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.INFO);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Line separation validation', () => {
    test('should not report issue when declarations are separated by one blank line', async () => {
      const source = `
pragma solidity ^0.8.0;

import "./Token.sol";

import "./Ownable.sol";

contract MyContract {
}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue when declarations have no blank line between them', async () => {
      const source = `
pragma solidity ^0.8.0;
import "./Token.sol";
import "./Ownable.sol";

contract MyContract {
}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should report issue when declarations have more than one blank line', async () => {
      const source = `
pragma solidity ^0.8.0;

import "./Token.sol";


import "./Ownable.sol";

contract MyContract {
}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should check separation between functions', async () => {
      const source = `
pragma solidity ^0.8.0;

contract MyContract {
    function first() public {
    }

    function second() public {
    }
}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue when functions have no separation', async () => {
      const source = `
pragma solidity ^0.8.0;

contract MyContract {
    function first() public {
    }
    function second() public {
    }
}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle single declaration without error', async () => {
      const source = `
pragma solidity ^0.8.0;

import "./Token.sol";

contract MyContract {
}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });
  });
});
