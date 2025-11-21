#!/usr/bin/env node
/**
 * ESBuild configuration for Solin
 *
 * Provides separate dev and production builds with:
 * - Source maps (dev only)
 * - Minification (prod only)
 * - Bundle size optimization
 * - Fast build times (< 5s)
 */

const esbuild = require('esbuild');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const mode =
  args.includes('--prod') || args.includes('--production') ? 'production' : 'development';
const watch = args.includes('--watch');

// Common build options
const commonOptions = {
  entryPoints: {
    cli: 'lib/cli/index.ts',
    index: 'lib/index.ts',
  },
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outdir: 'dist',

  // External dependencies that should not be bundled
  external: [
    '@solidity-parser/parser',
    'chalk',
    'commander',
    'cosmiconfig',
    'glob',
    'ignore',
    'ajv',
  ],

  // Always define NODE_ENV for conditional code
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },

  // Log settings
  logLevel: 'info',
  color: true,
};

// Development-specific options
const devOptions = {
  ...commonOptions,
  sourcemap: 'inline',
  minify: false,
  keepNames: true,

  // Generate declaration files separately via tsc
  metafile: true,
};

// Production-specific options
const prodOptions = {
  ...commonOptions,
  sourcemap: 'external', // Generate .map files
  minify: true,
  minifyWhitespace: true,
  minifyIdentifiers: true,
  minifySyntax: true,
  treeShaking: true,

  // Optimize for production
  legalComments: 'none',
  keepNames: false,

  metafile: true,
};

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Analyze and display build results
 */
function analyzeBuild(result, buildTime) {
  if (!result.metafile) return;

  console.log('\n📊 Build Analysis:');
  console.log('─'.repeat(50));

  const outputs = Object.entries(result.metafile.outputs);
  let totalSize = 0;

  outputs.forEach(([file, info]) => {
    if (file.endsWith('.map')) return; // Skip source maps

    totalSize += info.bytes;
    const relPath = path.relative(process.cwd(), file);
    console.log(`  ${relPath.padEnd(30)} ${formatBytes(info.bytes).padStart(12)}`);
  });

  console.log('─'.repeat(50));
  console.log(`  Total bundle size:             ${formatBytes(totalSize).padStart(12)}`);
  console.log(`  Build time:                    ${buildTime.toFixed(2)}ms`.padStart(44));
  console.log('');
}

/**
 * Ensure dist directory exists
 */
function ensureDistDir() {
  const distDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
}

/**
 * Make CLI executable
 */
function makeExecutable() {
  const cliPath = path.join(process.cwd(), 'dist', 'cli.js');
  if (fs.existsSync(cliPath)) {
    fs.chmodSync(cliPath, 0o755);

    // Add shebang if not present
    const content = fs.readFileSync(cliPath, 'utf8');
    if (!content.startsWith('#!/usr/bin/env node')) {
      fs.writeFileSync(cliPath, '#!/usr/bin/env node\n' + content);
    }
  }
}

/**
 * Main build function
 */
async function build() {
  const startTime = performance.now();
  const options = mode === 'production' ? prodOptions : devOptions;

  console.log(`\n🔨 Building Solin (${mode} mode)...\n`);

  try {
    ensureDistDir();

    if (watch) {
      console.log('👀 Watch mode enabled - watching for changes...\n');

      const context = await esbuild.context(options);
      await context.watch();

      console.log('✅ Initial build complete. Watching for changes...\n');
    } else {
      const result = await esbuild.build(options);
      const buildTime = performance.now() - startTime;

      makeExecutable();

      console.log(`✅ Build complete!`);
      analyzeBuild(result, buildTime);

      // Verify build time requirement (< 5s)
      if (buildTime > 5000) {
        console.warn(`⚠️  Build time (${buildTime.toFixed(2)}ms) exceeds 5s target`);
      }
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Run build
build().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
