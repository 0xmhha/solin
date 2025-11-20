/**
 * ERC20 Interface Security Rule Tests
 *
 * Testing validation of ERC20 interface implementation
 */

import { ERC20Interface } from '@/rules/security/erc20-interface';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ERC20Interface', () => {
  let rule: ERC20Interface;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ERC20Interface();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('security/erc20-interface');
    });

    test('should have SECURITY category', () => {
      expect(rule.metadata.category).toBe(Category.SECURITY);
    });

    test('should have INFO severity', () => {
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });

    test('should have correct metadata', () => {
      expect(rule.metadata.title).toBeTruthy();
      expect(rule.metadata.description).toContain('ERC20');
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Detection', () => {
    test('should detect missing totalSupply function', async () => {
      const code = `
        contract Token {
          function balanceOf(address account) public view returns (uint256) {}
          function transfer(address to, uint256 amount) public returns (bool) {}
          function allowance(address owner, address spender) public view returns (uint256) {}
          function approve(address spender, uint256 amount) public returns (bool) {}
          function transferFrom(address from, address to, uint256 amount) public returns (bool) {}
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.message.toLowerCase().includes('totalsupply'))).toBe(true);
    });

    test('should detect missing balanceOf function', async () => {
      const code = `
        contract Token {
          function totalSupply() public view returns (uint256) {}
          function transfer(address to, uint256 amount) public returns (bool) {}
          function allowance(address owner, address spender) public view returns (uint256) {}
          function approve(address spender, uint256 amount) public returns (bool) {}
          function transferFrom(address from, address to, uint256 amount) public returns (bool) {}
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.message.toLowerCase().includes('balanceof'))).toBe(true);
    });

    test('should not flag complete ERC20 implementation', async () => {
      const code = `
        contract Token {
          function totalSupply() public view returns (uint256) {}
          function balanceOf(address account) public view returns (uint256) {}
          function transfer(address to, uint256 amount) public returns (bool) {}
          function allowance(address owner, address spender) public view returns (uint256) {}
          function approve(address spender, uint256 amount) public returns (bool) {}
          function transferFrom(address from, address to, uint256 amount) public returns (bool) {}
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should not flag non-token contracts', async () => {
      const code = `
        contract NotAToken {
          function doSomething() public pure returns (uint256) {
            return 42;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect multiple missing functions', async () => {
      const code = `
        contract Token {
          function transfer(address to, uint256 amount) public returns (bool) {}
          function approve(address spender, uint256 amount) public returns (bool) {}
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should work with external visibility', async () => {
      const code = `
        contract Token {
          function totalSupply() external view returns (uint256) {}
          function balanceOf(address account) external view returns (uint256) {}
          function transfer(address to, uint256 amount) external returns (bool) {}
          function allowance(address owner, address spender) external view returns (uint256) {}
          function approve(address spender, uint256 amount) external returns (bool) {}
          function transferFrom(address from, address to, uint256 amount) external returns (bool) {}
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });
  });
});
