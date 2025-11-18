/**
 * Avoid SHA3 Security Rule Tests
 *
 * Testing detection of deprecated sha3() function usage
 */

import { AvoidSha3 } from '@/rules/security/avoid-sha3';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('AvoidSha3', () => {
  let rule: AvoidSha3;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new AvoidSha3();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('security/avoid-sha3');
    });

    test('should have SECURITY category', () => {
      expect(rule.metadata.category).toBe(Category.SECURITY);
    });

    test('should have WARNING severity', () => {
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });

    test('should have correct metadata', () => {
      expect(rule.metadata.title).toContain('sha3');
      expect(rule.metadata.description).toContain('sha3');
      expect(rule.metadata.recommendation).toContain('keccak256');
    });
  });

  describe('Detection', () => {
    test('should detect sha3() function call', async () => {
      const code = `
        contract Test {
          function hash(string memory data) public pure returns (bytes32) {
            return sha3(data);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message).toContain('sha3');
      expect(issues[0]!.message).toContain('keccak256');
    });

    test('should not flag keccak256() function call', async () => {
      const code = `
        contract Test {
          function hash(string memory data) public pure returns (bytes32) {
            return keccak256(data);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect multiple sha3() calls', async () => {
      const code = `
        contract Test {
          function hash1(string memory data) public pure returns (bytes32) {
            return sha3(data);
          }

          function hash2(bytes memory data) public pure returns (bytes32) {
            return sha3(data);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBe(2);
    });

    test('should detect sha3() in constructor', async () => {
      const code = `
        contract Test {
          bytes32 public hash;

          constructor(string memory data) {
            hash = sha3(data);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect sha3() with abi.encodePacked', async () => {
      const code = `
        contract Test {
          function hash(uint256 a, uint256 b) public pure returns (bytes32) {
            return sha3(abi.encodePacked(a, b));
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle contract with no sha3 calls', async () => {
      const code = `
        contract Test {
          function add(uint256 a, uint256 b) public pure returns (uint256) {
            return a + b;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect sha3() in nested function calls', async () => {
      const code = `
        contract Test {
          function complex(string memory data) public pure returns (bytes32) {
            return bytes32(uint256(sha3(data)));
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect sha3() with multiple arguments', async () => {
      const code = `
        contract Test {
          function hash(address addr, uint256 value) public pure returns (bytes32) {
            return sha3(addr, value);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle multiple contracts', async () => {
      const code = `
        contract Test1 {
          function hash(string memory data) public pure returns (bytes32) {
            return sha3(data);
          }
        }

        contract Test2 {
          function hash(string memory data) public pure returns (bytes32) {
            return keccak256(data);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBe(1);
    });

    test('should include deprecation warning in message', async () => {
      const code = `
        contract Test {
          function hash(string memory data) public pure returns (bytes32) {
            return sha3(data);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message.toLowerCase()).toMatch(/deprecate|avoid|keccak256/);
    });

    test('should detect sha3() in modifier', async () => {
      const code = `
        contract Test {
          modifier onlyHash(string memory data, bytes32 expected) {
            require(sha3(data) == expected, "Invalid hash");
            _;
          }

          function doSomething(string memory data) public onlyHash(data, 0x0) {
            // do something
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect sha3() in return statement', async () => {
      const code = `
        contract Test {
          function getHash(bytes memory data) public pure returns (bytes32) {
            if (data.length > 0) {
              return sha3(data);
            }
            return bytes32(0);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect sha3() in variable assignment', async () => {
      const code = `
        contract Test {
          function processHash(string memory data) public pure {
            bytes32 hash = sha3(data);
            // use hash
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('Deprecation Information', () => {
    test('should mention deprecation in metadata', () => {
      expect(rule.metadata.description.toLowerCase()).toMatch(/deprecate|avoid/);
    });

    test('should recommend keccak256 in recommendation', () => {
      expect(rule.metadata.recommendation).toContain('keccak256');
    });
  });
});
