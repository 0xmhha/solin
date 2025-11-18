/**
 * Tests for File Resolver
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { resolveFiles } from '@cli/file-resolver';

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
  });
});
