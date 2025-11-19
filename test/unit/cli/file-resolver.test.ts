/**
 * Tests for File Resolver
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { resolveFiles, loadIgnorePatterns, shouldIgnoreFile } from '@cli/file-resolver';

describe('FileResolver', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'solin-test-'));
  });

  afterEach(async () => {
    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('resolveFiles', () => {
    test('should resolve single .sol file', async () => {
      const testFile = path.join(tempDir, 'Test.sol');
      await fs.writeFile(testFile, 'contract Test {}');

      const files = await resolveFiles([testFile]);

      expect(files).toHaveLength(1);
      expect(files[0]).toBe(path.resolve(testFile));
    });

    test('should resolve multiple .sol files', async () => {
      const file1 = path.join(tempDir, 'Contract1.sol');
      const file2 = path.join(tempDir, 'Contract2.sol');

      await fs.writeFile(file1, 'contract Contract1 {}');
      await fs.writeFile(file2, 'contract Contract2 {}');

      const files = await resolveFiles([file1, file2]);

      expect(files).toHaveLength(2);
      expect(files).toContain(path.resolve(file1));
      expect(files).toContain(path.resolve(file2));
    });

    test('should resolve directory to all .sol files', async () => {
      const file1 = path.join(tempDir, 'Contract1.sol');
      const file2 = path.join(tempDir, 'Contract2.sol');
      const nonSolFile = path.join(tempDir, 'readme.txt');

      await fs.writeFile(file1, 'contract Contract1 {}');
      await fs.writeFile(file2, 'contract Contract2 {}');
      await fs.writeFile(nonSolFile, 'readme');

      const files = await resolveFiles([tempDir]);

      expect(files).toHaveLength(2);
      expect(files).toContain(path.resolve(file1));
      expect(files).toContain(path.resolve(file2));
      expect(files).not.toContain(path.resolve(nonSolFile));
    });

    test('should resolve glob pattern', async () => {
      const contractsDir = path.join(tempDir, 'contracts');
      await fs.mkdir(contractsDir);

      const file1 = path.join(contractsDir, 'Token.sol');
      const file2 = path.join(contractsDir, 'NFT.sol');

      await fs.writeFile(file1, 'contract Token {}');
      await fs.writeFile(file2, 'contract NFT {}');

      const pattern = path.join(tempDir, 'contracts', '*.sol');
      const files = await resolveFiles([pattern]);

      expect(files).toHaveLength(2);
      expect(files).toContain(path.resolve(file1));
      expect(files).toContain(path.resolve(file2));
    });

    test('should handle nested directories', async () => {
      const contractsDir = path.join(tempDir, 'contracts');
      const tokensDir = path.join(contractsDir, 'tokens');

      await fs.mkdir(contractsDir);
      await fs.mkdir(tokensDir);

      const file1 = path.join(contractsDir, 'Base.sol');
      const file2 = path.join(tokensDir, 'ERC20.sol');

      await fs.writeFile(file1, 'contract Base {}');
      await fs.writeFile(file2, 'contract ERC20 {}');

      const files = await resolveFiles([contractsDir]);

      expect(files).toHaveLength(2);
      expect(files).toContain(path.resolve(file1));
      expect(files).toContain(path.resolve(file2));
    });

    test('should ignore node_modules', async () => {
      const nodeModulesDir = path.join(tempDir, 'node_modules');
      await fs.mkdir(nodeModulesDir);

      const mainFile = path.join(tempDir, 'Main.sol');
      const depFile = path.join(nodeModulesDir, 'Dependency.sol');

      await fs.writeFile(mainFile, 'contract Main {}');
      await fs.writeFile(depFile, 'contract Dependency {}');

      const files = await resolveFiles([tempDir]);

      expect(files).toHaveLength(1);
      expect(files).toContain(path.resolve(mainFile));
      expect(files).not.toContain(path.resolve(depFile));
    });

    test('should return empty array for no matches', async () => {
      const files = await resolveFiles([path.join(tempDir, 'nonexistent.sol')]);

      expect(files).toHaveLength(0);
    });

    test('should deduplicate files', async () => {
      const testFile = path.join(tempDir, 'Test.sol');
      await fs.writeFile(testFile, 'contract Test {}');

      // Pass the same file multiple times
      const files = await resolveFiles([testFile, testFile, tempDir]);

      expect(files).toHaveLength(1);
      expect(files[0]).toBe(path.resolve(testFile));
    });

    test('should sort files alphabetically', async () => {
      const fileC = path.join(tempDir, 'C.sol');
      const fileA = path.join(tempDir, 'A.sol');
      const fileB = path.join(tempDir, 'B.sol');

      await fs.writeFile(fileC, 'contract C {}');
      await fs.writeFile(fileA, 'contract A {}');
      await fs.writeFile(fileB, 'contract B {}');

      const files = await resolveFiles([fileC, fileA, fileB]);

      expect(files).toHaveLength(3);
      expect(files[0]).toBe(path.resolve(fileA));
      expect(files[1]).toBe(path.resolve(fileB));
      expect(files[2]).toBe(path.resolve(fileC));
    });

    test('should handle relative paths', async () => {
      const testFile = path.join(tempDir, 'Test.sol');
      await fs.writeFile(testFile, 'contract Test {}');

      const relativePath = path.relative(process.cwd(), testFile);
      const files = await resolveFiles([relativePath]);

      expect(files).toHaveLength(1);
      expect(files[0]).toBe(path.resolve(testFile));
    });

    test('should respect ignore patterns from ignorePath', async () => {
      const file1 = path.join(tempDir, 'Keep.sol');
      const file2 = path.join(tempDir, 'Ignore.sol');
      const ignoreFile = path.join(tempDir, '.solinignore');

      await fs.writeFile(file1, 'contract Keep {}');
      await fs.writeFile(file2, 'contract Ignore {}');
      await fs.writeFile(ignoreFile, 'Ignore.sol');

      const files = await resolveFiles([tempDir], { ignorePath: ignoreFile });

      expect(files).toHaveLength(1);
      expect(files).toContain(path.resolve(file1));
      expect(files).not.toContain(path.resolve(file2));
    });

    test('should auto-load .solinignore from cwd', async () => {
      const file1 = path.join(tempDir, 'Keep.sol');
      const file2 = path.join(tempDir, 'Test.sol');
      const ignoreFile = path.join(tempDir, '.solinignore');

      await fs.writeFile(file1, 'contract Keep {}');
      await fs.writeFile(file2, 'contract Test {}');
      await fs.writeFile(ignoreFile, 'Test.sol');

      const files = await resolveFiles([tempDir], { cwd: tempDir });

      expect(files).toHaveLength(1);
      expect(files).toContain(path.resolve(file1));
      expect(files).not.toContain(path.resolve(file2));
    });

    test('should support glob patterns in ignore file', async () => {
      const file1 = path.join(tempDir, 'Keep.sol');
      const file2 = path.join(tempDir, 'test_file.sol');
      const file3 = path.join(tempDir, 'test_another.sol');
      const ignoreFile = path.join(tempDir, '.solinignore');

      await fs.writeFile(file1, 'contract Keep {}');
      await fs.writeFile(file2, 'contract Test1 {}');
      await fs.writeFile(file3, 'contract Test2 {}');
      await fs.writeFile(ignoreFile, 'test_*.sol');

      const files = await resolveFiles([tempDir], { ignorePath: ignoreFile });

      expect(files).toHaveLength(1);
      expect(files).toContain(path.resolve(file1));
      expect(files).not.toContain(path.resolve(file2));
      expect(files).not.toContain(path.resolve(file3));
    });

    test('should ignore directories based on patterns', async () => {
      const contractsDir = path.join(tempDir, 'contracts');
      const mockDir = path.join(tempDir, 'mocks');
      await fs.mkdir(contractsDir);
      await fs.mkdir(mockDir);

      const mainFile = path.join(contractsDir, 'Main.sol');
      const mockFile = path.join(mockDir, 'Mock.sol');
      const ignoreFile = path.join(tempDir, '.solinignore');

      await fs.writeFile(mainFile, 'contract Main {}');
      await fs.writeFile(mockFile, 'contract Mock {}');
      await fs.writeFile(ignoreFile, 'mocks');

      const files = await resolveFiles([tempDir], { ignorePath: ignoreFile });

      expect(files).toHaveLength(1);
      expect(files).toContain(path.resolve(mainFile));
      expect(files).not.toContain(path.resolve(mockFile));
    });
  });

  describe('loadIgnorePatterns', () => {
    test('should load patterns from file', async () => {
      const ignoreFile = path.join(tempDir, '.solinignore');
      await fs.writeFile(ignoreFile, 'pattern1\npattern2\npattern3');

      const patterns = await loadIgnorePatterns(ignoreFile);

      expect(patterns).toHaveLength(3);
      expect(patterns).toContain('pattern1');
      expect(patterns).toContain('pattern2');
      expect(patterns).toContain('pattern3');
    });

    test('should ignore comments', async () => {
      const ignoreFile = path.join(tempDir, '.solinignore');
      await fs.writeFile(ignoreFile, '# This is a comment\npattern1\n# Another comment\npattern2');

      const patterns = await loadIgnorePatterns(ignoreFile);

      expect(patterns).toHaveLength(2);
      expect(patterns).toContain('pattern1');
      expect(patterns).toContain('pattern2');
    });

    test('should ignore empty lines', async () => {
      const ignoreFile = path.join(tempDir, '.solinignore');
      await fs.writeFile(ignoreFile, 'pattern1\n\n\npattern2\n');

      const patterns = await loadIgnorePatterns(ignoreFile);

      expect(patterns).toHaveLength(2);
      expect(patterns).toContain('pattern1');
      expect(patterns).toContain('pattern2');
    });

    test('should return empty array for non-existent file', async () => {
      const patterns = await loadIgnorePatterns(path.join(tempDir, 'nonexistent'));

      expect(patterns).toHaveLength(0);
    });

    test('should trim whitespace', async () => {
      const ignoreFile = path.join(tempDir, '.solinignore');
      await fs.writeFile(ignoreFile, '  pattern1  \n  pattern2  ');

      const patterns = await loadIgnorePatterns(ignoreFile);

      expect(patterns).toHaveLength(2);
      expect(patterns).toContain('pattern1');
      expect(patterns).toContain('pattern2');
    });
  });

  describe('shouldIgnoreFile', () => {
    test('should match exact filename', () => {
      const result = shouldIgnoreFile('/project/Test.sol', ['Test.sol'], '/project');

      expect(result).toBe(true);
    });

    test('should match glob pattern', () => {
      const result = shouldIgnoreFile('/project/test_file.sol', ['test_*.sol'], '/project');

      expect(result).toBe(true);
    });

    test('should not match non-matching file', () => {
      const result = shouldIgnoreFile('/project/Main.sol', ['Test.sol'], '/project');

      expect(result).toBe(false);
    });

    test('should match nested path patterns', () => {
      const result = shouldIgnoreFile('/project/mocks/Mock.sol', ['mocks/**'], '/project');

      expect(result).toBe(true);
    });

    test('should match directory patterns', () => {
      const result = shouldIgnoreFile('/project/mocks', ['mocks'], '/project');

      expect(result).toBe(true);
    });
  });
});
