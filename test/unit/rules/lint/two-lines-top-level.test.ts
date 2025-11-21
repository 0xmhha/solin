/**
 * Two Lines Top Level Rule Tests
 *
 * Testing two blank lines requirement between contract/library/interface definitions
 */

import { TwoLinesTopLevelRule } from '@/rules/lint/two-lines-top-level';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('TwoLinesTopLevelRule', () => {
  let rule: TwoLinesTopLevelRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new TwoLinesTopLevelRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/two-lines-top-level');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.INFO);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Top-level definition spacing', () => {
    test('should not report issue when contracts are separated by two blank lines', async () => {
      const source = `
pragma solidity ^0.8.0;

contract First {
}


contract Second {
}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue when contracts have only one blank line', async () => {
      const source = `
pragma solidity ^0.8.0;

contract First {
}

contract Second {
}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('two blank lines');
    });

    test('should report issue when contracts have no blank lines', async () => {
      const source = `
pragma solidity ^0.8.0;

contract First {
}
contract Second {
}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should check spacing between interface definitions', async () => {
      const source = `
pragma solidity ^0.8.0;

interface IFirst {
}


interface ISecond {
}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should check spacing between library definitions', async () => {
      const source = `
pragma solidity ^0.8.0;

library LibFirst {
}


library LibSecond {
}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should check spacing between mixed definitions', async () => {
      const source = `
pragma solidity ^0.8.0;

contract MyContract {
}


interface IMyInterface {
}


library MyLibrary {
}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue when spacing is inconsistent', async () => {
      const source = `
pragma solidity ^0.8.0;

contract First {
}

interface ISecond {
}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle single contract without error', async () => {
      const source = `
pragma solidity ^0.8.0;

contract MyContract {
}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue when more than two blank lines exist', async () => {
      const source = `
pragma solidity ^0.8.0;

contract First {
}



contract Second {
}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });
  });
});
