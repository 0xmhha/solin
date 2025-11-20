#!/usr/bin/env npx ts-node

/**
 * Performance Benchmark Script
 *
 * Tests the performance of solin analysis with different configurations
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

interface BenchmarkResult {
  name: string;
  files: number;
  duration: number;
  filesPerSecond: number;
  memoryUsed: number;
}

async function generateTestFiles(count: number, dir: string): Promise<string[]> {
  const files: string[] = [];

  for (let i = 0; i < count; i++) {
    const filePath = path.join(dir, `Contract${i}.sol`);
    const content = `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

contract Contract${i} {
    uint256 public value${i};
    mapping(address => uint256) private balances${i};

    event ValueChanged${i}(uint256 oldValue, uint256 newValue);

    function setValue${i}(uint256 _value) public {
        uint256 oldValue = value${i};
        value${i} = _value;
        emit ValueChanged${i}(oldValue, _value);
    }

    function getValue${i}() public view returns (uint256) {
        return value${i};
    }

    function getBalance${i}(address account) public view returns (uint256) {
        return balances${i}[account];
    }

    function deposit${i}() public payable {
        balances${i}[msg.sender] += msg.value;
    }

    function withdraw${i}(uint256 amount) public {
        require(balances${i}[msg.sender] >= amount, "Insufficient balance");
        balances${i}[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }
}
    `;

    await fs.writeFile(filePath, content);
    files.push(filePath);
  }

  return files;
}

async function runBenchmark(
  name: string,
  args: string[],
  fileCount: number
): Promise<BenchmarkResult> {
  const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
  const command = `node "${cliPath}" ${args.map(a => `"${a}"`).join(' ')}`;

  const memBefore = process.memoryUsage().heapUsed;
  const start = performance.now();

  try {
    execSync(command, { stdio: 'pipe' });
  } catch {
    // CLI may exit with non-zero for warnings/errors, but we still measure performance
  }

  const end = performance.now();
  const memAfter = process.memoryUsage().heapUsed;

  const duration = end - start;
  const memoryUsed = (memAfter - memBefore) / 1024 / 1024; // MB

  return {
    name,
    files: fileCount,
    duration,
    filesPerSecond: (fileCount / duration) * 1000,
    memoryUsed,
  };
}

function formatResults(results: BenchmarkResult[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('BENCHMARK RESULTS');
  console.log('='.repeat(80) + '\n');

  const headers = ['Test Name', 'Files', 'Duration (ms)', 'Files/sec', 'Memory (MB)'];
  const colWidths: [number, number, number, number, number] = [30, 8, 15, 12, 12];

  // Print header
  console.log(headers.map((h, i) => h.padEnd(colWidths[i] || 10)).join(' '));
  console.log('-'.repeat(80));

  // Print results
  for (const result of results) {
    const row = [
      result.name.substring(0, 28).padEnd(colWidths[0]),
      result.files.toString().padEnd(colWidths[1]),
      result.duration.toFixed(2).padEnd(colWidths[2]),
      result.filesPerSecond.toFixed(2).padEnd(colWidths[3]),
      result.memoryUsed.toFixed(2).padEnd(colWidths[4]),
    ];
    console.log(row.join(' '));
  }

  console.log('-'.repeat(80));

  // Summary
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const avgFilesPerSec = results.reduce((sum, r) => sum + r.filesPerSecond, 0) / results.length;

  console.log(`\nAverage duration: ${avgDuration.toFixed(2)}ms`);
  console.log(`Average files/sec: ${avgFilesPerSec.toFixed(2)}`);
  console.log('\n');
}

async function main() {
  console.log('Solin Performance Benchmark');
  console.log('===========================\n');

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'solin-benchmark-'));
  const results: BenchmarkResult[] = [];

  try {
    // Test configurations
    const testCases = [
      { name: 'Small (10 files)', count: 10 },
      { name: 'Medium (50 files)', count: 50 },
      { name: 'Large (100 files)', count: 100 },
    ];

    for (const testCase of testCases) {
      const testDir = path.join(tempDir, testCase.name.replace(/[^a-zA-Z0-9]/g, '_'));
      await fs.mkdir(testDir, { recursive: true });

      console.log(`Generating ${testCase.count} test files...`);
      await generateTestFiles(testCase.count, testDir);

      // Benchmark: Sequential analysis
      console.log(`Running: ${testCase.name} - Sequential...`);
      const seqResult = await runBenchmark(
        `${testCase.name} - Sequential`,
        [testDir, '--quiet', '--parallel', '1'],
        testCase.count
      );
      results.push(seqResult);

      // Benchmark: Parallel analysis (4 workers)
      console.log(`Running: ${testCase.name} - Parallel (4)...`);
      const par4Result = await runBenchmark(
        `${testCase.name} - Parallel (4)`,
        [testDir, '--quiet', '--parallel', '4'],
        testCase.count
      );
      results.push(par4Result);

      // Benchmark: With cache (first run)
      console.log(`Running: ${testCase.name} - Cache (cold)...`);
      const cacheColdResult = await runBenchmark(
        `${testCase.name} - Cache (cold)`,
        [testDir, '--quiet', '--cache'],
        testCase.count
      );
      results.push(cacheColdResult);

      // Benchmark: With cache (second run)
      console.log(`Running: ${testCase.name} - Cache (warm)...`);
      const cacheWarmResult = await runBenchmark(
        `${testCase.name} - Cache (warm)`,
        [testDir, '--quiet', '--cache'],
        testCase.count
      );
      results.push(cacheWarmResult);
    }

    formatResults(results);
  } finally {
    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch(console.error);
