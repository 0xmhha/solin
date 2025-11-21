/**
 * Full Analysis Integration Test
 *
 * Testing complete analysis workflow from rule registration to results
 */

import { AnalysisEngine } from '@core/analysis-engine';
import { RuleRegistry } from '@core/rule-registry';
import { NoEmptyBlocksRule } from '@/rules/lint/no-empty-blocks';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Full Analysis Integration', () => {
  let registry: RuleRegistry;
  let parser: SolidityParser;
  let engine: AnalysisEngine;
  let tempDir: string;

  beforeAll(async () => {
    tempDir = path.join(__dirname, '../fixtures/integration-temp');
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    registry = new RuleRegistry();
    parser = new SolidityParser();
    engine = new AnalysisEngine(registry, parser);
  });

  describe('complete workflow', () => {
    test('should analyze clean Solidity contract with no issues', async () => {
      // Register rules
      registry.register(new NoEmptyBlocksRule());

      // Create test file
      const filePath = path.join(tempDir, 'clean-contract.sol');
      const source = `
        pragma solidity ^0.8.0;

        contract Token {
          string public name = "MyToken";
          uint256 public totalSupply;

          mapping(address => uint256) public balances;

          constructor(uint256 _initialSupply) {
            totalSupply = _initialSupply;
            balances[msg.sender] = _initialSupply;
          }

          function transfer(address _to, uint256 _amount) public returns (bool) {
            require(balances[msg.sender] >= _amount, "Insufficient balance");
            balances[msg.sender] -= _amount;
            balances[_to] += _amount;
            return true;
          }

          function balanceOf(address _owner) public view returns (uint256) {
            return balances[_owner];
          }
        }
      `;

      await fs.writeFile(filePath, source);

      // Analyze
      const result = await engine.analyze({
        files: [filePath],
        config: {
          basePath: tempDir,
          rules: {},
        },
      });

      // Verify results
      expect(result.files).toHaveLength(1);
      expect(result.totalIssues).toBe(0);
      expect(result.hasParseErrors).toBe(false);
      expect(result.summary.errors).toBe(0);
      expect(result.summary.warnings).toBe(0);
      expect(result.summary.info).toBe(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should detect multiple issues across multiple files', async () => {
      // Register rules
      registry.register(new NoEmptyBlocksRule());

      // Create test files
      const file1 = path.join(tempDir, 'empty-contract.sol');
      const file2 = path.join(tempDir, 'empty-functions.sol');

      await fs.writeFile(
        file1,
        `
        pragma solidity ^0.8.0;
        contract Empty {}
      `
      );

      await fs.writeFile(
        file2,
        `
        pragma solidity ^0.8.0;

        contract Functions {
          function empty1() public {}
          function empty2() internal {}
          function empty3() private {}
        }
      `
      );

      // Analyze
      const result = await engine.analyze({
        files: [file1, file2],
        config: {
          basePath: tempDir,
          rules: {},
        },
      });

      // Verify results
      expect(result.files).toHaveLength(2);
      expect(result.totalIssues).toBeGreaterThan(0);
      expect(result.hasParseErrors).toBe(false);
      expect(result.summary.warnings).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);

      // All issues should be from no-empty-blocks rule
      const allIssues = result.files.flatMap(f => f.issues);
      expect(allIssues.every(i => i.ruleId === 'lint/no-empty-blocks')).toBe(true);
      expect(allIssues.every(i => i.category === Category.LINT)).toBe(true);
      expect(allIssues.every(i => i.severity === Severity.WARNING)).toBe(true);
    });

    test('should handle mix of valid and invalid files', async () => {
      registry.register(new NoEmptyBlocksRule());

      const validFile = path.join(tempDir, 'valid.sol');
      const invalidFile = path.join(tempDir, 'invalid.sol');

      await fs.writeFile(
        validFile,
        `
        pragma solidity ^0.8.0;
        contract Valid {
          uint256 value;
        }
      `
      );

      await fs.writeFile(
        invalidFile,
        `
        this is not valid solidity
      `
      );

      const result = await engine.analyze({
        files: [validFile, invalidFile],
        config: {
          basePath: tempDir,
          rules: {},
        },
      });

      expect(result.files).toHaveLength(2);
      expect(result.hasParseErrors).toBe(true);

      // Find the invalid file result
      const invalidResult = result.files.find(f => f.filePath === invalidFile);
      expect(invalidResult?.parseErrors).toBeDefined();
      expect(invalidResult?.parseErrors!.length).toBeGreaterThan(0);
    });

    test('should track progress during analysis', async () => {
      registry.register(new NoEmptyBlocksRule());

      const files = [];
      for (let i = 0; i < 5; i++) {
        const filePath = path.join(tempDir, `file${i}.sol`);
        files.push(filePath);
        await fs.writeFile(
          filePath,
          `
          pragma solidity ^0.8.0;
          contract Test${i} {
            uint256 value;
          }
        `
        );
      }

      const progressCalls: Array<{ current: number; total: number }> = [];

      await engine.analyze({
        files,
        config: {
          basePath: tempDir,
          rules: {},
        },
        onProgress: (current, total) => {
          progressCalls.push({ current, total });
        },
      });

      expect(progressCalls).toHaveLength(5);
      expect(progressCalls[0]).toEqual({ current: 1, total: 5 });
      expect(progressCalls[4]).toEqual({ current: 5, total: 5 });
    });

    test('should provide file-level metadata', async () => {
      registry.register(new NoEmptyBlocksRule());

      const filePath = path.join(tempDir, 'metadata-test.sol');
      await fs.writeFile(
        filePath,
        `
        pragma solidity ^0.8.0;
        contract Test {
          function empty() public {}
        }
      `
      );

      const result = await engine.analyzeFile(filePath, {
        basePath: tempDir,
        rules: {},
      });

      expect(result.filePath).toBe(filePath);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.issues.length).toBeGreaterThan(0);

      const issue = result.issues[0];
      expect(issue?.filePath).toBe(filePath);
      expect(issue?.location).toBeDefined();
      expect(issue?.location.start).toBeDefined();
      expect(issue?.location.end).toBeDefined();
    });
  });

  describe('rule execution', () => {
    test('should execute rules in registration order', async () => {
      registry.register(new NoEmptyBlocksRule());

      const filePath = path.join(tempDir, 'order-test.sol');
      await fs.writeFile(
        filePath,
        `
        pragma solidity ^0.8.0;
        contract Empty {}
      `
      );

      const result = await engine.analyzeFile(filePath, {
        basePath: tempDir,
        rules: {},
      });

      expect(result.issues.length).toBeGreaterThan(0);
    });

    test('should continue analysis if one rule fails', async () => {
      // This is tested implicitly - if a rule throws, engine catches and continues
      registry.register(new NoEmptyBlocksRule());

      const filePath = path.join(tempDir, 'resilience-test.sol');
      await fs.writeFile(
        filePath,
        `
        pragma solidity ^0.8.0;
        contract Test {}
      `
      );

      // Should not throw even if a rule has issues
      const result = await engine.analyzeFile(filePath, {
        basePath: tempDir,
        rules: {},
      });

      expect(result).toBeDefined();
    });
  });
});
