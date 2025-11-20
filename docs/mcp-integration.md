# MCP Integration Guide

This guide explains how to use Solin with ChatGPT, Claude, and other AI assistants through the Model Context Protocol (MCP).

## What is MCP?

Model Context Protocol (MCP) is a standard that allows AI assistants to securely connect to external tools and data sources. By running Solin as an MCP server, you can analyze Solidity code directly from your AI assistant conversations.

## Features

- **Analyze Solidity Code**: Get instant analysis of smart contracts with detailed vulnerability reports
- **List Rules**: Browse available analysis rules with descriptions
- **Explain Rules**: Get detailed explanations of specific rules
- **Suggest Fixes**: Receive fix suggestions for detected issues

## Setup

### 1. Build Solin

```bash
npm run build
```

### 2. Configure MCP

#### For Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "solin": {
      "command": "node",
      "args": ["/path/to/solin/dist/mcp/server.js"]
    }
  }
}
```

#### For ChatGPT (OpenAI)

Create a config file `mcp-config.json`:

```json
{
  "mcpServers": {
    "solin": {
      "command": "node",
      "args": ["dist/mcp/server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 3. Start the MCP Server

```bash
# Direct execution
node dist/mcp/server.js

# Or with npm script (add to package.json)
npm run mcp-server
```

## Usage Examples

### Analyze Smart Contract

In your AI assistant chat:

```
Please analyze this Solidity contract:

pragma solidity ^0.8.0;

contract MyToken {
    mapping(address => uint256) public balances;

    function withdraw() public {
        uint amount = balances[msg.sender];
        msg.sender.call{value: amount}("");
        balances[msg.sender] = 0;
    }
}
```

The assistant will use the `analyze_solidity` tool and return a detailed analysis including:
- Reentrancy vulnerability detection
- Code quality issues
- Best practice violations
- Fix recommendations

### List Available Rules

```
Show me all available security rules
```

The assistant will use `list_rules` with category="security" to display all security detectors.

### Get Rule Explanation

```
Explain the reentrancy rule
```

The assistant will use `explain_rule` with ruleId="security/reentrancy" to provide a detailed explanation.

### Get Fix Suggestions

```
What are the issues in this code and how can I fix them?

[paste your Solidity code]
```

The assistant will use `suggest_fixes` to provide specific fix recommendations.

## Available Tools

### 1. analyze_solidity

Analyzes Solidity code for bugs and vulnerabilities.

**Parameters:**
- `code` (required): Solidity source code
- `format`: Output format (`stylish`, `json`)
- `rules`: Specific rules to enable (optional)

**Example:**
```json
{
  "code": "contract Test { ... }",
  "format": "stylish"
}
```

### 2. list_rules

Lists all available analysis rules.

**Parameters:**
- `category`: Filter by category (`lint`, `security`, `all`)
- `severity`: Filter by severity (`error`, `warning`, `info`, `all`)

**Example:**
```json
{
  "category": "security",
  "severity": "error"
}
```

### 3. explain_rule

Gets detailed explanation of a specific rule.

**Parameters:**
- `ruleId` (required): Rule identifier (e.g., "security/reentrancy")

**Example:**
```json
{
  "ruleId": "security/reentrancy"
}
```

### 4. suggest_fixes

Analyzes code and provides fix suggestions.

**Parameters:**
- `code` (required): Solidity source code with issues
- `issueIndex`: Index of specific issue to fix (optional)

**Example:**
```json
{
  "code": "contract Test { ... }"
}
```

## Output Formats

### Stylish (Default)

Human-readable format with colors and formatting:

```
contract.sol
  5:9  error  Potential reentrancy vulnerability  security/reentrancy

✖ 1 problem (1 error, 0 warnings)
```

### JSON

Structured JSON output for programmatic use:

```json
{
  "files": [...],
  "totalIssues": 1,
  "summary": {
    "errors": 1,
    "warnings": 0,
    "info": 0
  }
}
```

## Best Practices

1. **Keep Code Focused**: Analyze one contract at a time for clearer results
2. **Specify Rules**: Use rule filters when you're looking for specific issues
3. **Review Explanations**: Use `explain_rule` to understand why issues are reported
4. **Iterative Fixes**: Apply suggested fixes and re-analyze

## Troubleshooting

### Server Not Starting

Check that:
- Node.js is installed and in PATH
- Solin is built (`npm run build`)
- Config file paths are correct (absolute paths recommended)

### No Tools Available

Verify:
- MCP config is in the correct location
- Server process is running
- No errors in server logs

### Analysis Fails

Ensure:
- Code is valid Solidity syntax
- Code is properly escaped in JSON
- Server has sufficient memory for large files

## Advanced Usage

### Custom Rules

You can configure which rules to use:

```json
{
  "code": "contract Test { ... }",
  "rules": [
    "security/reentrancy",
    "security/tx-origin",
    "lint/naming-convention"
  ]
}
```

### Batch Analysis

For multiple contracts, analyze them sequentially:

```
Analyze these three contracts:

1. [First contract code]
2. [Second contract code]
3. [Third contract code]
```

## Security Considerations

- MCP runs locally on your machine
- No code is sent to external servers
- All analysis happens locally
- Consider using encryption for sensitive codebases

## Additional Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [Solin Documentation](../README.md)
- [Rule Reference](./rules/)
- [Security Best Practices](./security.md)

## Support

For issues or questions:
- GitHub Issues: https://github.com/0xmhha/solin/issues
- Documentation: https://github.com/0xmhha/solin/tree/main/docs

---

**Note**: The MCP integration is in beta. Please report any issues you encounter.
