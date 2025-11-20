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
  <a href="#documentation">Documentation</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

---

## 🎯 Project Vision

Solin is designed to be a **unified Solidity analysis platform** that combines:

- **Comprehensive Linting**: Style guide enforcement and best practices validation
- **Advanced Security Analysis**: Deep vulnerability detection inspired by industry-leading tools
- **High Performance**: Parallel processing and intelligent caching for fast analysis
- **Extensibility**: Plugin system for custom rules and company-specific policies
- **Developer Experience**: Clear diagnostics, auto-fix capabilities, and seamless CI/CD integration

## 🚀 Features

### Core Capabilities

- ✅ **59 Rules Total**: 33 security detectors + 26 lint rules
- ✅ **Security Analysis**: Reentrancy, tx.origin, unchecked calls, weak randomness, and more
- ✅ **Code Quality**: Naming conventions, complexity limits, gas optimization, code style
- ✅ **Fast Analysis**: Analyze contracts in ~170ms
- ✅ **Multiple Output Formats**: Stylish (human-readable) and JSON (machine-readable)
- ✅ **Configurable Rules**: Enable/disable rules via .solinrc.json
- ✅ **CLI Commands**: `init`, `list-rules`, and analyze commands
- ✅ **CI/CD Ready**: Exit codes and max-warnings for pipeline integration

### Analysis Categories

#### Lint Analysis
- Code style and formatting
- Best practices enforcement
- Naming convention validation
- Gas consumption optimization
- Documentation completeness

#### Security Analysis (33 rules)
- Reentrancy vulnerabilities
- tx.origin authentication bypass
- Unchecked external calls
- Weak randomness (PRNG)
- Unprotected ether withdrawal
- Missing zero-address checks
- Floating pragma versions
- Deprecated functions
- And 25+ more security patterns

## 📦 Installation

### Via npm (Recommended)

```bash
npm install -g solin
```

### Via yarn

```bash
yarn global add solin
```

### From source

```bash
git clone https://github.com/0xmhha/solin.git
cd solin
npm install
npm link
```

## 🔧 Usage

### Quick Start

```bash
# 1. Initialize configuration file
solin init

# 2. Analyze your contracts
solin contracts/MyToken.sol

# 3. List available rules
solin list-rules
```

### Basic Usage

```bash
# Analyze current directory
solin .

# Analyze specific files
solin contracts/MyToken.sol contracts/NFT.sol

# Analyze with glob pattern
solin 'contracts/**/*.sol'
```

### Configuration

Initialize a configuration file:

```bash
solin --init
```

This creates a `.solinrc.json` file:

```json
{
  "extends": "solin:recommended",
  "rules": {
    "security/reentrancy": "error",
    "lint/naming-convention": "warning",
    "custom/my-rule": "error"
  },
  "plugins": ["@company/solin-plugin"],
  "excludedFiles": ["node_modules/**", "test/**"]
}
```

### Advanced Options

```bash
# Parallel analysis with 4 workers
solin . --parallel 4

# Enable auto-fix
solin . --fix

# Dry run (show what would be fixed)
solin . --fix --dry-run

# Output to JSON
solin . --format json --output report.json

# Generate SARIF for GitHub Code Scanning
solin . --format sarif --output results.sarif

# Cache results for faster subsequent runs
solin . --cache

# Specify cache location
solin . --cache --cache-location .cache/solin

# Watch mode for continuous analysis
solin . --watch

# Custom ignore file
solin . --ignore-path .customignore
```

### Ignoring Files

Create a `.solinignore` file in your project root to exclude files from analysis:

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

The file supports:
- Glob patterns (`**/*.sol`, `test_*.sol`)
- Comments starting with `#`
- Directory patterns (`mocks/`)

See [examples/.solinignore](examples/.solinignore) for a complete example.

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- [Architecture Overview](docs/architecture.md) - System design and component overview
- [Development Guide](docs/development-guide.md) - TDD/DDD practices and contribution guidelines
- [Design Principles](docs/design-principles.md) - SOLID principles and design patterns
- [Rule Authoring Guide](docs/rule-authoring-guide.md) - How to create custom rules
- [CI/CD Integration](docs/ci-cd-integration.md) - Pipeline integration examples
- [GitHub Action](docs/github-action.md) - GitHub Actions integration

## 🏗️ Project Structure

```
solin/
├── docs/               # Comprehensive documentation
│   ├── architecture.md
│   ├── design-principles.md
│   ├── development-guide.md
│   └── rule-authoring-guide.md
├── lib/                # Source code
│   ├── core/          # Core engine and orchestration
│   ├── parser/        # Solidity parsing
│   ├── rules/         # Rule implementations
│   │   ├── lint/      # Lint rules
│   │   └── security/  # Security detectors
│   ├── plugins/       # Plugin system
│   ├── formatters/    # Output formatters
│   └── cli/           # Command-line interface
├── test/              # Test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── examples/          # Example configurations and plugins
└── package.json
```

## 🧪 Development

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0

### Setup

```bash
# Clone repository
git clone https://github.com/0xmhha/solin.git
cd solin

# Install dependencies
npm install

# Run tests
npm test

# Run in watch mode for TDD
npm run test:watch

# Build
npm run build

# Lint
npm run lint
```

### Testing Philosophy

Solin follows a **Test-Driven Development (TDD)** approach:

1. Write failing test first
2. Implement minimal code to pass
3. Refactor while keeping tests green
4. Repeat

See [Development Guide](docs/development-guide.md) for detailed practices.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Start

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Implement your changes
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'feat: add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 🔗 Related Projects

- [solhint](https://github.com/protofire/solhint) - Solidity linter (inspiration for lint rules)
- [slither](https://github.com/crytic/slither) - Security analysis tool (inspiration for detectors)
- [tlin](https://github.com/gnolang/tlin) - Gno linter (inspiration for architecture)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Note**: If you plan to port security detectors directly from Slither, please review Slither's AGPLv3 license requirements. The current implementation focuses on original implementations inspired by industry best practices.

## 🙏 Acknowledgments

- Solhint team for establishing Solidity linting patterns
- Slither/Trail of Bits for pioneering Solidity security analysis
- Tlin team for demonstrating efficient linter architecture
- The Ethereum and Solidity communities

## 📞 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/0xmhha/solin/issues)
- **Discussions**: [GitHub Discussions](https://github.com/0xmhha/solin/discussions)

---
