/**
 * File Resolver
 *
 * Resolves file patterns and globs to actual file paths
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { minimatch } from 'minimatch';

/**
 * Options for file resolution
 */
export interface ResolveFilesOptions {
  /**
   * Current working directory
   */
  cwd?: string;

  /**
   * Path to ignore file (like .solinignore)
   */
  ignorePath?: string;

  /**
   * Additional patterns to ignore
   */
  ignorePatterns?: string[];
}

/**
 * Load ignore patterns from a file
 *
 * @param ignorePath - Path to the ignore file
 * @returns Array of ignore patterns
 */
export async function loadIgnorePatterns(ignorePath: string): Promise<string[]> {
  try {
    const content = await fs.readFile(ignorePath, 'utf-8');
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch {
    return [];
  }
}

/**
 * Check if a file should be ignored based on patterns
 *
 * @param filePath - File path to check
 * @param ignorePatterns - Array of ignore patterns
 * @param basePath - Base path for relative matching
 * @returns True if the file should be ignored
 */
export function shouldIgnoreFile(
  filePath: string,
  ignorePatterns: string[],
  basePath: string = process.cwd()
): boolean {
  const relativePath = path.relative(basePath, filePath);

  for (const pattern of ignorePatterns) {
    // Match against both the relative path and the basename
    if (minimatch(relativePath, pattern, { dot: true }) ||
        minimatch(path.basename(filePath), pattern, { dot: true }) ||
        minimatch(relativePath, `**/${pattern}`, { dot: true })) {
      return true;
    }
  }

  return false;
}

/**
 * Resolve file patterns to actual Solidity file paths
 *
 * @param patterns - File patterns or glob patterns
 * @param options - Resolution options (can also be a string for backward compatibility)
 * @returns Array of resolved file paths
 */
export async function resolveFiles(
  patterns: string[],
  options: ResolveFilesOptions | string = {},
): Promise<string[]> {
  // Handle backward compatibility
  const opts: ResolveFilesOptions = typeof options === 'string'
    ? { cwd: options }
    : options;

  const cwd = opts.cwd || process.cwd();

  // Load ignore patterns
  let ignorePatterns: string[] = [...(opts.ignorePatterns || [])];

  // Load from ignore file if specified
  if (opts.ignorePath) {
    const ignoreFilePath = path.isAbsolute(opts.ignorePath)
      ? opts.ignorePath
      : path.join(cwd, opts.ignorePath);
    const filePatterns = await loadIgnorePatterns(ignoreFilePath);
    ignorePatterns = [...ignorePatterns, ...filePatterns];
  }

  // Try to load default .solinignore if no ignore path specified
  if (!opts.ignorePath) {
    const defaultIgnorePath = path.join(cwd, '.solinignore');
    const defaultPatterns = await loadIgnorePatterns(defaultIgnorePath);
    ignorePatterns = [...ignorePatterns, ...defaultPatterns];
  }
  const files = new Set<string>();

  for (const pattern of patterns) {
    const resolvedPattern = path.isAbsolute(pattern) ? pattern : path.join(cwd, pattern);

    // Check if it's a direct file path
    try {
      const stat = await fs.stat(resolvedPattern);

      if (stat.isFile()) {
        if (isSolidityFile(resolvedPattern)) {
          const resolved = path.resolve(resolvedPattern);
          if (!shouldIgnoreFile(resolved, ignorePatterns, cwd)) {
            files.add(resolved);
          }
        }
        continue;
      }

      if (stat.isDirectory()) {
        // If directory, recursively find all .sol files
        const dirFiles = await findSolidityFiles(resolvedPattern, ignorePatterns, cwd);
        dirFiles.forEach((file) => files.add(file));
        continue;
      }
    } catch {
      // Not a direct file/directory, treat as glob pattern
    }

    // Try as glob pattern
    const matches = await glob(pattern, {
      cwd,
      absolute: true,
      nodir: true,
    });

    matches.forEach((match) => {
      if (isSolidityFile(match)) {
        const resolved = path.resolve(match);
        if (!shouldIgnoreFile(resolved, ignorePatterns, cwd)) {
          files.add(resolved);
        }
      }
    });
  }

  return Array.from(files).sort();
}

/**
 * Check if file is a Solidity file
 */
function isSolidityFile(filePath: string): boolean {
  return filePath.endsWith('.sol');
}

/**
 * Recursively find all Solidity files in a directory
 */
async function findSolidityFiles(
  dir: string,
  ignorePatterns: string[] = [],
  basePath: string = process.cwd()
): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      // Skip common ignored directories
      if (entry.isDirectory()) {
        const dirName = entry.name;
        if (dirName === 'node_modules' || dirName === '.git' || dirName === 'dist') {
          continue;
        }
        // Check if directory should be ignored
        if (shouldIgnoreFile(fullPath, ignorePatterns, basePath)) {
          continue;
        }
        await walk(fullPath);
      } else if (entry.isFile() && isSolidityFile(fullPath)) {
        const resolved = path.resolve(fullPath);
        if (!shouldIgnoreFile(resolved, ignorePatterns, basePath)) {
          files.push(resolved);
        }
      }
    }
  }

  await walk(dir);
  return files;
}
