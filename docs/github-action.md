# Solin GitHub Actions Integration

Run Solin static analysis on your Solidity smart contracts directly in your GitHub CI/CD pipeline.

## Features

- Automatic analysis on push and pull requests
- SARIF upload for GitHub Code Scanning
- Configurable severity thresholds
- Multiple output formats
- Fail on errors or warnings
- PR comments with analysis results

## Quick Start (GitHub Action)

Add this to your repository at `.github/workflows/solin.yml`:

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
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - name: Run Solin
        uses: 0xmhha/solin@v0.1
        with:
          path: 'contracts'
          format: 'sarif'
          fail-on-error: 'true'
          fail-on-warning: 'false'
          comment-on-pr: 'true'
          sarif-upload: 'true'
```

## Quick Start (CLI Alternative)

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

## GitHub Action Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `path` | Path to analyze (file, directory, or glob pattern) | No | `.` |
| `config` | Path to configuration file | No | `` |
| `format` | Output format (stylish, json, sarif, html) | No | `stylish` |
| `fail-on-error` | Fail the action if errors are found | No | `true` |
| `fail-on-warning` | Fail the action if warnings are found | No | `false` |
| `comment-on-pr` | Post results as PR comment | No | `true` |
| `sarif-upload` | Upload SARIF results to GitHub Code Scanning | No | `false` |
| `working-directory` | Working directory for analysis | No | `.` |
| `node-version` | Node.js version to use | No | `18` |

## GitHub Action Outputs

| Output | Description |
|--------|-------------|
| `total-issues` | Total number of issues found |
| `errors` | Number of errors found |
| `warnings` | Number of warnings found |
| `info` | Number of info issues found |
| `sarif-file` | Path to generated SARIF file (if sarif-upload is true) |

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
