# Solin VS Code Extension

Static analysis for Solidity smart contracts directly in Visual Studio Code.

## Features

- **Real-time Analysis**: Analyze Solidity files on open and save
- **Inline Diagnostics**: See issues directly in your code
- **Configurable Severity**: Map Solin severities to VS Code levels
- **Workspace Analysis**: Analyze all Solidity files at once

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Solin"
4. Click Install

### From VSIX

1. Download the `.vsix` file
2. Run: `code --install-extension solin-0.1.0.vsix`

## Usage

### Automatic Analysis

By default, Solin analyzes files when you:
- Open a Solidity file
- Save a Solidity file

### Manual Commands

- `Solin: Analyze Current File` - Analyze the active file
- `Solin: Analyze Workspace` - Analyze all Solidity files
- `Solin: Show Output` - Show the output panel
- `Solin: Clear Diagnostics` - Clear all diagnostics

Access commands via Command Palette (Ctrl+Shift+P).

## Configuration

Configure Solin in VS Code settings:

```json
{
  "solin.enable": true,
  "solin.analyzeOnSave": true,
  "solin.analyzeOnOpen": true,
  "solin.configFile": ".solinrc.json",
  "solin.maxProblems": 100,
  "solin.severity.error": "Error",
  "solin.severity.warning": "Warning",
  "solin.severity.info": "Information",
  "solin.exclude": [
    "**/node_modules/**",
    "**/lib/**"
  ]
}
```

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `solin.enable` | Enable Solin analysis | `true` |
| `solin.analyzeOnSave` | Analyze when file is saved | `true` |
| `solin.analyzeOnOpen` | Analyze when file is opened | `true` |
| `solin.configFile` | Path to configuration file | `""` |
| `solin.maxProblems` | Maximum problems to show | `100` |
| `solin.severity.error` | VS Code severity for errors | `"Error"` |
| `solin.severity.warning` | VS Code severity for warnings | `"Warning"` |
| `solin.severity.info` | VS Code severity for info | `"Information"` |
| `solin.exclude` | Glob patterns to exclude | `["**/node_modules/**"]` |

## Requirements

- Node.js 16 or later
- Solin CLI (`npm install -g solin`)

## Screenshots

### Inline Diagnostics

Issues appear directly in your code with squiggly underlines:

```solidity
function withdraw() public {
    msg.sender.call{value: balance}(""); // Warning: Unchecked low-level call
    balance = 0;
}
```

### Problems Panel

View all issues in the Problems panel (Ctrl+Shift+M).

## Troubleshooting

### "Solin not found"

Ensure Solin is installed globally:

```bash
npm install -g solin
```

### Diagnostics not showing

1. Check that `solin.enable` is `true`
2. Ensure the file has `.sol` extension
3. Check the Output panel for errors

### Analysis is slow

- Reduce `solin.maxProblems`
- Add directories to `solin.exclude`
- Use a `.solinrc.json` to disable unnecessary rules

## Development

### Build

```bash
cd vscode-extension
npm install
npm run compile
```

### Package

```bash
npm run package
```

### Publish

```bash
npm run publish
```

## License

MIT License
