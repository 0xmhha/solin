# Solin GitHub Actions Integration

Run Solin static analysis on your Solidity smart contracts directly in your GitHub CI/CD pipeline.

> **Note**: The `0xmhha/solin` GitHub Action is planned for future releases. Currently, use the CLI-based approach shown below. The `solin` CLI command will be available after the package is published to npm.

## Features

- Automatic analysis on push and pull requests
- SARIF upload for GitHub Code Scanning
- Configurable severity thresholds
- Multiple output formats
- Fail on errors or warnings
- PR comments with analysis results

## Quick Start (CLI)

For local development or when the action is not yet published:

```yaml
name: Solin Analysis

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install Solin
        run: npm install -g solin

      - name: Run Solin Analysis
        run: solin contracts --format sarif --output solin-results.sarif

      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: solin-results.sarif
```

## CLI Options

Solin provides several command-line options for CI/CD integration:

| Option            | Description                               | Example                        |
| ----------------- | ----------------------------------------- | ------------------------------ |
| `--format`        | Output format                             | `--format sarif`               |
| `--output`        | Output file path                          | `--output results.sarif`       |
| `--config`        | Configuration file                        | `--config .solinrc.json`       |
| `--max-warnings`  | Maximum warnings allowed before exit(1)   | `--max-warnings 0`             |
| `--fix`           | Auto-fix issues                           | `--fix`                        |
| `--parallel`      | Number of parallel workers                | `--parallel 4`                 |

## Examples

### Basic Usage

```yaml
- name: Run Solin
  run: solin contracts
```

### With Configuration File

```yaml
- name: Run Solin
  run: solin contracts --config .solinrc.json
```

### GitHub Code Scanning Integration

```yaml
- name: Analyze with Solin
  run: solin contracts --format sarif --output solin-results.sarif

- name: Upload to Code Scanning
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: solin-results.sarif
```

This will upload results to GitHub's Security tab under "Code scanning alerts".

### Strict Mode (Fail on Warnings)

```yaml
- name: Run Solin (strict)
  run: solin contracts --max-warnings 0
```

### Custom Output Format

```yaml
- name: Run Solin
  run: solin contracts --format json --output results.json
```

### Multiple Paths

```yaml
- name: Run Solin
  run: solin contracts src/solidity lib
```

## Required Permissions

```yaml
permissions:
  contents: read # To checkout code
  security-events: write # To upload SARIF results
```

## Using with Monorepos

```yaml
jobs:
  analyze:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: [contracts-a, contracts-b]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install Solin
        run: npm install -g solin

      - name: Analyze ${{ matrix.package }}
        working-directory: packages/${{ matrix.package }}
        run: solin contracts --format sarif --output ../../solin-${{ matrix.package }}.sarif

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: solin-${{ matrix.package }}.sarif
```

## Caching

Speed up your workflow by caching npm packages:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '18'
    cache: 'npm'
    cache-dependency-path: 'package-lock.json'

- name: Install Solin
  run: npm install -g solin
```

## Troubleshooting

### Command Not Found

Ensure you have installed Solin before running it:

```yaml
- name: Install Solin
  run: npm install -g solin
```

### SARIF Upload Fails

Make sure you have the `security-events: write` permission:

```yaml
permissions:
  security-events: write
```

### Analysis Fails

Check that your Solidity files are valid and the path is correct:

```yaml
- name: List contracts
  run: ls -la contracts

- name: Run Solin
  run: solin contracts
```

## License

MIT License
