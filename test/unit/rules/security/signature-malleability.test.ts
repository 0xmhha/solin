/**
 * Signature Malleability Security Rule Tests
 */

import { SignatureMalleabilityRule } from '@/rules/security/signature-malleability';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('SignatureMalleabilityRule', () => {
  let rule: SignatureMalleabilityRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new SignatureMalleabilityRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/signature-malleability');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect ecrecover without s value validation', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          function verify(bytes32 hash, uint8 v, bytes32 r, bytes32 s) public pure returns (address) {
            return ecrecover(hash, v, r, s);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message.toLowerCase()).toContain('signature malleability');
    });

    test('should detect ecrecover with signature parameter', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          function recoverSigner(bytes32 message, bytes memory signature) public pure returns (address) {
            bytes32 r;
            bytes32 s;
            uint8 v;
            assembly {
              r := mload(add(signature, 32))
              s := mload(add(signature, 64))
              v := byte(0, mload(add(signature, 96)))
            }
            return ecrecover(message, v, r, s);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect ecrecover without both validations', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          function verify(bytes32 hash, uint8 v, bytes32 r, bytes32 s) public pure returns (address) {
            require(v == 27 || v == 28);
            return ecrecover(hash, v, r, s);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message.toLowerCase()).toContain("'s'");
    });

    test('should detect missing v value validation', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          function verify(bytes32 hash, uint8 v, bytes32 r, bytes32 s) public pure returns (bool) {
            address signer = ecrecover(hash, v, r, s);
            return signer != address(0);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('safe patterns', () => {
    test('should not report when using OpenZeppelin ECDSA library', async () => {
      const source = `
        pragma solidity ^0.8.0;
        import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

        contract Safe {
          using ECDSA for bytes32;

          function verify(bytes32 hash, bytes memory signature) public pure returns (address) {
            return hash.recover(signature);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report when s value is properly validated', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          function verify(bytes32 hash, uint8 v, bytes32 r, bytes32 s) public pure returns (address) {
            require(uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0, "Invalid s");
            require(v == 27 || v == 28, "Invalid v");
            return ecrecover(hash, v, r, s);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report EIP-712 with proper validation', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          bytes32 public DOMAIN_SEPARATOR;

          function verify(bytes32 structHash, bytes memory signature) public view returns (address) {
            bytes32 digest = keccak256(abi.encodePacked("\\x19\\x01", DOMAIN_SEPARATOR, structHash));
            return recoverSigner(digest, signature);
          }

          function recoverSigner(bytes32 hash, bytes memory sig) internal pure returns (address) {
            bytes32 r;
            bytes32 s;
            uint8 v;
            assembly {
              r := mload(add(sig, 32))
              s := mload(add(sig, 64))
              v := byte(0, mload(add(sig, 96)))
            }
            require(uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0);
            require(v == 27 || v == 28);
            return ecrecover(hash, v, r, s);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report functions without ecrecover', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          function transfer(address to, uint amount) public {
            // no signature verification
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });
});
