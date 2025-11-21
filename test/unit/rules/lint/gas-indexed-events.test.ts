/**
 * Gas Indexed Events Rule Tests
 *
 * Testing detection of event parameters that should be indexed for efficient filtering
 */

import { GasIndexedEvents } from '@/rules/lint/gas-indexed-events';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('GasIndexedEvents', () => {
  let rule: GasIndexedEvents;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new GasIndexedEvents();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('lint/gas-indexed-events');
    });

    test('should have LINT category', () => {
      expect(rule.metadata.category).toBe(Category.LINT);
    });

    test('should have INFO severity', () => {
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });

    test('should have correct metadata', () => {
      expect(rule.metadata.title).toContain('indexed');
      expect(rule.metadata.description).toContain('indexed');
      expect(rule.metadata.recommendation).toContain('indexed');
    });
  });

  describe('Detection', () => {
    test('should detect address parameter without indexed', async () => {
      const code = `
        contract Test {
          event Transfer(address from, address to, uint256 amount);
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message).toContain('indexed');
    });

    test('should not flag address parameters that are already indexed', async () => {
      const code = `
        contract Test {
          event Transfer(address indexed from, address indexed to, uint256 amount);
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect bytes32 parameter without indexed', async () => {
      const code = `
        contract Test {
          event DataStored(bytes32 key, bytes value);
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.message.includes('key'))).toBe(true);
    });

    test('should not flag uint256 parameters (less commonly indexed)', async () => {
      const code = `
        contract Test {
          event ValueChanged(uint256 newValue);
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should respect maximum of 3 indexed parameters', async () => {
      const code = `
        contract Test {
          event Transfer(
            address indexed from,
            address indexed to,
            address indexed spender,
            uint256 amount
          );
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      // Already has 3 indexed, should not suggest more
      expect(issues).toHaveLength(0);
    });

    test('should detect multiple non-indexed address parameters', async () => {
      const code = `
        contract Test {
          event Approval(address owner, address spender, uint256 amount);
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThanOrEqual(2);
    });

    test('should handle events with no parameters', async () => {
      const code = `
        contract Test {
          event Initialized();
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should handle events with only indexed parameters', async () => {
      const code = `
        contract Test {
          event UserRegistered(address indexed user, bytes32 indexed userId);
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect string parameters (not indexable)', async () => {
      const code = `
        contract Test {
          event Log(string message);
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      // string cannot be indexed (only hash is stored), should not flag
      expect(issues).toHaveLength(0);
    });

    test('should handle multiple events in one contract', async () => {
      const code = `
        contract Test {
          event Transfer(address from, address to, uint256 amount);
          event Approval(address owner, address spender, uint256 amount);
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle mixed indexed and non-indexed parameters', async () => {
      const code = `
        contract Test {
          event Transfer(address indexed from, address to, uint256 amount);
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message).toContain('to');
    });

    test('should not flag when approaching indexed limit', async () => {
      const code = `
        contract Test {
          event MultiTransfer(
            address indexed from,
            address indexed to,
            address receiver,
            uint256 amount
          );
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      // Only 2 indexed, can add 1 more (receiver)
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message).toContain('receiver');
    });

    test('should handle contract with no events', async () => {
      const code = `
        contract Test {
          function foo() public {}
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect bool parameters that should be indexed', async () => {
      const code = `
        contract Test {
          event StatusChanged(bool active);
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle enum parameters', async () => {
      const code = `
        contract Test {
          enum Status { Active, Inactive }
          event StatusChanged(Status newStatus);
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      // Enums can be indexed
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should include gas impact information in message', async () => {
      const code = `
        contract Test {
          event Transfer(address from, address to, uint256 amount);
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message.toLowerCase()).toMatch(/filter|search|query|indexed/);
    });
  });

  describe('Gas Optimization Information', () => {
    test('should include filtering benefits in metadata', () => {
      expect(rule.metadata.description.toLowerCase()).toContain('filter');
    });

    test('should mention indexed keyword in recommendation', () => {
      expect(rule.metadata.recommendation).toContain('indexed');
    });
  });
});
