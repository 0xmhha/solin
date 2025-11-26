# Solin - Advanced Solidity Analyzer

<p align="center">
  <img src="docs/assets/logo.png" alt="Solin Logo" width="200" height="200">
</p>

<p align="center">
  <strong>A comprehensive, high-performance Solidity static analysis tool combining linting and security detection</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#custom-rules">Custom Rules</a> •
  <a href="#configuration">Configuration</a>
</p>

---

## Features

### Core Capabilities

- **152 Rules Total**: 55 lint rules + 96 security detectors + 1 custom project naming rule
- **Multi-Protocol API**: REST, WebSocket, gRPC, and MCP servers
- **AI Platform Integration**: Claude Desktop, ChatGPT, Gemini support
- **Security Analysis**: Comprehensive vulnerability detection (reentrancy, overflow, access control, etc.)
- **Code Quality**: Naming conventions, complexity limits, gas optimization, code style
- **Fast Analysis**: Analyze contracts in ~170ms with parallel processing
- **Multiple Output Formats**: JSON, SARIF, Stylish, Markdown, JUnit, HTML, Checkstyle
- **Configurable Rules**: Enable/disable rules via .solinrc.json
- **Auto-Fix Capabilities**: Automatic code fixes for common issues
- **CI/CD Ready**: GitHub Actions, GitLab CI, Jenkins integration

### Analysis Categories

#### Security Analysis (96 rules)

**High Severity:**
- Reentrancy vulnerabilities (classic, read-only, cross-function)
- Integer overflow/underflow
- Unchecked external calls
- Unprotected selfdestruct
- Storage collision
- Access control issues

**Medium Severity:**
- Timestamp dependence
- Weak randomness
- Locked ether
- Missing events
- Incorrect equality checks
- Delegatecall risks

#### Lint Analysis (55 rules)

- **Code Style**: Indentation, line length, bracket alignment, quotes
- **Best Practices**: Visibility modifiers, state mutability, magic numbers
- **Naming Conventions**: Contract, function, and variable naming
- **Gas Optimization**: Array length caching, storage packing, custom errors

#### Custom Project Rules (1 rule)

- **Project Naming Convention**: Enforces project-specific naming standards

## Installation

### From source

```bash
git clone https://github.com/aspect-labs/solin.git
cd solin
npm install
npm run build
```

## Usage

### Quick Start

```bash
# Build the project
npm run build

# Analyze your contracts
node dist/cli.js contracts/MyToken.sol

# Analyze with configuration file
node dist/cli.js -c .solinrc.json contracts/*.sol

# List available rules
node dist/cli.js list-rules
```

### Basic Usage

```bash
# Analyze specific files
node dist/cli.js contracts/MyToken.sol contracts/NFT.sol

# Analyze with glob pattern
node dist/cli.js 'contracts/**/*.sol'

# Analyze directory
node dist/cli.js contracts/
```

### Advanced Options

```bash
# Parallel analysis with 4 workers
node dist/cli.js --parallel 4 contracts/

# Enable auto-fix
node dist/cli.js --fix contracts/

# Dry run (show what would be fixed)
node dist/cli.js --fix --dry-run contracts/

# Output to JSON
node dist/cli.js -f json contracts/

# Generate SARIF for GitHub Code Scanning
node dist/cli.js -f sarif contracts/

# Cache results for faster subsequent runs
node dist/cli.js --cache contracts/

# Watch mode for continuous analysis
node dist/cli.js -w contracts/

# Errors only (quiet mode)
node dist/cli.js -q contracts/
```

## Custom Rules

### Project Naming Convention (`custom/project-naming-convention`)

This rule enforces project-specific naming conventions for Solidity code:

| Target | Convention | Example |
|--------|------------|---------|
| Stack variables (params, locals) | `_` prefix | `_amount`, `_from`, `_to` |
| Private/internal state variables | `__` prefix | `__owner`, `__balances` |
| Constant/immutable variables | UPPER_SNAKE_CASE | `DOMAIN_SEPARATOR`, `MAX_SUPPLY` |
| Private/internal functions | `_` prefix | `_validateOwner()`, `_transfer()` |
| Public/external functions | No prefix | `transfer()`, `balanceOf()` |
| Naming conflicts | `_` suffix | `_balance_` (when conflicts with state) |

#### Example

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MyContract {
    // Constants: UPPER_SNAKE_CASE
    uint256 public constant MAX_SUPPLY = 1000000;

    // Private state: double underscore prefix
    address private __owner;
    mapping(address => uint256) private __balances;

    // Public state: no prefix
    uint256 public totalSupply;

    // Private function: single underscore prefix
    function _validateOwner(address _caller) internal view returns (bool) {
        return _caller == __owner;
    }

    // Public function: no prefix, params with underscore
    function transfer(address _to, uint256 _amount) public returns (bool) {
        require(_validateOwner(msg.sender), "Not owner");
        __balances[_to] += _amount;
        return true;
    }

    // Handling naming conflicts: use suffix
    function _updateBalance(address _account, uint256 _balance_) internal {
        __balances[_account] = _balance_;
    }
}
```

#### Inherited Libraries (e.g., OpenZeppelin)

- Keep original names when inheriting from external libraries
- Do not rename parent contract variables or functions to maintain override compatibility
- Apply these naming rules only to project-owned contracts

## Configuration

### Initialize Configuration

```bash
node dist/cli.js init
```

This creates a `.solinrc.json` file.

### Configuration File Example

```json
{
  "rules": {
    "security/tx-origin": "error",
    "security/reentrancy": "error",
    "security/unchecked-calls": "error",
    "security/unchecked-send": "warning",
    "security/timestamp-dependence": "warning",
    "security/missing-zero-check": "warning",
    "security/floating-pragma": "warning",
    "security/unprotected-ether-withdrawal": "warning",
    "security/uninitialized-state": "warning",

    "lint/unused-state-variables": "warning",
    "lint/visibility-modifiers": "warning",

    "custom/project-naming-convention": "warning"
  },
  "ignorePatterns": [
    "**/test/**",
    "**/*.t.sol",
    "**/mock/**",
    "**/Mock*.sol"
  ]
}
```

### Rule Severity Levels

| Level | Value | Description |
|-------|-------|-------------|
| Off | `"off"` or `0` | Disable the rule |
| Warning | `"warning"` or `1` | Report as warning |
| Error | `"error"` or `2` | Report as error |

### Ignoring Files

Create a `.solinignore` file in your project root:

```
# Ignore test files
test/**
*.test.sol

# Ignore mock contracts
mocks/**

# Ignore dependencies
node_modules/**
lib/**
```

## Output Formats

| Format | Flag | Description |
|--------|------|-------------|
| Stylish | `-f stylish` | Human-readable colored output (default) |
| JSON | `-f json` | Machine-readable JSON |
| SARIF | `-f sarif` | GitHub Code Scanning compatible |
| Markdown | `-f markdown` | Documentation friendly |
| HTML | `-f html` | Browser viewable report |
| JUnit | `-f junit` | CI/CD test report format |

## CI/CD Integration

### GitHub Actions

```yaml
name: Solidity Analysis
on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install Solin
        run: |
          git clone https://github.com/aspect-labs/solin.git
          cd solin && npm install && npm run build
      - name: Run Analysis
        run: node solin/dist/cli.js -c .solinrc.json contracts/
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
