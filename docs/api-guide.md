# Solin API Guide

Solin provides multiple API interfaces for Solidity static analysis. Choose the interface that best fits your use case.

## Quick Start

```bash
# Start REST API server (default, easiest)
npm run server

# Server starts on http://localhost:3000
```

That's it! No configuration needed. The REST API is ready to use.

## 📡 Available Interfaces

### 1. REST API (Default, Recommended)

**Best for:** Web applications, simple integrations, HTTP clients

**Features:**

- Enabled by default
- No setup required
- CORS enabled
- JSON responses
- Optional encryption

**Start server:**

```bash
npm run server
# or
node dist/api/server.js
```

**Example usage:**

```bash
# Analyze Solidity code
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "code": "contract Test { function test() public {} }",
    "format": "json"
  }'

# List all rules
curl http://localhost:3000/api/rules

# Get specific rule
curl http://localhost:3000/api/rules/security/reentrancy

# Health check
curl http://localhost:3000/api/health
```

**Response format:**

```json
{
  "success": true,
  "result": "...",
  "issues": 5,
  "errors": 1,
  "warnings": 4
}
```

### 2. WebSocket (Optional)

**Best for:** Real-time analysis, IDE integration, live feedback

**Features:**

- Real-time bidirectional communication
- 📡 Progressive results streaming
- Low latency
-  Optional encryption

**Enable:**

```bash
WS_ENABLED=true npm run server
```

**Example usage (JavaScript):**

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onopen = () => {
  // Analyze code
  ws.send(
    JSON.stringify({
      type: 'analyze',
      data: {
        code: 'contract Test { ... }',
        format: 'json',
      },
    })
  );
};

ws.onmessage = event => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'connected':
      console.log('Connected:', message.clientId);
      break;
    case 'analysis-started':
      console.log('Analysis started...');
      break;
    case 'analysis-complete':
      console.log('Results:', message.result);
      console.log('Summary:', message.summary);
      break;
    case 'analysis-error':
      console.error('Error:', message.error);
      break;
  }
};

// List rules
ws.send(JSON.stringify({ type: 'list-rules' }));

// Get specific rule
ws.send(
  JSON.stringify({
    type: 'get-rule',
    data: { ruleId: 'security/reentrancy' },
  })
);

// Ping
ws.send(JSON.stringify({ type: 'ping' }));
```

### 3. gRPC (Optional)

**Best for:** Production deployments, microservices, high performance

**Features:**

- High performance binary protocol
-  TLS/SSL support
- 📡 Bidirectional streaming
- 🔐 Built-in encryption

**Enable:**

```bash
GRPC_ENABLED=true npm run server
```

**Example usage:** See [grpc-integration.md](./grpc-integration.md) for detailed client examples in multiple languages.

### 4. MCP (Optional)

**Best for:** AI assistant integration (ChatGPT, Claude)

**Features:**

- Direct AI assistant integration
- Conversational interface
- Natural language queries

**Enable:**

```bash
MCP_ENABLED=true npm run server
```

**Example usage:** See [mcp-integration.md](./mcp-integration.md) for setup instructions.

## 🎛️ Configuration

### Environment Variables

All configuration is done through environment variables for security and flexibility:

```bash
# REST API (enabled by default)
REST_ENABLED=true          # Set to 'false' to disable
REST_HOST=0.0.0.0          # Bind address
REST_PORT=3000             # Port number
CORS_ENABLED=true          # Enable CORS

# WebSocket (disabled by default)
WS_ENABLED=false           # Set to 'true' to enable
WS_HOST=0.0.0.0
WS_PORT=3001

# gRPC (disabled by default)
GRPC_ENABLED=false         # Set to 'true' to enable
GRPC_HOST=0.0.0.0
GRPC_PORT=50051
GRPC_TLS=false             # Enable TLS
GRPC_CERT=./cert.pem       # TLS certificate path
GRPC_KEY=./key.pem         # TLS key path

# MCP (disabled by default)
MCP_ENABLED=false          # Set to 'true' to enable

