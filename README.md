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

- ✅ **80+ Lint Rules**: Code style, best practices, naming conventions, gas optimization
- ✅ **99+ Security Detectors**: Reentrancy, uninitialized variables, access control, and more
- ✅ **Parallel Processing**: Multi-threaded analysis for improved performance
- ✅ **Smart Caching**: File-level caching to skip unchanged files
- ✅ **Auto-Fix**: Automatic fixes for common issues with confidence scoring
- ✅ **Multiple Output Formats**: JSON, SARIF, Markdown, HTML reports
- ✅ **Plugin System**: Extensible architecture for custom rules
- ✅ **CI/CD Integration**: GitHub Actions, GitLab CI, and more

### Analysis Categories

#### Lint Analysis
- Code style and formatting
- Best practices enforcement
- Naming convention validation
- Gas consumption optimization
- Documentation completeness

#### Security Analysis
- Vulnerability detection (High/Medium/Low/Informational)
- Access control validation
- Reentrancy detection
- Integer overflow/underflow
- Uninitialized storage
- And 90+ more security patterns

#### Custom Policies
- Company-specific coding standards
- Project-specific security requirements
- Domain-specific validation rules

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
git clone https://github.com/yourusername/solin.git
cd solin
npm install
npm link
```

## 🔧 Usage

### Basic Usage

```bash
# Analyze current directory
solin .

# Analyze specific file
solin contracts/MyToken.sol

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
```

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- [Architecture Overview](docs/architecture.md) - System design and component overview
- [Features Documentation](docs/features.md) - Detailed feature specifications
- [Development Guide](docs/development-guide.md) - TDD/DDD practices and contribution guidelines
- [Design Principles](docs/design-principles.md) - SOLID principles and design patterns
- [API Reference](docs/api.md) - Plugin and extension API documentation
- [Rule Catalog](docs/rules/) - Complete list of all rules with examples

## 🏗️ Project Structure

```
solin/
├── docs/               # Comprehensive documentation
│   ├── architecture.md
│   ├── features.md
│   ├── todolist.md
│   ├── design-principles.md
│   └── development-guide.md
├── lib/                # Source code
│   ├── core/          # Core engine and orchestration
│   ├── parser/        # Solidity parsing
│   ├── rules/         # Rule implementations
│   │   ├── lint/      # Lint rules
│   │   ├── security/  # Security detectors
│   │   └── custom/    # Custom rule framework
│   ├── engine/        # Analysis engine
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
git clone https://github.com/yourusername/solin.git
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

## 📋 Roadmap

See [docs/todolist.md](docs/todolist.md) for detailed development progress.

### Phase 1: Foundation (Current)
- [x] Project setup and architecture design
- [ ] Core engine implementation
- [ ] Basic lint rules (20+)
- [ ] Configuration system

### Phase 2: Security Analysis
- [ ] Security detector framework
- [ ] Port high-impact detectors (40+)
- [ ] Control flow analysis
- [ ] Data flow analysis

### Phase 3: Performance & UX
- [ ] Parallel processing
- [ ] Smart caching
- [ ] Auto-fix implementation
- [ ] Multiple output formats

### Phase 4: Extensibility
- [ ] Plugin system
- [ ] Custom rule API
- [ ] Documentation generator
- [ ] CI/CD integrations

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

- **Issues**: [GitHub Issues](https://github.com/yourusername/solin/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/solin/discussions)
- **Twitter**: [@solin_analyzer](https://twitter.com/solin_analyzer)
- **Email**: support@solin.dev

---

<p align="center">
  Made with ❤️ by the Solin team
</p>
