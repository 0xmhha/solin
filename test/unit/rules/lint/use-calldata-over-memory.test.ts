/**
 * Use Calldata Over Memory Rule Tests
 *
 * Testing detection of memory parameters that should use calldata
 */

import { UseCalldataOverMemory } from '@/rules/lint/use-calldata-over-memory';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('UseCalldataOverMemory', () => {
  let rule: UseCalldataOverMemory;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new UseCalldataOverMemory();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('gas/use-calldata-over-memory');
    });

    test('should have LINT category', () => {
      expect(rule.metadata.category).toBe(Category.LINT);
    });

    test('should have INFO severity', () => {
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });

    test('should have correct metadata', () => {
      expect(rule.metadata.title.toLowerCase()).toContain('calldata');
      expect(rule.metadata.description).toContain('calldata');
      expect(rule.metadata.recommendation).toContain('calldata');
    });
  });

  describe('Detection', () => {
    test('should detect memory array parameter in external function', async () => {
      const code = `
        contract Test {
          function process(uint256[] memory data) external {
            // Process data
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
      expect(issues[0]!.message).toContain('calldata');
      expect(issues[0]!.message).toContain('memory');
    });

    test('should detect memory string parameter in external function', async () => {
      const code = `
        contract Test {
          function setName(string memory name) external {
            // Set name
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
      expect(issues[0]!.message).toContain('string');
    });

    test('should detect memory bytes parameter in external function', async () => {
      const code = `
        contract Test {
          function processData(bytes memory data) external {
            // Process data
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
    });

    test('should detect multiple memory parameters', async () => {
      const code = `
        contract Test {
          function process(
            uint256[] memory data,
            string memory name,
            bytes memory signature
          ) external {
            // Process
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(3);
    });

    test('should not flag public functions (memory required for internal calls)', async () => {
      const code = `
        contract Test {
          function process(uint256[] memory data) public {
            // Process data
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should not flag internal functions', async () => {
      const code = `
        contract Test {
          function process(uint256[] memory data) internal {
            // Process data
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should not flag private functions', async () => {
      const code = `
        contract Test {
          function process(uint256[] memory data) private {
            // Process data
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should not flag calldata parameters', async () => {
      const code = `
        contract Test {
          function process(uint256[] calldata data) external {
            // Process data
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should not flag value type parameters', async () => {
      const code = `
        contract Test {
          function process(uint256 value, address sender) external {
            // Process
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should handle empty contract', async () => {
      const code = `
        contract Test {
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should include gas savings estimate', async () => {
      const code = `
        contract Test {
          function process(uint256[] memory data) external {
            // Process data
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
      expect(issues[0]!.message).toContain('gas');
    });

    test('should handle struct memory parameters', async () => {
      const code = `
        contract Test {
          struct Data {
            uint256 value;
            address sender;
          }

          function process(Data memory data) external {
            // Process data
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
    });

    test('should handle multiple contracts', async () => {
      const code = `
        contract Test1 {
          function process(uint256[] memory data) external {}
        }

        contract Test2 {
          function process(string memory name) external {}
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(2);
    });

    test('should handle function with no parameters', async () => {
      const code = `
        contract Test {
          function process() external {
            // No parameters
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect array of structs', async () => {
      const code = `
        contract Test {
          struct Item {
            uint256 id;
            string name;
          }

          function processItems(Item[] memory items) external {
            // Process items
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
    });

    test('should handle mixed memory and calldata parameters', async () => {
      const code = `
        contract Test {
          function process(
            uint256[] calldata validData,
            string memory invalidName
          ) external {
            // Process
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
      expect(issues[0]!.message).toContain('string');
    });
  });

  describe('Gas Savings Information', () => {
    test('should mention gas savings in description', () => {
      expect(rule.metadata.description).toContain('gas');
    });

    test('should explain calldata benefits in recommendation', () => {
      expect(rule.metadata.recommendation).toContain('calldata');
    });
  });

  describe('Edge Cases', () => {
    test('should handle constructor with memory parameters', async () => {
      const code = `
        contract Test {
          constructor(uint256[] memory data) {
            // Initialize
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      // Constructors are not external, so no issue
      expect(issues).toHaveLength(0);
    });

    test('should handle functions with storage parameters', async () => {
      const code = `
        contract Test {
          uint256[] data;

          function process(uint256[] storage localData) internal {
            // Process
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should handle unnamed parameters', async () => {
      const code = `
        contract Test {
          function process(uint256[] memory) external {
            // Anonymous parameter
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
    });

    test('should handle fixed-size arrays', async () => {
      const code = `
        contract Test {
          function process(uint256[10] memory data) external {
            // Fixed size array
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
    });

    test('should handle nested array types', async () => {
      const code = `
        contract Test {
          function process(uint256[][] memory data) external {
            // Nested array
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
    });

    test('should handle bytes1-bytes31 (value types, no issue)', async () => {
      const code = `
        contract Test {
          function process(bytes32 data) external {
            // bytes32 is a value type, doesn't need memory/calldata
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should handle view and pure functions', async () => {
      const code = `
        contract Test {
          function getData(uint256[] memory data) external view returns (uint256) {
            return data[0];
          }

          function process(string memory text) external pure returns (uint256) {
            return bytes(text).length;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(2);
    });

    test('should get correct type names for various parameter types', async () => {
      const code = `
        contract Test {
          struct Data {
            uint256 value;
          }

          function processArray(uint256[] memory arr) external {}
          function processStruct(Data memory data) external {}
          function processString(string memory text) external {}
          function processBytes(bytes memory data) external {}
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(4);
      expect(issues.some(issue => issue.message.includes('uint256[]'))).toBe(true);
      expect(issues.some(issue => issue.message.includes('string'))).toBe(true);
      expect(issues.some(issue => issue.message.includes('bytes'))).toBe(true);
    });

    test('should handle payable external functions', async () => {
      const code = `
        contract Test {
          function deposit(uint256[] memory amounts) external payable {
            // Payable function
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
    });
  });
});
