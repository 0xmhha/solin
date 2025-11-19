# Solin GitHub Action

Run Solin static analysis on your Solidity smart contracts directly in your GitHub CI/CD pipeline.

## Features

- Automatic analysis on push and pull requests
- PR comments with analysis results
- SARIF upload for GitHub Code Scanning
- Configurable severity thresholds
- Multiple output formats

## Quick Start

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
      pull-requests: write
      security-events: write

    steps:
      - uses: actions/checkout@v4
      - uses: solin/solin-action@v1
        with:
          path: 'contracts'
          fail-on-error: 'true'
          comment-on-pr: 'true'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `path` | Path to analyze (file, directory, or glob) | No | `.` |
| `config` | Path to configuration file | No | - |
| `format` | Output format (stylish, json, sarif, html) | No | `stylish` |
| `fail-on-error` | Fail if errors are found | No | `true` |
| `fail-on-warning` | Fail if warnings are found | No | `false` |
| `comment-on-pr` | Post results as PR comment | No | `true` |
| `sarif-upload` | Upload SARIF to Code Scanning | No | `false` |
| `working-directory` | Working directory | No | `.` |
| `node-version` | Node.js version | No | `18` |

## Outputs

| Output | Description |
|--------|-------------|
| `total-issues` | Total number of issues found |
| `errors` | Number of errors |
| `warnings` | Number of warnings |
| `info` | Number of info issues |
| `sarif-file` | Path to SARIF file (if generated) |

## Examples

### Basic Usage

```yaml
- uses: solin/solin-action@v1
  with:
    path: 'contracts/**/*.sol'
```

### With Configuration File

```yaml
- uses: solin/solin-action@v1
  with:
    path: 'src'
    config: '.solinrc.json'
```

### GitHub Code Scanning Integration

```yaml
- uses: solin/solin-action@v1
  with:
    path: 'contracts'
    sarif-upload: 'true'
```

This will upload results to GitHub's Security tab under "Code scanning alerts".

### Strict Mode (Fail on Warnings)

```yaml
- uses: solin/solin-action@v1
  with:
    path: 'contracts'
    fail-on-error: 'true'
    fail-on-warning: 'true'
```

### Custom Output Format

```yaml
- uses: solin/solin-action@v1
  with:
    path: 'contracts'
    format: 'json'
```

### Multiple Paths

```yaml
- uses: solin/solin-action@v1
  with:
    path: 'contracts src/solidity lib'
```

## PR Comment

When `comment-on-pr` is enabled (default), the action will post a comment on pull requests with analysis results:

```
## ✅ Solin Analysis Results

| Severity | Count |
|----------|-------|
| 🔴 Errors | 0 |
| 🟡 Warnings | 3 |
| 🔵 Info | 5 |
| **Total** | **8** |

Please review the issues above and fix them before merging.
```

The comment is automatically updated on subsequent pushes to the same PR.

## Required Permissions

```yaml
permissions:
  contents: read          # To checkout code
  pull-requests: write    # To post PR comments
  security-events: write  # To upload SARIF results
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
      - uses: solin/solin-action@v1
        with:
          working-directory: packages/${{ matrix.package }}
          path: 'contracts'
```

## Caching

The action uses npm to install Solin. To cache dependencies:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '18'
    cache: 'npm'

- uses: solin/solin-action@v1
  with:
    path: 'contracts'
```

## Troubleshooting

### Action Fails with "Command not found"

Ensure you're using a compatible Node.js version (16+).

### SARIF Upload Fails

Make sure you have the `security-events: write` permission.

### No PR Comment

Verify:
1. `comment-on-pr: 'true'` is set
2. `pull-requests: write` permission is granted
3. The workflow is triggered by a pull request event

## License

MIT License
