/**
 * ERC721 Interface Security Rule Tests
 *
 * Testing validation of ERC721 interface implementation
 */

import { ERC721Interface } from '@/rules/security/erc721-interface';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ERC721Interface', () => {
  let rule: ERC721Interface;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ERC721Interface();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('security/erc721-interface');
    });

    test('should have SECURITY category', () => {
      expect(rule.metadata.category).toBe(Category.SECURITY);
    });

    test('should have INFO severity', () => {
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });
  });

  describe('Detection', () => {
    test('should detect missing balanceOf function', async () => {
      const code = `
        contract NFT {
          function ownerOf(uint256 tokenId) public view returns (address) {}
          function safeTransferFrom(address from, address to, uint256 tokenId) public {}
          function transferFrom(address from, address to, uint256 tokenId) public {}
          function approve(address to, uint256 tokenId) public {}
          function setApprovalForAll(address operator, bool approved) public {}
          function getApproved(uint256 tokenId) public view returns (address) {}
          function isApprovedForAll(address owner, address operator) public view returns (bool) {}
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.message.toLowerCase().includes('balanceof'))).toBe(true);
    });

    test('should not flag complete ERC721 implementation', async () => {
      const code = `
        contract NFT {
          function balanceOf(address owner) public view returns (uint256) {}
          function ownerOf(uint256 tokenId) public view returns (address) {}
          function safeTransferFrom(address from, address to, uint256 tokenId) public {}
          function transferFrom(address from, address to, uint256 tokenId) public {}
          function approve(address to, uint256 tokenId) public {}
          function setApprovalForAll(address operator, bool approved) public {}
          function getApproved(uint256 tokenId) public view returns (address) {}
          function isApprovedForAll(address owner, address operator) public view returns (bool) {}
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should not flag non-NFT contracts', async () => {
      const code = `
        contract NotAnNFT {
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
  });
});
