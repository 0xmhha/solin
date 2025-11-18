#!/usr/bin/env node

/**
 * Solin CLI Entry Point
 */

import { CLI } from './cli';

async function main(): Promise<void> {
  const cli = new CLI();
  const exitCode = await cli.run(process.argv);
  process.exit(exitCode);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(2);
});
