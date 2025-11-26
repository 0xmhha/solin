# Roadmap

## Current Status

Solin is a CLI-based Solidity static analysis tool. Server integrations are planned for future releases.

## Planned Features

### Phase 1: Core Stabilization

- [ ] Complete rule coverage for common Solidity patterns
- [ ] Improve auto-fix capabilities
- [ ] Enhance SARIF output for CI/CD integration

### Phase 2: Server Integration

#### MCP Server (Model Context Protocol)

- [ ] Claude Desktop integration
- [ ] ChatGPT Custom GPT support
- [ ] Smithery.ai registry listing

#### REST API Server

- [ ] `/api/analyze` endpoint
- [ ] `/api/health` endpoint
- [ ] CORS configuration
- [ ] Rate limiting

#### WebSocket Server

- [ ] Real-time analysis for IDE plugins
- [ ] File change watching

#### gRPC Server

- [ ] High-performance analysis service
- [ ] End-to-end encryption support

### Phase 3: Deployment

- [ ] Dockerfile
- [ ] Docker Compose setup
- [ ] Railway template
- [ ] Render configuration
- [ ] Heroku deployment

### Phase 4: CLI Server Command

- [ ] `solin server` command for unified server startup
- [ ] Environment variable configuration
- [ ] Multi-protocol support (REST + WS + gRPC)

## Timeline

To be determined based on community feedback and priorities.
