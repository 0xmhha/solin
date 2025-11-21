/**
 * Analysis Engine Tests
 *
 * Testing the main analysis engine
 */

import { AnalysisEngine } from '@core/analysis-engine';
import { RuleRegistry } from '@core/rule-registry';
import { NoEmptyBlocksRule } from '@/rules/lint/no-empty-blocks';
import { SolidityParser } from '@parser/solidity-parser';
import type { ResolvedConfig } from '@config/types';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('AnalysisEngine', () => {
  let engine: AnalysisEngine;
  let registry: RuleRegistry;
  let parser: SolidityParser;
  let config: ResolvedConfig;
  let tempDir: string;

  beforeEach(async () => {
    registry = new RuleRegistry();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };

    engine = new AnalysisEngine(registry, parser);

    // Create temp directory for test files
    tempDir = path.join(__dirname, '../../fixtures/temp');
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temp files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    test('should create engine with registry and parser', () => {
      expect(engine).toBeInstanceOf(AnalysisEngine);
    });
  });

  describe('analyzeFile', () => {
    test('should analyze single file with no issues', async () => {
      const filePath = path.join(tempDir, 'good.sol');
      const source = `
        pragma solidity ^0.8.0;

        contract GoodContract {
          uint256 public value;

          function setValue(uint256 _value) public {
            value = _value;
          }
        }
      `;

      await fs.writeFile(filePath, source);

      const result = await engine.analyzeFile(filePath, config);

      expect(result.filePath).toBe(filePath);
      expect(result.issues).toHaveLength(0);
      expect(result.parseErrors).toBeUndefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    test('should detect issues with registered rules', async () => {
      registry.register(new NoEmptyBlocksRule());

      const filePath = path.join(tempDir, 'empty.sol');
      const source = `
        pragma solidity ^0.8.0;

        contract EmptyContract {}
      `;

      await fs.writeFile(filePath, source);

      const result = await engine.analyzeFile(filePath, config);

      expect(result.filePath).toBe(filePath);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]?.ruleId).toBe('lint/no-empty-blocks');
    });

    test('should handle parse errors gracefully', async () => {
      const filePath = path.join(tempDir, 'invalid.sol');
      const source = `
        pragma solidity ^0.8.0;

        contract Invalid {
          this is invalid syntax
        }
      `;

      await fs.writeFile(filePath, source);

      const result = await engine.analyzeFile(filePath, config);

      expect(result.filePath).toBe(filePath);
      expect(result.parseErrors).toBeDefined();
      expect(result.parseErrors!.length).toBeGreaterThan(0);
    });

    test('should handle non-existent files', async () => {
      const filePath = path.join(tempDir, 'nonexistent.sol');

      await expect(engine.analyzeFile(filePath, config)).rejects.toThrow();
    });

    test('should execute multiple rules', async () => {
      registry.register(new NoEmptyBlocksRule());
      // Add more rules when available

      const filePath = path.join(tempDir, 'multi.sol');
      const source = `
        pragma solidity ^0.8.0;

        contract TestContract {
          function empty1() public {}
          function empty2() internal {}
        }
      `;

      await fs.writeFile(filePath, source);

      const result = await engine.analyzeFile(filePath, config);

      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('analyze', () => {
    test('should analyze multiple files', async () => {
      registry.register(new NoEmptyBlocksRule());

      const file1 = path.join(tempDir, 'file1.sol');
      const file2 = path.join(tempDir, 'file2.sol');

      await fs.writeFile(
        file1,
        `
        pragma solidity ^0.8.0;
        contract Good {
          uint256 value;
        }
      `
      );

      await fs.writeFile(
        file2,
        `
        pragma solidity ^0.8.0;
        contract Empty {}
      `
      );

      const result = await engine.analyze({
        files: [file1, file2],
        config,
      });

      expect(result.files).toHaveLength(2);
      expect(result.totalIssues).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should calculate summary correctly', async () => {
      registry.register(new NoEmptyBlocksRule());

      const filePath = path.join(tempDir, 'summary.sol');
      await fs.writeFile(
        filePath,
        `
        pragma solidity ^0.8.0;
        contract Empty1 {}
        contract Empty2 {}
      `
      );

      const result = await engine.analyze({
        files: [filePath],
        config,
      });

      expect(result.summary).toBeDefined();
      expect(result.summary.warnings).toBeGreaterThan(0);
      expect(result.summary.errors).toBe(0);
      expect(result.summary.info).toBe(0);
      expect(result.totalIssues).toBe(result.summary.warnings);
    });

    test('should set hasParseErrors flag', async () => {
      const filePath = path.join(tempDir, 'invalid2.sol');
      await fs.writeFile(
        filePath,
        `
        invalid solidity code here
      `
      );

      const result = await engine.analyze({
        files: [filePath],
        config,
      });

      expect(result.hasParseErrors).toBe(true);
    });

    test('should handle empty file list', async () => {
      const result = await engine.analyze({
        files: [],
        config,
      });

      expect(result.files).toHaveLength(0);
      expect(result.totalIssues).toBe(0);
      expect(result.hasParseErrors).toBe(false);
    });

    test('should call progress callback', async () => {
      const filePath = path.join(tempDir, 'progress.sol');
      await fs.writeFile(
        filePath,
        `
        pragma solidity ^0.8.0;
        contract Test {}
      `
      );

      const progressCalls: Array<{ current: number; total: number }> = [];
      const onProgress = (current: number, total: number): void => {
        progressCalls.push({ current, total });
      };

      await engine.analyze({
        files: [filePath],
        config,
        onProgress,
      });

      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[progressCalls.length - 1]).toEqual({
        current: 1,
        total: 1,
      });
    });
  });
});
