# Solin Quick Start Guide

Get started with Solin in 5 minutes!

## Installation

### From Source (Development)

```bash
# Clone the repository
git clone https://github.com/0xmhha/solin.git
cd solin

# Install dependencies
npm install

# Build
npm run build

# Link for local CLI usage (optional)
npm link
```

### From npm (After Publishing)

```bash
npm install -g solin
```

## Basic Usage

### Using npm scripts (Recommended for Development)

```bash
# Analyze files using npm script
npm run build && node dist/cli.js contracts/MyContract.sol

# Or after npm link
solin contracts/MyContract.sol
```

### CLI Commands

```bash
# Analyze a single file
node dist/cli.js contracts/MyContract.sol

# Analyze a directory
node dist/cli.js contracts/

# Analyze with specific format
node dist/cli.js contracts/ --format json

# Analyze with SARIF output (for CI/CD)
node dist/cli.js contracts/ --format sarif

# Initialize configuration
node dist/cli.js init

# List available rules
node dist/cli.js list-rules
```

## Configuration

Create `.solinrc.json` in your project root:

```json
{
  "rules": {
    "security/reentrancy": "error",
    "lint/naming-convention": "warning"
  }
}
```

Or use a preset:

```json
{
  "extends": "solin:recommended"
}
```

## CLI Options

| Option | Description |
|--------|-------------|
| `-c, --config <path>` | Configuration file path |
| `-f, --format <type>` | Output format (stylish, json, sarif) |
| `--fix` | Automatically fix issues |
| `--cache` | Enable caching |
| `--parallel <n>` | Number of parallel workers |
| `-q, --quiet` | Report errors only |

## CI/CD Integration

```yaml
# .github/workflows/solin.yml
name: Solin Analysis
on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/checkout@v4
        with:
          repository: 0xmhha/solin
          path: solin
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Build Solin
        run: |
          cd solin
          npm install
          npm run build
      - name: Run Analysis
        run: node solin/dist/cli.js contracts/ --format sarif > results.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: results.sarif
```

## MCP Integration (AI Assistants)

Solin supports Model Context Protocol for AI assistant integration.

### Claude Desktop

1. Build Solin: `npm run build`

2. Configure Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "solin": {
      "command": "node",
      "args": ["/absolute/path/to/solin/dist/mcp/server.js"]
    }
  }
}
```

3. Restart Claude Desktop

See [docs/mcp-integration.md](docs/mcp-integration.md) for details.

## Documentation

- [CI/CD Integration](docs/ci-cd-integration.md)
- [MCP Integration](docs/mcp-integration.md)
- [Rule Authoring Guide](docs/rule-authoring-guide.md)
- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md) - Planned features including REST API, WebSocket, gRPC servers

## Available Commands

```bash
node dist/cli.js <files>           # Analyze files (default)
node dist/cli.js init              # Generate configuration file
node dist/cli.js list-rules        # List all available rules
node dist/cli.js generate-rule     # Generate a custom rule template
```

## Support

- **GitHub**: https://github.com/0xmhha/solin
- **Issues**: https://github.com/0xmhha/solin/issues

## License

MIT - see [LICENSE](LICENSE)
