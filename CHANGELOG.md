# Changelog

All notable changes to Solin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-19

### Added

#### Core Features

- **Analysis Engine**: Complete static analysis engine for Solidity smart contracts
- **Rule Registry**: Centralized rule management with category-based organization
- **Parser Integration**: Solidity parser using @solidity-parser/parser
- **Configuration System**: Flexible configuration with cosmiconfig support

#### Security Rules (30+)

- Reentrancy detection
- tx.origin authentication issues
- Unchecked external calls
- Weak PRNG usage
- Arbitrary send vulnerabilities
- Selfdestruct vulnerabilities
- Timestamp dependence
- Floating pragma warnings
- Outdated compiler detection
- Missing zero-address checks
- Missing events for state changes
- Unsafe type casting
- Shadowing built-in symbols
- Controlled delegatecall
- Divide before multiply
- msg.value in loops
- Assert state changes
- Return bomb attacks
- Unprotected ether withdrawal
- And many more...

#### Lint Rules (25+)

- No empty blocks
- Naming conventions (contracts, functions, variables)
- Visibility modifiers
- State mutability
- Unused variables
- Function complexity
- Magic numbers
- Require/revert reasons
- Cache array length
- Constant/immutable usage
- Boolean equality
- Brace style
- Max line length
- Indentation
- Quotes style
- Space after comma
- No console.log
- No trailing whitespace
- And more...

#### CLI Features

- **Analyze Command**: Run analysis on files/directories with glob support
- **Init Command**: Generate configuration with multiple templates (default, strict, minimal)
- **List-Rules Command**: Display all available rules grouped by category
- **Watch Mode**: Monitor files and re-analyze on changes (`--watch`)
- **Multiple Output Formats**: stylish, JSON, SARIF, HTML
- **Exit Codes**: Proper exit codes for CI/CD integration

#### Performance Features

- **Worker Pool**: Parallel file analysis with configurable concurrency
- **Cache Manager**: File content caching with TTL and disk persistence
- **File Watcher**: Efficient file monitoring with debouncing

#### Developer Experience

- **Fix Applicator**: Auto-fix capabilities with conflict detection
- **RuleTester**: ESLint-style rule testing utility
- **RuleGenerator**: Scaffold new rules from templates
- **Plugin System**: Extensible architecture for custom rules

#### Output Formatters

- **Stylish**: Human-readable console output with colors
- **JSON**: Machine-readable output for tooling
- **SARIF**: GitHub Code Scanning compatible format
- **HTML**: Interactive reports for sharing

#### Tooling Integration

- **GitHub Action**: Composite action with PR comments and SARIF upload
- **VS Code Extension**: Real-time diagnostics and quick fixes
- **CI/CD Examples**: GitHub Actions, GitLab CI, CircleCI, Azure DevOps, Jenkins

#### Documentation

- Architecture documentation
- Rule authoring guide
- CI/CD integration guide
- Contributing guidelines
- Example plugins

### Technical Details

#### Test Coverage

- 88 test suites
- 1330+ unit tests
- 20 integration tests
- All tests passing

#### Build System

- TypeScript with strict mode
- ESBuild for fast bundling
- Path aliases for clean imports

#### Code Quality

- ESLint with TypeScript support
- Prettier for formatting
- Husky for pre-commit hooks
- Jest for testing

## [Unreleased]

### Added

- **Multi-Protocol API Support**: REST, WebSocket, gRPC, and MCP servers for remote analysis
- **AI Platform Integration**: Native support for Claude Desktop, ChatGPT, and Gemini
- **--parallel option**: Control number of parallel workers for concurrent file analysis
- **--ignore-path option**: Specify custom ignore file path (like .solinignore)
- **Auto-load .solinignore**: Automatically loads ignore patterns from .solinignore in working directory
- **Ignore pattern support**: Full glob pattern matching with minimatch for ignoring files

### Changed

- **Rule Count**: Updated to 151 total rules (55 lint + 96 security)
- **Test Suite**: Expanded to 180 test suites with 2,141 tests
- **Documentation**: Complete rewrite with accurate metrics and multi-protocol API guides

### Fixed

- **CLI Argument Parsing**: Resolved Commander.js 12 compatibility issues with file path handling
- **GitHub Actions Workflows**: Updated to trigger on master branch, fixed local build integration
- **Security Vulnerabilities**:
  - Upgraded esbuild from 0.19.11 to 0.27.0 (GHSA-67mh-4wv8-2f99)
  - Fixed glob command injection (GHSA-5j98-mcp5-4vw2)
  - Fixed js-yaml prototype pollution (GHSA-mh29-5h37-fv8m)

### Improved

- **File resolution**: Enhanced file resolver with comprehensive ignore pattern support
- **Build Performance**: Improved from 164ms to 125ms with esbuild upgrade
- **Test Coverage**: Statements 87.78%, Branches 81.44%, Functions 96.82%, Lines 89.44%
- **Documentation Quality**: Removed development artifacts, fixed inaccuracies, added API server limitations

### Planned

- Additional security detectors
- Control flow analysis
- Data flow analysis
- More IDE integrations
- Performance optimizations
- npm package publication

---

[0.1.0]: https://github.com/solin/solin/releases/tag/v0.1.0
[Unreleased]: https://github.com/solin/solin/compare/v0.1.0...HEAD
