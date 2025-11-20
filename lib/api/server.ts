/**
 * Unified Solin Server
 *
 * Easy-to-use server launcher with multiple protocol support:
 * - REST API (default, enabled by default)
 * - WebSocket (optional, disabled by default)
 * - gRPC (optional, disabled by default)
 * - MCP stdio (optional, disabled by default)
 *
 * Encryption is optional for all protocols (disabled by default for ease of use)
 */

import { SolinRestServer } from './rest-server';
import { SolinWebSocketServer } from './websocket-server';
import { SolinGrpcServer } from '@/grpc/server';
import { SolinMCPServer } from '@/mcp/server';

/**
 * Server configuration
 */
export interface ServerConfig {
  // REST API (default enabled)
  rest?: {
    enabled?: boolean;
    host?: string;
    port?: number;
    corsEnabled?: boolean;
  };

  // WebSocket (optional)
  websocket?: {
    enabled?: boolean;
    host?: string;
    port?: number;
  };

  // gRPC (optional)
  grpc?: {
    enabled?: boolean;
    host?: string;
    port?: number;
    tlsEnabled?: boolean;
    certPath?: string;
    keyPath?: string;
  };

  // MCP stdio (optional)
  mcp?: {
    enabled?: boolean;
  };

  // Global encryption (optional, disabled by default)
  encryption?: {
    enabled?: boolean;
  };
}

/**
 * Default configuration for easy start
 */
const DEFAULT_CONFIG: ServerConfig = {
  rest: {
    enabled: true,
    host: '0.0.0.0',
    port: 3000,
    corsEnabled: true,
  },
  websocket: {
    enabled: false,
    host: '0.0.0.0',
    port: 3001,
  },
  grpc: {
    enabled: false,
    host: '0.0.0.0',
    port: 50051,
    tlsEnabled: false,
  },
  mcp: {
    enabled: false,
  },
  encryption: {
    enabled: false,
  },
};

/**
 * Unified server manager
 */
export class SolinServer {
  private config: ServerConfig;
  private restServer?: SolinRestServer;
  private wsServer?: SolinWebSocketServer;
  private grpcServer?: SolinGrpcServer;
  private mcpServer?: SolinMCPServer;

  constructor(config: Partial<ServerConfig> = {}) {
    // Merge with defaults
    this.config = {
      rest: { ...DEFAULT_CONFIG.rest, ...config.rest },
      websocket: { ...DEFAULT_CONFIG.websocket, ...config.websocket },
      grpc: { ...DEFAULT_CONFIG.grpc, ...config.grpc },
      mcp: { ...DEFAULT_CONFIG.mcp, ...config.mcp },
      encryption: { ...DEFAULT_CONFIG.encryption, ...config.encryption },
    };
  }

  /**
   * Start all enabled servers
   */
  async start(): Promise<void> {
    const servers: string[] = [];

    // Start REST API (default)
    if (this.config.rest?.enabled) {
      this.restServer = new SolinRestServer({
        ...(this.config.rest.host && { host: this.config.rest.host }),
        ...(this.config.rest.port && { port: this.config.rest.port }),
        ...(this.config.rest.corsEnabled !== undefined && { corsEnabled: this.config.rest.corsEnabled }),
        ...(this.config.encryption?.enabled !== undefined && { encryptionEnabled: this.config.encryption.enabled }),
      });
      await this.restServer.start();
      servers.push(`REST API on http://${this.config.rest.host}:${this.config.rest.port}`);
    }

    // Start WebSocket (optional)
    if (this.config.websocket?.enabled) {
      this.wsServer = new SolinWebSocketServer({
        ...(this.config.websocket.host && { host: this.config.websocket.host }),
        ...(this.config.websocket.port && { port: this.config.websocket.port }),
        ...(this.config.encryption?.enabled !== undefined && { encryptionEnabled: this.config.encryption.enabled }),
      });
      await this.wsServer.start();
      servers.push(`WebSocket on ws://${this.config.websocket.host}:${this.config.websocket.port}`);
    }

    // Start gRPC (optional)
    if (this.config.grpc?.enabled) {
      this.grpcServer = new SolinGrpcServer({
        ...(this.config.grpc.host && { host: this.config.grpc.host }),
        ...(this.config.grpc.port && { port: this.config.grpc.port }),
        ...(this.config.grpc.tlsEnabled !== undefined && { tlsEnabled: this.config.grpc.tlsEnabled }),
        ...(this.config.grpc.certPath && { certPath: this.config.grpc.certPath }),
        ...(this.config.grpc.keyPath && { keyPath: this.config.grpc.keyPath }),
        ...(this.config.encryption?.enabled !== undefined && { encryptionEnabled: this.config.encryption.enabled }),
      });
      await this.grpcServer.start();
      servers.push(`gRPC on ${this.config.grpc.host}:${this.config.grpc.port}`);
    }

    // Start MCP (optional)
    if (this.config.mcp?.enabled) {
      this.mcpServer = new SolinMCPServer();
      await this.mcpServer.start();
      servers.push('MCP on stdio');
    }

    if (servers.length === 0) {
      console.warn('⚠️  No servers enabled! Enable at least one server protocol.');
      return;
    }

    console.log('\n✅ Solin servers started successfully!\n');
    console.log('Active servers:');
    servers.forEach((server) => console.log(`  • ${server}`));
    console.log(`\n🔒 Encryption: ${this.config.encryption?.enabled ? 'enabled' : 'disabled (default)'}`);
    console.log('\nPress Ctrl+C to stop all servers\n');
  }

  /**
   * Stop all running servers
   */
  async stop(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.restServer) {
      promises.push(this.restServer.stop());
    }
    if (this.wsServer) {
      promises.push(this.wsServer.stop());
    }
    if (this.grpcServer) {
      promises.push(this.grpcServer.stop());
    }

    await Promise.all(promises);
    console.log('All servers stopped');
  }
}

/**
 * Start server from environment variables or defaults
 */
if (require.main === module) {
  const config: ServerConfig = {
    rest: {
      enabled: process.env.REST_ENABLED !== 'false', // Enabled by default
      host: process.env.REST_HOST || '0.0.0.0',
      port: parseInt(process.env.REST_PORT || '3000', 10),
      corsEnabled: process.env.CORS_ENABLED !== 'false',
    },
    websocket: {
      enabled: process.env.WS_ENABLED === 'true', // Disabled by default
      host: process.env.WS_HOST || '0.0.0.0',
      port: parseInt(process.env.WS_PORT || '3001', 10),
    },
    grpc: {
      enabled: process.env.GRPC_ENABLED === 'true', // Disabled by default
      host: process.env.GRPC_HOST || '0.0.0.0',
      port: parseInt(process.env.GRPC_PORT || '50051', 10),
      tlsEnabled: process.env.GRPC_TLS === 'true',
      ...(process.env.GRPC_CERT && { certPath: process.env.GRPC_CERT }),
      ...(process.env.GRPC_KEY && { keyPath: process.env.GRPC_KEY }),
    },
    mcp: {
      enabled: process.env.MCP_ENABLED === 'true', // Disabled by default
    },
    encryption: {
      enabled: process.env.ENCRYPTION_ENABLED === 'true', // Disabled by default
    },
  };

  const server = new SolinServer(config);

  server.start().catch((error) => {
    console.error('Failed to start servers:', error);
    process.exit(1);
  });

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    console.log('\nShutting down gracefully...');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}
