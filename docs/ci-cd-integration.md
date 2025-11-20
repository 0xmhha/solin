# CI/CD Integration Guide

This guide explains how to integrate Solin into your CI/CD pipelines for automated Solidity analysis.

## Table of Contents

- [Overview](#overview)
- [GitHub Actions](#github-actions)
- [GitLab CI/CD](#gitlab-cicd)
- [CircleCI](#circleci)
- [Azure DevOps](#azure-devops)
- [Jenkins](#jenkins)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Integrating Solin into your CI/CD pipeline helps:

- Catch security vulnerabilities early
- Enforce code quality standards
- Generate compliance reports
- Prevent issues from reaching production

### Basic Integration Pattern

All CI/CD integrations follow a similar pattern:

1. **Install Solin**: `npm install -g solin`
2. **Run Analysis**: `solin contracts/ --format <format>`
3. **Process Results**: Check exit codes, parse reports
4. **Report/Fail**: Comment on PRs, fail builds, upload artifacts

### Exit Codes

| Code | Meaning                       |
| ---- | ----------------------------- |
| 0    | Success (no errors)           |
| 1    | Errors found                  |
| 2    | Invalid usage or parse errors |

### Output Formats

| Format    | Use Case                             |
| --------- | ------------------------------------ |
| `stylish` | Human-readable console output        |
| `json`    | Programmatic processing, artifacts   |
| `sarif`   | GitHub Security tab, IDE integration |
| `html`    | Shareable reports, dashboards        |

## GitHub Actions

### Basic Workflow

```yaml
name: Solin Analysis

on: [push, pull_request]

jobs:
  solin:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm install -g solin
      - run: solin contracts/ --format stylish
```

### With SARIF Upload

```yaml
- name: Run Solin
  run: solin contracts/ --format sarif > solin.sarif

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: solin.sarif
```

### PR Comments

See `examples/workflows/github-actions-advanced.yml` for a complete example with PR comments.

### Example Files

- `examples/workflows/solin-analysis.yml` - Basic workflow
- `examples/workflows/github-actions-advanced.yml` - Advanced with SARIF, PR comments, diff analysis

## GitLab CI/CD

### Basic Configuration

```yaml
solin:lint:
  image: node:18
  script:
    - npm install -g solin
    - solin contracts/ --format stylish
```

### With Code Quality Report

```yaml
solin:report:
  image: node:18
  script:
    - npm install -g solin
    - solin contracts/ --format json > solin-report.json
  artifacts:
    reports:
      codequality: solin-report.json
```

### Security Scanning (SAST)

```yaml
solin:security:
  script:
    - solin contracts/ --format sarif > gl-sast-report.json
  artifacts:
    reports:
      sast: gl-sast-report.json
```

### Example File

- `examples/workflows/gitlab-ci.yml` - Complete GitLab CI configuration

## CircleCI

### Basic Job

```yaml
version: 2.1

jobs:
  solin-lint:
    docker:
      - image: cimg/node:18.19
    steps:
      - checkout
      - run: npm install -g solin
      - run: solin contracts/
```

### With Artifacts

```yaml
- run:
    name: Generate Report
    command: |
      mkdir -p reports
      solin contracts/ --format json > reports/solin.json
- store_artifacts:
    path: reports
```

### Example File

- `examples/workflows/circleci-config.yml` - Complete CircleCI configuration with workflows

## Azure DevOps

### Basic Pipeline

```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'
  - script: npm install -g solin
  - script: solin contracts/
```

### Multi-Stage Pipeline

```yaml
stages:
  - stage: Lint
    jobs:
      - job: SolinLint
        steps:
          - script: solin contracts/

  - stage: Security
    dependsOn: Lint
    jobs:
      - job: SecurityScan
        steps:
          - script: solin contracts/ --format sarif > solin.sarif
```

### Example File

- `examples/workflows/azure-pipelines.yml` - Complete Azure DevOps pipeline

## Jenkins

### Declarative Pipeline

```groovy
pipeline {
    agent any
    tools {
        nodejs '18'
    }
    stages {
        stage('Lint') {
            steps {
                sh 'npm install -g solin'
                sh 'solin contracts/'
            }
        }
    }
}
```

### With HTML Publisher

```groovy
post {
    always {
        publishHTML(target: [
            reportDir: 'reports',
            reportFiles: 'solin-report.html',
            reportName: 'Solin Report'
        ])
    }
}
```

### Example File

- `examples/workflows/Jenkinsfile` - Complete Jenkins pipeline

## Best Practices

### 1. Fail Fast on Security Issues

```bash
# Fail if any security errors
solin contracts/ --max-warnings 0
```

### 2. Cache Dependencies

```yaml
# GitHub Actions
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

### 3. Analyze Only Changed Files

```bash
# Get changed .sol files
CHANGED=$(git diff --name-only origin/main | grep '\.sol$')
solin $CHANGED
```

### 4. Use Configuration Files

Create `.solinrc.json` for consistent settings:

```json
{
  "extends": "solin:recommended",
  "rules": {
    "security/reentrancy": "error",
    "lint/no-empty-blocks": "warning"
  }
}
```

### 5. Generate Multiple Formats

```bash
# Generate all formats for different use cases
solin contracts/ --format json > report.json
solin contracts/ --format sarif > report.sarif
solin contracts/ --format html > report.html
```

### 6. Set Appropriate Timeouts

Long-running analyses should have timeouts:

```yaml
# GitHub Actions
- run: solin contracts/
  timeout-minutes: 10
```

### 7. Archive Reports

Always save reports as artifacts for debugging and compliance.

## Troubleshooting

### "solin: command not found"

Ensure Solin is installed globally:

```bash
npm install -g solin
```

Or use npx:

```bash
npx solin contracts/
```

### Exit Code 2

This indicates invalid usage or parse errors. Check:

- File paths exist
- Solidity syntax is valid
- Configuration file is valid JSON

### Large Repositories

For large codebases:

1. Use `--parallel` for parallel analysis
2. Use `--cache` for faster subsequent runs
3. Analyze only changed files in PRs

### Memory Issues

Increase Node.js memory:

```bash
NODE_OPTIONS="--max-old-space-size=4096" solin contracts/
```

### Slow Analysis

1. Enable caching: `solin contracts/ --cache`
2. Exclude test files in `.solinrc.json`
3. Use parallel workers: `solin contracts/ --parallel 4`

## Getting Help

- [Solin Documentation](https://github.com/solin/solin)
- [GitHub Issues](https://github.com/solin/solin/issues)
- [Example Workflows](../examples/workflows/)
