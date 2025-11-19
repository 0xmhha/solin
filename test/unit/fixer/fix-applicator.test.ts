/**
 * Fix Applicator Tests
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  FixApplicator,
  createFixApplicator,
  applyFixes,
} from '@/fixer/fix-applicator';
import type { Issue } from '@core/types';
import { Severity, Category } from '@core/types';

describe('FixApplicator', () => {
  let applicator: FixApplicator;
  const testDir = '/tmp/solin-fixer-test';

  // Helper to create test issues with fixes
  function createIssue(
    ruleId: string,
    startLine: number,
    startColumn: number,
    endLine: number,
    endColumn: number,
    replacement: string,
    description: string = 'Test fix',
  ): Issue {
    return {
      ruleId,
      severity: Severity.WARNING,
      category: Category.LINT,
      message: 'Test issue',
      filePath: '/test/file.sol',
      location: {
        start: { line: startLine, column: startColumn },
        end: { line: endLine, column: endColumn },
      },
      fix: {
        description,
        range: {
          start: { line: startLine, column: startColumn },
          end: { line: endLine, column: endColumn },
        },
        text: replacement,
      },
    };
  }

  beforeEach(async () => {
    applicator = new FixApplicator({ write: false });

    // Create test directory
    await fs.promises.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.promises.rm(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Basic fix application', () => {
    test('should apply single fix', () => {
      const source = 'pragma solidity ^0.8.0;';
      const issues = [createIssue('test/rule', 1, 0, 1, 6, 'PRAGMA')];

      const result = applicator.applyToSource(source, issues);

      expect(result.fixedSource).toBe('PRAGMA solidity ^0.8.0;');
      expect(result.fixesApplied).toBe(1);
      expect(result.fixesSkipped).toBe(0);
      expect(result.modified).toBe(true);
    });

    test('should apply multiple fixes on same line', () => {
      const source = 'uint foo = 10;';
      const issues = [
        createIssue('test/rule1', 1, 0, 1, 4, 'uint256'),
        createIssue('test/rule2', 1, 5, 1, 8, 'bar'),
      ];

      const result = applicator.applyToSource(source, issues);

      expect(result.fixedSource).toBe('uint256 bar = 10;');
      expect(result.fixesApplied).toBe(2);
    });

    test('should apply fixes on multiple lines', () => {
      const source = 'line1\nline2\nline3';
      const issues = [
        createIssue('test/rule1', 1, 0, 1, 5, 'LINE1'),
        createIssue('test/rule2', 3, 0, 3, 5, 'LINE3'),
      ];

      const result = applicator.applyToSource(source, issues);

      expect(result.fixedSource).toBe('LINE1\nline2\nLINE3');
      expect(result.fixesApplied).toBe(2);
    });

    test('should handle empty replacement (deletion)', () => {
      const source = 'uint public foo;';
      const issues = [createIssue('test/rule', 1, 5, 1, 12, '')];

      const result = applicator.applyToSource(source, issues);

      expect(result.fixedSource).toBe('uint foo;');
      expect(result.fixesApplied).toBe(1);
    });

    test('should handle insertion at position', () => {
      const source = 'function foo() {}';
      const issues = [createIssue('test/rule', 1, 13, 1, 13, 'public ')];

      const result = applicator.applyToSource(source, issues);

      expect(result.fixedSource).toBe('function foo(public ) {}');
      expect(result.fixesApplied).toBe(1);
    });

    test('should return unchanged source when no fixes', () => {
      const source = 'pragma solidity ^0.8.0;';
      const issues: Issue[] = [];

      const result = applicator.applyToSource(source, issues);

      expect(result.fixedSource).toBe(source);
      expect(result.fixesApplied).toBe(0);
      expect(result.modified).toBe(false);
    });

    test('should ignore issues without fixes', () => {
      const source = 'pragma solidity ^0.8.0;';
      const issues: Issue[] = [
        {
          ruleId: 'test/rule',
          severity: Severity.WARNING,
          category: Category.LINT,
          message: 'No fix available',
          filePath: '/test/file.sol',
          location: {
            start: { line: 1, column: 0 },
            end: { line: 1, column: 6 },
          },
          // No fix property
        },
      ];

      const result = applicator.applyToSource(source, issues);

      expect(result.fixedSource).toBe(source);
      expect(result.fixesApplied).toBe(0);
    });
  });

  describe('Overlapping fix detection', () => {
    test('should skip overlapping fixes', () => {
      const source = 'uint foo = 10;';
      const issues = [
        createIssue('test/rule1', 1, 0, 1, 8, 'uint256 bar'), // 0-8
        createIssue('test/rule2', 1, 5, 1, 8, 'baz'), // 5-8 (overlaps)
      ];

      const result = applicator.applyToSource(source, issues);

      // First fix should be applied, second skipped
      expect(result.fixesApplied).toBe(1);
      expect(result.fixesSkipped).toBe(1);
      expect(result.results.find((r) => !r.applied)?.error).toContain(
        'overlapping',
      );
    });

    test('should handle contained fixes', () => {
      const source = 'function test() { return 0; }';
      const issues = [
        createIssue('test/rule1', 1, 0, 1, 29, 'function test() { return 1; }'), // entire line
        createIssue('test/rule2', 1, 25, 1, 26, '1'), // just the 0
      ];

      const result = applicator.applyToSource(source, issues);

      expect(result.fixesApplied).toBe(1);
      expect(result.fixesSkipped).toBe(1);
    });

    test('should apply non-overlapping fixes', () => {
      const source = 'uint foo; uint bar;';
      const issues = [
        createIssue('test/rule1', 1, 0, 1, 4, 'uint256'), // 0-4
        createIssue('test/rule2', 1, 10, 1, 14, 'uint256'), // 10-14
      ];

      const result = applicator.applyToSource(source, issues);

      expect(result.fixedSource).toBe('uint256 foo; uint256 bar;');
      expect(result.fixesApplied).toBe(2);
      expect(result.fixesSkipped).toBe(0);
    });
  });

  describe('Preview mode', () => {
    test('should preview fixes without applying', () => {
      const source = 'pragma solidity ^0.8.0;';
      const issues = [createIssue('test/rule', 1, 0, 1, 6, 'PRAGMA')];

      const preview = applicator.preview(source, issues);

      expect(preview).toHaveLength(1);
      expect(preview[0]?.original).toBe('pragma');
      expect(preview[0]?.replacement).toBe('PRAGMA');
      expect(preview[0]?.ruleId).toBe('test/rule');
    });

    test('should generate diff output', () => {
      const source = 'pragma solidity ^0.8.0;';
      const issues = [
        createIssue('test/rule', 1, 0, 1, 6, 'PRAGMA', 'Uppercase pragma'),
      ];

      const diff = applicator.getDiff(source, issues);

      expect(diff).toContain('--- test/rule');
      expect(diff).toContain('+++ Uppercase pragma');
      expect(diff).toContain('-pragma');
      expect(diff).toContain('+PRAGMA');
    });
  });

  describe('File operations', () => {
    test('should apply fixes to file', async () => {
      const testFile = path.join(testDir, 'test.sol');
      const originalContent = 'uint foo = 10;';
      await fs.promises.writeFile(testFile, originalContent, 'utf-8');

      const writeApplicator = new FixApplicator({ write: true });
      const issues = [createIssue('test/rule', 1, 0, 1, 4, 'uint256')];

      const result = await writeApplicator.applyToFile(testFile, issues);

      expect(result.modified).toBe(true);
      expect(result.fixesApplied).toBe(1);

      // Check file was actually modified
      const newContent = await fs.promises.readFile(testFile, 'utf-8');
      expect(newContent).toBe('uint256 foo = 10;');
    });

    test('should create backup when enabled', async () => {
      const testFile = path.join(testDir, 'test.sol');
      const originalContent = 'uint foo = 10;';
      await fs.promises.writeFile(testFile, originalContent, 'utf-8');

      const backupApplicator = new FixApplicator({
        write: true,
        backup: true,
        backupExtension: '.backup',
      });
      const issues = [createIssue('test/rule', 1, 0, 1, 4, 'uint256')];

      await backupApplicator.applyToFile(testFile, issues);

      // Check backup was created
      const backupFile = testFile + '.backup';
      expect(fs.existsSync(backupFile)).toBe(true);
      const backupContent = await fs.promises.readFile(backupFile, 'utf-8');
      expect(backupContent).toBe(originalContent);
    });

    test('should not write when write option is false', async () => {
      const testFile = path.join(testDir, 'test.sol');
      const originalContent = 'uint foo = 10;';
      await fs.promises.writeFile(testFile, originalContent, 'utf-8');

      const dryRunApplicator = new FixApplicator({ write: false });
      const issues = [createIssue('test/rule', 1, 0, 1, 4, 'uint256')];

      const result = await dryRunApplicator.applyToFile(testFile, issues);

      expect(result.modified).toBe(true);
      expect(result.fixedSource).toBe('uint256 foo = 10;');

      // Check file was NOT modified
      const content = await fs.promises.readFile(testFile, 'utf-8');
      expect(content).toBe(originalContent);
    });
  });

  describe('Edge cases', () => {
    test('should handle multiline fixes', () => {
      const source = 'function foo() {\n  return 0;\n}';
      const issues = [
        createIssue(
          'test/rule',
          1,
          15,
          3,
          1,
          '{\n  return 1;\n}',
        ),
      ];

      const result = applicator.applyToSource(source, issues);

      expect(result.fixedSource).toBe('function foo() {\n  return 1;\n}');
      expect(result.fixesApplied).toBe(1);
    });

    test('should handle fixes at end of file', () => {
      const source = 'contract Test {}';
      const issues = [createIssue('test/rule', 1, 14, 1, 16, '{\n}')];

      const result = applicator.applyToSource(source, issues);

      expect(result.fixedSource).toBe('contract Test {\n}');
    });

    test('should handle empty source', () => {
      const source = '';
      const issues: Issue[] = [];

      const result = applicator.applyToSource(source, issues);

      expect(result.fixedSource).toBe('');
      expect(result.modified).toBe(false);
    });

    test('should record fix results correctly', () => {
      const source = 'uint foo; uint bar;';
      const issues = [
        createIssue('test/rule1', 1, 0, 1, 4, 'uint256', 'Fix uint to uint256'),
        createIssue(
          'test/rule2',
          1, 10, 1, 14,
          'uint256',
          'Fix uint to uint256',
        ),
      ];

      const result = applicator.applyToSource(source, issues);

      expect(result.results).toHaveLength(2);
      expect(result.results.every((r) => r.applied)).toBe(true);
      expect(result.results[0]?.description).toBe('Fix uint to uint256');
    });
  });

  describe('Helper functions', () => {
    test('createFixApplicator should create applicator with options', () => {
      const applicator = createFixApplicator({ write: false, backup: true });
      expect(applicator).toBeInstanceOf(FixApplicator);
    });

    test('applyFixes should apply fixes to multiple files', async () => {
      // Create test files
      const file1 = path.join(testDir, 'file1.sol');
      const file2 = path.join(testDir, 'file2.sol');
      await fs.promises.writeFile(file1, 'uint foo;', 'utf-8');
      await fs.promises.writeFile(file2, 'uint bar;', 'utf-8');

      const fileIssues = new Map<string, Issue[]>();
      fileIssues.set(file1, [createIssue('test/rule', 1, 0, 1, 4, 'uint256')]);
      fileIssues.set(file2, [createIssue('test/rule', 1, 0, 1, 4, 'uint256')]);

      const results = await applyFixes(fileIssues, { write: false });

      expect(results.size).toBe(2);
      expect(results.get(file1)?.fixesApplied).toBe(1);
      expect(results.get(file2)?.fixesApplied).toBe(1);
    });
  });
});
