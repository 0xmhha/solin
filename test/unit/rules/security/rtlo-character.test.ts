/**
 * RTLO Character Security Rule Tests
 *
 * Testing detection of right-to-left override characters
 */

import { RtloCharacterRule } from '@/rules/security/rtlo-character';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('RtloCharacterRule', () => {
  let rule: RtloCharacterRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new RtloCharacterRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/rtlo-character');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('RTLO character detection', () => {
    test('should detect RTLO character in source code', async () => {
      // Using the RTLO character (U+202E)
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          // Comment with RTLO: \u202E test
          string public name = "Normal";
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/RTLO|right-to-left|unicode/i);
    });

    test('should detect RTLO in string literal', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          string public value = "test\u202Evalue";
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect multiple RTLO characters', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          string public a = "test\u202Ea";
          string public b = "test\u202Eb";
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(2);
    });

    test('should detect LRO character', async () => {
      // Left-to-right override (U+202D)
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          string public value = "test\u202Dvalue";
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect RLO character', async () => {
      // Right-to-left override (U+202E)
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          // RLO test: \u202E
          uint256 public value;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('safe code without RTLO', () => {
    test('should not report normal code', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          string public name = "Normal String";
          uint256 public value = 42;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report regular unicode', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          string public emoji = "Hello 👋";
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report regular comments', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          // This is a normal comment
          /* Multi-line
             comment
          */
          uint256 public value;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    test('should handle empty contract', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Empty {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should detect RTLO in variable name area', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          // Variable with direction override nearby \u202E
          uint256 public value = 100;
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
