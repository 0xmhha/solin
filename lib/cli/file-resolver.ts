/**
 * File Resolver
 *
 * Resolves file patterns and globs to actual file paths
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

/**
 * Resolve file patterns to actual Solidity file paths
 *
 * @param patterns - File patterns or glob patterns
 * @param cwd - Current working directory
 * @returns Array of resolved file paths
 */
export async function resolveFiles(
  patterns: string[],
  cwd: string = process.cwd(),
): Promise<string[]> {
  const files = new Set<string>();

  for (const pattern of patterns) {
    const resolvedPattern = path.isAbsolute(pattern) ? pattern : path.join(cwd, pattern);

    // Check if it's a direct file path
    try {
      const stat = await fs.stat(resolvedPattern);

      if (stat.isFile()) {
        if (isSolidityFile(resolvedPattern)) {
          files.add(path.resolve(resolvedPattern));
        }
        continue;
      }

      if (stat.isDirectory()) {
        // If directory, recursively find all .sol files
        const dirFiles = await findSolidityFiles(resolvedPattern);
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
        files.add(path.resolve(match));
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
async function findSolidityFiles(dir: string): Promise<string[]> {
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
        await walk(fullPath);
      } else if (entry.isFile() && isSolidityFile(fullPath)) {
        files.push(path.resolve(fullPath));
      }
    }
  }

  await walk(dir);
  return files;
}
