/**
 * Gas Multitoken1155 Rule Tests
 *
 * Testing detection of multiple token types that could benefit from ERC1155
 */

import { GasMultitoken1155 } from '@/rules/lint/gas-multitoken1155';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('GasMultitoken1155', () => {
  let rule: GasMultitoken1155;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new GasMultitoken1155();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('gas/multitoken1155');
    });

    test('should have LINT category', () => {
      expect(rule.metadata.category).toBe(Category.LINT);
    });

    test('should have INFO severity', () => {
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });

    test('should have correct metadata', () => {
      expect(rule.metadata.title).toContain('ERC1155');
      expect(rule.metadata.description).toContain('ERC1155');
      expect(rule.metadata.recommendation).toContain('ERC1155');
    });
  });

  describe('Detection', () => {
    test('should detect multiple ERC20 token state variables', async () => {
      const code = `
        contract MultiToken {
          mapping(address => uint256) public token1Balances;
          mapping(address => uint256) public token2Balances;
          mapping(address => uint256) public token3Balances;

          function transfer1(address to, uint256 amount) public {}
          function transfer2(address to, uint256 amount) public {}
          function transfer3(address to, uint256 amount) public {}
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
      expect(issues[0]!.message).toContain('ERC1155');
      expect(issues[0]!.message).toContain('gas');
    });

    test('should detect contract with multiple token-like mappings', async () => {
      const code = `
        contract GameTokens {
          mapping(address => uint256) public goldBalance;
          mapping(address => uint256) public silverBalance;
          mapping(address => uint256) public bronzeBalance;
          mapping(address => uint256) public diamondBalance;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
      expect(issues[0]!.message).toContain('token');
    });

    test('should not flag contracts with single token mapping', async () => {
      const code = `
        contract SingleToken {
          mapping(address => uint256) public balances;

          function transfer(address to, uint256 amount) public {}
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should not flag contracts with two token mappings (threshold is 3)', async () => {
      const code = `
        contract TwoTokens {
          mapping(address => uint256) public token1;
          mapping(address => uint256) public token2;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should not flag non-token mappings', async () => {
      const code = `
        contract Registry {
          mapping(address => bool) public isActive;
          mapping(address => string) public names;
          mapping(uint256 => address) public owners;
          mapping(bytes32 => uint256) public values;
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
        contract Empty {
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect NFT collections that could use ERC1155', async () => {
      const code = `
        contract NFTCollections {
          mapping(uint256 => address) public collection1Owners;
          mapping(uint256 => address) public collection2Owners;
          mapping(uint256 => address) public collection3Owners;
          mapping(uint256 => address) public collection4Owners;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
    });

    test('should include gas savings information', async () => {
      const code = `
        contract Tokens {
          mapping(address => uint256) public balanceA;
          mapping(address => uint256) public balanceB;
          mapping(address => uint256) public balanceC;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
      expect(issues[0]!.message).toContain('gas');
    });

    test('should handle multiple contracts in one file', async () => {
      const code = `
        contract Tokens1 {
          mapping(address => uint256) public tokenA;
          mapping(address => uint256) public tokenB;
          mapping(address => uint256) public tokenC;
        }

        contract Tokens2 {
          mapping(address => uint256) public tokenX;
          mapping(address => uint256) public tokenY;
          mapping(address => uint256) public tokenZ;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(2);
    });

    test('should detect address-uint256 mappings indicating fungible tokens', async () => {
      const code = `
        contract FungibleTokens {
          mapping(address => uint256) public rewardTokenBalance;
          mapping(address => uint256) public governanceTokenBalance;
          mapping(address => uint256) public utilityTokenBalance;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
      expect(issues[0]!.message).toContain('fungible');
    });

    test('should mention ERC1155 standard in recommendation', async () => {
      const code = `
        contract Items {
          mapping(address => uint256) public item1;
          mapping(address => uint256) public item2;
          mapping(address => uint256) public item3;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
      expect(rule.metadata.recommendation).toContain('ERC1155');
    });
  });

  describe('Gas Savings Information', () => {
    test('should include deployment cost savings in description', () => {
      expect(rule.metadata.description).toContain('deployment');
    });

    test('should include per-transaction savings in description', () => {
      expect(rule.metadata.description).toContain('transaction');
    });
  });

  describe('Edge Cases', () => {
    test('should handle contracts with complex state variables', async () => {
      const code = `
        contract Complex {
          mapping(address => uint256) public tokenA;
          uint256 public totalSupply;
          mapping(address => uint256) public tokenB;
          address public owner;
          mapping(address => uint256) public tokenC;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
    });

    test('should handle contracts with mixed mapping types', async () => {
      const code = `
        contract Mixed {
          mapping(address => uint256) public tokenBalance;
          mapping(address => bool) public isActive;
          mapping(uint256 => address) public nftOwner;
          mapping(bytes32 => uint256) public dataHash;
          mapping(address => uint256) public rewardBalance;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      // Should only count token-like mappings (address=>uint256 and uint256=>address)
      expect(issues).toHaveLength(1);
    });

    test('should handle contracts with nested mappings', async () => {
      const code = `
        contract Nested {
          mapping(address => mapping(uint256 => uint256)) public allowances;
          mapping(address => uint256) public tokenA;
          mapping(address => uint256) public tokenB;
          mapping(address => uint256) public tokenC;
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
