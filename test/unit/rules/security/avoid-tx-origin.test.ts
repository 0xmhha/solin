/**
 * Avoid tx.origin Security Rule Tests
 *
 * Testing detection of dangerous tx.origin usage
 */

import { AvoidTxOrigin } from '@/rules/security/avoid-tx-origin';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('AvoidTxOrigin', () => {
  let rule: AvoidTxOrigin;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new AvoidTxOrigin();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('security/avoid-tx-origin');
    });

    test('should have SECURITY category', () => {
      expect(rule.metadata.category).toBe(Category.SECURITY);
    });

    test('should have WARNING severity', () => {
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });

    test('should have correct metadata', () => {
      expect(rule.metadata.title).toContain('tx.origin');
      expect(rule.metadata.description).toContain('tx.origin');
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Detection', () => {
    test('should detect tx.origin in require statement', async () => {
      const code = `
        contract Test {
          function withdraw() public {
            require(tx.origin == owner, "Not owner");
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message).toContain('tx.origin');
      expect(issues[0]!.message.toLowerCase()).toMatch(/msg\.sender|authorization|phishing/);
    });

    test('should detect tx.origin in if statement', async () => {
      const code = `
        contract Test {
          function withdraw() public {
            if (tx.origin != owner) {
              revert("Not authorized");
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

    test('should detect tx.origin in modifier', async () => {
      const code = `
        contract Test {
          modifier onlyOwner() {
            require(tx.origin == owner);
            _;
          }

          function withdraw() public onlyOwner {
            // withdraw logic
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect tx.origin in constructor', async () => {
      const code = `
        contract Test {
          constructor() {
            require(tx.origin == msg.sender, "No contract deployment");
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect tx.origin in assignment', async () => {
      const code = `
        contract Test {
          address public deployer;

          constructor() {
            deployer = tx.origin;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect tx.origin in return statement', async () => {
      const code = `
        contract Test {
          function getOrigin() public view returns (address) {
            return tx.origin;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect multiple tx.origin usages', async () => {
      const code = `
        contract Test {
          function check() public view returns (bool) {
            if (tx.origin == owner) {
              return true;
            }
            require(tx.origin != address(0));
            return false;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBe(2);
    });

    test('should not flag contracts without tx.origin', async () => {
      const code = `
        contract Test {
          address public owner;

          modifier onlyOwner() {
            require(msg.sender == owner, "Not owner");
            _;
          }

          function withdraw() public onlyOwner {
            payable(msg.sender).transfer(address(this).balance);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect tx.origin in nested expressions', async () => {
      const code = `
        contract Test {
          function check() public view returns (bool) {
            return (tx.origin == owner && msg.value > 0);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect tx.origin in function call arguments', async () => {
      const code = `
        contract Test {
          function check() public {
            someFunction(tx.origin);
          }

          function someFunction(address addr) internal pure {}
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect tx.origin in comparison with address(0)', async () => {
      const code = `
        contract Test {
          function check() public view {
            require(tx.origin != address(0), "Zero address");
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect tx.origin in assert statement', async () => {
      const code = `
        contract Test {
          function check() public view {
            assert(tx.origin == owner);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect tx.origin in event emission', async () => {
      const code = `
        contract Test {
          event Action(address indexed origin);

          function doAction() public {
            emit Action(tx.origin);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect tx.origin in ternary expression', async () => {
      const code = `
        contract Test {
          function check() public view returns (address) {
            return tx.origin == owner ? owner : address(0);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect tx.origin in mapping key', async () => {
      const code = `
        contract Test {
          mapping(address => uint256) public balances;

          function deposit() public payable {
            balances[tx.origin] += msg.value;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect tx.origin in array access', async () => {
      const code = `
        contract Test {
          address[] public users;

          function addUser() public {
            users.push(tx.origin);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect tx.origin in loop condition', async () => {
      const code = `
        contract Test {
          function check() public view {
            while (tx.origin != address(0)) {
              // loop body
              break;
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

    test('should include security warning in message', async () => {
      const code = `
        contract Test {
          function check() public view {
            require(tx.origin == owner);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message.toLowerCase()).toMatch(/tx\.origin|msg\.sender|phishing|authorization/);
    });

    test('should detect tx.origin in internal function', async () => {
      const code = `
        contract Test {
          function _checkOrigin() internal view returns (bool) {
            return tx.origin == msg.sender;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect tx.origin in private function', async () => {
      const code = `
        contract Test {
          function _verify() private view {
            require(tx.origin != address(0));
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
      expect(rule.metadata.description.toLowerCase()).toMatch(/tx\.origin|phishing|authorization/);
    });

    test('should provide recommendation in metadata', () => {
      expect(rule.metadata.recommendation).toBeTruthy();
      expect(rule.metadata.recommendation.length).toBeGreaterThan(0);
      expect(rule.metadata.recommendation.toLowerCase()).toContain('msg.sender');
    });
  });
});