# Encryption (optional, disabled by default for ease of use)
ENCRYPTION_ENABLED=false   # Set to 'true' to enable encryption globally
```

### Quick Examples

**Start with REST API only (default):**

```bash
npm run server
```

**Start with REST + WebSocket:**

```bash
WS_ENABLED=true npm run server
```

**Start with all protocols:**

```bash
REST_ENABLED=true WS_ENABLED=true GRPC_ENABLED=true npm run server
```

**Start with encryption enabled:**

```bash
ENCRYPTION_ENABLED=true npm run server
```

**Custom ports:**

```bash
REST_PORT=8080 WS_PORT=8081 GRPC_PORT=50052 npm run server
```

## API Reference

### REST API Endpoints

#### POST /api/analyze

Analyze Solidity code and return issues.

**Request:**

```json
{
  "code": "string", // Solidity source code (required)
  "format": "json", // Output format: 'stylish', 'json', 'sarif' (optional)
  "rules": ["rule-id"], // Specific rules to enable (optional)
  "encrypted": false, // Whether code is encrypted (optional)
  "encryptionKey": "key-id" // Encryption key ID (optional)
}
```

**Response:**

```json
{
  "success": true,
  "result": "...", // Formatted analysis results
  "issues": 5, // Total issues found
  "errors": 1, // Error count
  "warnings": 4 // Warning count
}
```

#### GET /api/rules

List all available analysis rules.

**Query parameters:**

- `category`: Filter by category ('lint', 'security', 'all')
- `severity`: Filter by severity ('error', 'warning', 'info', 'all')

**Response:**

```json
{
  "success": true,
  "rules": [
    {
      "id": "security/reentrancy",
      "title": "Reentrancy Vulnerability",
      "description": "...",
      "category": "security",
      "severity": "error",
      "fixable": false
    }
  ],
  "count": 151
}
```

#### GET /api/rules/:ruleId

Get detailed information about a specific rule.

**Response:**

```json
{
  "success": true,
  "rule": {
    "id": "security/reentrancy",
    "title": "Reentrancy Vulnerability",
    "description": "...",
    "category": "security",
    "severity": "error",
    "fixable": false,
    "recommendation": "..."
  }
}
```

#### POST /api/suggest-fixes

Analyze code and get fix suggestions.

**Request:**

```json
{
  "code": "string", // Solidity source code (required)
  "issueIndex": 0 // Specific issue to fix (optional)
}
```

**Response:**

```json
{
  "success": true,
  "suggestions": [
    {
      "issue": "Missing visibility modifier",
      "location": { "line": 5, "column": 3 },
      "severity": "warning",
      "ruleId": "lint/explicit-visibility",
      "suggestion": "Add 'public', 'private', 'internal', or 'external' visibility modifier"
    }
  ],
  "count": 3
}
```

#### GET /api/health

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

## 🔐 Using Encryption (Optional)

Encryption is **optional** and **disabled by default** for ease of use. Enable it when handling sensitive smart contract code.

### Enable Encryption

```bash
ENCRYPTION_ENABLED=true npm run server
```

### Using Encryption with REST API

1. **Request encryption key** (not implemented yet, use predefined keys)
2. **Encrypt your code** using AES-256-GCM
3. **Send encrypted code** with encryption key ID

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "code": "encrypted-base64-string",
    "encrypted": true,
    "encryptionKey": "key-id-123"
  }'
```

The response will be encrypted with the same key.

### Using Encryption with WebSocket

```javascript
ws.send(
  JSON.stringify({
    type: 'analyze',
    data: {
      code: 'encrypted-base64-string',
      encrypted: true,
      encryptionKey: 'key-id-123',
    },
  })
);
```

## 🐳 Docker Deployment

**Quick start with Docker:**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
EXPOSE 3000 3001 50051
CMD ["node", "dist/api/server.js"]
```

**Run container:**

```bash
docker build -t solin .
docker run -p 3000:3000 -e REST_ENABLED=true solin
```

## ☸️ Kubernetes Deployment

See [grpc-integration.md](./grpc-integration.md) for complete Kubernetes deployment manifests.

## Integration Examples

### Node.js

```javascript
const axios = require('axios');

async function analyzeContract(code) {
  const response = await axios.post('http://localhost:3000/api/analyze', {
    code,
    format: 'json',
  });

  return response.data;
}
```

### Python

```python
import requests

def analyze_contract(code):
    response = requests.post('http://localhost:3000/api/analyze', json={
        'code': code,
        'format': 'json'
    })
    return response.json()
```

### Go

```go
import (
    "bytes"
    "encoding/json"
    "net/http"
)

func analyzeContract(code string) (map[string]interface{}, error) {
    body, _ := json.Marshal(map[string]string{
        "code": code,
        "format": "json",
    })

    resp, err := http.Post("http://localhost:3000/api/analyze",
        "application/json", bytes.NewBuffer(body))
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    return result, nil
}
```

### Browser JavaScript

```javascript
async function analyzeContract(code) {
  const response = await fetch('http://localhost:3000/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, format: 'json' }),
  });

  return await response.json();
}
```

## Use Cases

### 1. Web Application Integration

- Use REST API for simple HTTP requests
- Enable CORS for browser access
- No encryption needed for public contracts

### 2. IDE Extension

- Use WebSocket for real-time feedback
- Low latency for as-you-type analysis
- Progressive results for large files

### 3. CI/CD Pipeline

- Use REST API or gRPC for automation
- Run analysis on every commit
- Fail builds on critical issues

### 4. AI Assistant Integration

- Use MCP for ChatGPT/Claude
- Natural language queries
- Interactive code review

### 5. Microservices Architecture

- Use gRPC for service-to-service communication
- High performance binary protocol
- Built-in load balancing

## Performance

**Benchmark results (average):**

- REST API: ~50ms per request
- WebSocket: ~45ms per message
- gRPC: ~30ms per call
- MCP stdio: ~40ms per tool call

**Throughput:**

- REST API: ~1000 req/s
- WebSocket: ~1500 msg/s
- gRPC: ~3000 req/s

## 🐛 Troubleshooting

### Port already in use

```bash
# Change port
REST_PORT=8080 npm run server
```

### CORS errors

```bash
# Ensure CORS is enabled (default)
CORS_ENABLED=true npm run server
```

### Connection refused

- Check if server is running
- Verify correct host/port
- Check firewall settings

### Encryption errors

- Ensure encryption is enabled on both client and server
- Use correct encryption key ID
- Verify key exists in key store

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/0xmhha/solin/issues)

## License

MIT License - see [LICENSE](../LICENSE) file for details.
