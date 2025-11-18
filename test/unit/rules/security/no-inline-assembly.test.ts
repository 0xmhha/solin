/**
 * No Inline Assembly Security Rule Tests
 *
 * Testing detection of inline assembly usage
 */

import { NoInlineAssembly } from '@/rules/security/no-inline-assembly';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('NoInlineAssembly', () => {
  let rule: NoInlineAssembly;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new NoInlineAssembly();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('security/no-inline-assembly');
    });

    test('should have SECURITY category', () => {
      expect(rule.metadata.category).toBe(Category.SECURITY);
    });

    test('should have WARNING severity', () => {
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });

    test('should have correct metadata', () => {
      expect(rule.metadata.title).toContain('assembly');
      expect(rule.metadata.description).toContain('assembly');
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Detection', () => {
    test('should detect inline assembly block', async () => {
      const code = `
        contract Test {
          function getCodeSize(address addr) public view returns (uint256 size) {
            assembly {
              size := extcodesize(addr)
            }
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message).toContain('assembly');
    });

    test('should not flag contract without assembly', async () => {
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

    test('should detect multiple assembly blocks', async () => {
      const code = `
        contract Test {
          function func1(address addr) public view returns (uint256 size) {
            assembly {
              size := extcodesize(addr)
            }
          }

          function func2(bytes memory data) public pure returns (bytes32 hash) {
            assembly {
              hash := keccak256(add(data, 32), mload(data))
            }
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBe(2);
    });

    test('should detect assembly in constructor', async () => {
      const code = `
        contract Test {
          constructor() {
            assembly {
              let ptr := mload(0x40)
              mstore(ptr, 0x12345678)
            }
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect assembly with memory operations', async () => {
      const code = `
        contract Test {
          function allocate(uint256 size) public pure returns (bytes memory) {
            bytes memory data;
            assembly {
              data := mload(0x40)
              mstore(0x40, add(data, size))
            }
            return data;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect assembly with storage operations', async () => {
      const code = `
        contract Test {
          function setStorage(uint256 slot, uint256 value) public {
            assembly {
              sstore(slot, value)
            }
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect assembly in modifier', async () => {
      const code = `
        contract Test {
          modifier onlyContract(address addr) {
            uint256 size;
            assembly {
              size := extcodesize(addr)
            }
            require(size > 0, "Not a contract");
            _;
          }

          function doSomething() public onlyContract(msg.sender) {
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

    test('should handle multiple contracts', async () => {
      const code = `
        contract Test1 {
          function withAssembly() public pure {
            assembly {
              let x := 1
            }
          }
        }

        contract Test2 {
          function withoutAssembly() public pure returns (uint256) {
            return 42;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBe(1);
    });

    test('should include security warning in message', async () => {
      const code = `
        contract Test {
          function useAssembly() public pure {
            assembly {
              let x := 1
            }
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message.toLowerCase()).toMatch(/assembly|avoid|security|audit/);
    });

    test('should detect assembly in internal function', async () => {
      const code = `
        contract Test {
          function internal_func() internal pure returns (uint256) {
            uint256 result;
            assembly {
              result := 42
            }
            return result;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect assembly with complex operations', async () => {
      const code = `
        contract Test {
          function complexAssembly(bytes memory data) public pure returns (bytes32) {
            bytes32 hash;
            assembly {
              let ptr := add(data, 32)
              let len := mload(data)
              hash := keccak256(ptr, len)
            }
            return hash;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect assembly in library', async () => {
      const code = `
        library Utils {
          function isContract(address addr) internal view returns (bool) {
            uint256 size;
            assembly {
              size := extcodesize(addr)
            }
            return size > 0;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect assembly with delegatecall', async () => {
      const code = `
        contract Test {
          function proxyCall(address target, bytes memory data) public returns (bool) {
            bool success;
            assembly {
              success := delegatecall(gas(), target, add(data, 32), mload(data), 0, 0)
            }
            return success;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect assembly in fallback function', async () => {
      const code = `
        contract Test {
          fallback() external {
            assembly {
              calldatacopy(0, 0, calldatasize())
              return(0, calldatasize())
            }
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

  describe('Security Information', () => {
    test('should mention security risks in metadata', () => {
      expect(rule.metadata.description.toLowerCase()).toMatch(/assembly|security|risk|audit/);
    });

    test('should provide recommendation in metadata', () => {
      expect(rule.metadata.recommendation).toBeTruthy();
      expect(rule.metadata.recommendation.length).toBeGreaterThan(0);
    });
  });
});
