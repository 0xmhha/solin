# Solin Quick Start Guide

Get started with Solin in 5 minutes!

## 🚀 Fastest Start (REST API)

```bash
# 1. Install
npm install -g solin

# 2. Start server
solin server

# 3. Analyze code
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"code": "contract Test { function test() public {} }"}'
```

That's it! ✅

## 🤖 Use with AI Assistants

### Claude Desktop (Easiest)

1. **Install Claude Desktop** from https://claude.ai/download

2. **Start Solin MCP server:**
   ```bash
   npm run mcp-server
   ```

3. **Configure Claude Desktop:**

   Edit config file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

   Add:
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

4. **Restart Claude Desktop**

5. **Use Solin:**
   ```
   Analyze this contract: contract Test { ... }
   ```

### ChatGPT (Custom GPT)

1. **Deploy Solin** (see deployment options below)

2. **Create Custom GPT** at https://chat.openai.com/gpts/editor

3. **Add Actions** - Copy from `chatgpt-actions.json`

4. **Replace URL** with your deployed instance

5. **Test:**
   ```
   Analyze this Solidity code: [paste code]
   ```

Full guide: [docs/ai-integration.md](docs/ai-integration.md)

## 📦 Deployment Options

### Railway (Click to deploy)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/solin)

```bash
railway up
```

### Render

1. Push to GitHub
2. Connect to Render
3. `render.yaml` will auto-configure

### Heroku

```bash
heroku create solin-analyzer
git push heroku main
```

### Docker

```bash
docker build -t solin .
docker run -p 3000:3000 solin
```

### Docker Compose

```bash
docker-compose up -d
```

## 📚 Documentation

- **API Guide**: [docs/api-guide.md](docs/api-guide.md)
- **AI Integration**: [docs/ai-integration.md](docs/ai-integration.md)
- **MCP Integration**: [docs/mcp-integration.md](docs/mcp-integration.md)
- **gRPC Integration**: [docs/grpc-integration.md](docs/grpc-integration.md)

## 🎯 Common Use Cases

### Web App Integration
```javascript
const response = await fetch('http://localhost:3000/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: solidityCode })
});
const result = await response.json();
```

### CI/CD Pipeline
```yaml
# .github/workflows/security.yml
- name: Analyze contracts
  run: |
    npm install -g solin
    solin analyze contracts/**/*.sol --format=sarif
```

### IDE Extension
```javascript
const ws = new WebSocket('ws://localhost:3001');
ws.send(JSON.stringify({
  type: 'analyze',
  data: { code: editor.getValue() }
}));
```

## ⚙️ Configuration

### Environment Variables

```bash
# REST API (enabled by default)
REST_ENABLED=true
REST_PORT=3000
CORS_ENABLED=true

# WebSocket (opt-in)
WS_ENABLED=true
WS_PORT=3001

# gRPC (opt-in)
GRPC_ENABLED=true
GRPC_PORT=50051

# Encryption (opt-in)
ENCRYPTION_ENABLED=true
```

### Start with options

```bash
# REST only (default)
npm run server

# REST + WebSocket
WS_ENABLED=true npm run server

# All protocols
npm run server:all

# With encryption
ENCRYPTION_ENABLED=true npm run server
```

## 🆘 Troubleshooting

**Port already in use:**
```bash
REST_PORT=8080 npm run server
```

**MCP not showing in Claude:**
- Check absolute path in config
- Restart Claude Desktop
- Run `npm run build` first

**API not accessible:**
- Check firewall settings
- Verify port is open
- Test: `curl http://localhost:3000/api/health`

## 🌐 Public Registry

### Smithery.ai

Solin is listed on Smithery: https://smithery.ai/server/solin

Install via Smithery:
```bash
npx @smithery/cli install solin
```

### npm

```bash
npm install -g solin
```

## 🤝 Support

- **GitHub**: https://github.com/0xmhha/solin
- **Issues**: https://github.com/0xmhha/solin/issues
- **Discussions**: https://github.com/0xmhha/solin/discussions

## 📝 License

MIT - see [LICENSE](LICENSE)
