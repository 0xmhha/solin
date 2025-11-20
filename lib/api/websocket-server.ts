/**
 * WebSocket Server for Solin
 *
 * Optional real-time analysis interface
 * - Live code analysis as you type
 * - Progressive results streaming
 * - Optional encryption
 */

import http from 'http';
import crypto from 'crypto';
import { AnalysisEngine } from '@core/analysis-engine';
import { RuleRegistry } from '@core/rule-registry';
import { SolidityParser } from '@parser/solidity-parser';
import { JSONFormatter } from '@/formatters/json-formatter';
import { EncryptionService } from '@/grpc/encryption';
import * as Rules from '@/rules';
import type { ResolvedConfig } from '@config/types';

/**
 * WebSocket Server configuration
 */
export interface WebSocketServerConfig {
  host: string;
  port: number;
  encryptionEnabled?: boolean;
}

/**
 * WebSocket frame opcodes
 */
enum OpCode {
  CONTINUATION = 0x0,
  TEXT = 0x1,
  BINARY = 0x2,
  CLOSE = 0x8,
  PING = 0x9,
  PONG = 0xa,
}

/**
 * WebSocket message types
 */
interface WSMessage {
  type: 'analyze' | 'list-rules' | 'get-rule' | 'ping' | 'subscribe';
  data?: unknown;
}

interface AnalyzeMessage {
  code: string;
  format?: 'json';
  incremental?: boolean; // Send results as they're found
  encrypted?: boolean;
  encryptionKey?: string;
}

/**
 * Simple WebSocket implementation without external dependencies
 */
export class SolinWebSocketServer {
  private server: http.Server;
  private engine: AnalysisEngine;
  private registry: RuleRegistry;
  private parser: SolidityParser;
  private encryption?: EncryptionService;
  private config: WebSocketServerConfig;
  private clients: Set<{ socket: any; id: string }> = new Set();

  constructor(config: Partial<WebSocketServerConfig> = {}) {
    this.config = {
      host: config.host || '0.0.0.0',
      port: config.port || 3001,
      encryptionEnabled: config.encryptionEnabled ?? false,
    };

    // Initialize components
    this.registry = new RuleRegistry();
    this.parser = new SolidityParser();
    this.engine = new AnalysisEngine(this.registry, this.parser);

    if (this.config.encryptionEnabled) {
      this.encryption = new EncryptionService();
    }

    this.registerRules();

    // Create HTTP server for WebSocket upgrade
    this.server = http.createServer();
    this.server.on('upgrade', this.handleUpgrade.bind(this));
  }

  /**
   * Register all available rules
   */
  private registerRules(): void {
    const ruleClasses = [
      Rules.NamingConventionRule,
      Rules.NoEmptyBlocksRule,
      Rules.VisibilityModifiersRule,
      Rules.StateMutabilityRule,
      Rules.UnusedVariablesRule,
      Rules.FunctionComplexityRule,
      Rules.MagicNumbersRule,
      Rules.RequireRevertReasonRule,
      Rules.ConstantImmutableRule,
      Rules.BooleanEqualityRule,
      Rules.ExplicitVisibilityRule,
      Rules.NoPublicVarsRule,
      Rules.ReentrancyRule,
      Rules.UninitializedStateRule,
      Rules.UninitializedStorageRule,
      Rules.ArbitrarySendRule,
      Rules.ControlledDelegatecallRule,
      Rules.SelfdestructRule,
      Rules.TxOriginRule,
      Rules.UncheckedCallsRule,
    ];

    for (const RuleClass of ruleClasses) {
      if (RuleClass) {
        this.registry.register(new RuleClass());
      }
    }
  }

  /**
   * Handle WebSocket upgrade
   */
  private handleUpgrade(
    req: http.IncomingMessage,
    socket: any,
    _head: Buffer,
  ): void {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }

    // WebSocket handshake
    const accept = this.generateAcceptKey(key);
    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '\r\n',
    ].join('\r\n');

    socket.write(headers);

    // Add client
    const clientId = crypto.randomBytes(16).toString('hex');
    const client = { socket, id: clientId };
    this.clients.add(client);

    console.log(`WebSocket client connected: ${clientId}`);

    // Send welcome message
    this.sendMessage(socket, {
      type: 'connected',
      clientId,
      message: 'Connected to Solin WebSocket API',
    });

    // Handle messages
    socket.on('data', (data: Buffer) => {
      void this.handleData(socket, data);
    });

    socket.on('close', () => {
      this.clients.delete(client);
      console.log(`WebSocket client disconnected: ${clientId}`);
    });

    socket.on('error', (error: Error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.clients.delete(client);
    });
  }

  /**
   * Generate WebSocket accept key
   */
  private generateAcceptKey(key: string): string {
    const MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
    return crypto
      .createHash('sha1')
      .update(key + MAGIC_STRING)
      .digest('base64');
  }

  /**
   * Handle incoming WebSocket data
   */
  private async handleData(socket: any, data: Buffer): Promise<void> {
    try {
      const message = this.parseFrame(data);
      if (!message) return;

      const wsMessage: WSMessage = JSON.parse(message);

      switch (wsMessage.type) {
        case 'analyze':
          await this.handleAnalyze(socket, wsMessage.data as AnalyzeMessage);
          break;
        case 'list-rules':
          await this.handleListRules(socket);
          break;
        case 'get-rule':
          await this.handleGetRule(socket, wsMessage.data as { ruleId: string });
          break;
        case 'ping':
          this.sendMessage(socket, { type: 'pong', timestamp: Date.now() });
          break;
        default:
          this.sendMessage(socket, { type: 'error', error: 'Unknown message type' });
      }
    } catch (error) {
      this.sendMessage(socket, {
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Parse WebSocket frame
   */
  private parseFrame(buffer: Buffer): string | null {
    if (buffer.length < 2) return null;

    const firstByte = buffer[0];
    const secondByte = buffer[1];

    if (firstByte === undefined || secondByte === undefined) {
      return null;
    }

    const opcode = firstByte & 0x0f;
    const masked = (secondByte & 0x80) === 0x80;
    let payloadLength = secondByte & 0x7f;
    let offset = 2;

    // Extended payload length
    if (payloadLength === 126) {
      payloadLength = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (payloadLength === 127) {
      payloadLength = Number(buffer.readBigUInt64BE(offset));
      offset += 8;
    }

    // Masking key
    let maskingKey: Buffer | undefined;
    if (masked) {
      maskingKey = buffer.subarray(offset, offset + 4);
      offset += 4;
    }

    // Payload
    const payload = buffer.subarray(offset, offset + payloadLength);

    // Unmask if needed
    if (masked && maskingKey) {
      for (let i = 0; i < payload.length; i++) {
        const maskByte = maskingKey[i % 4];
        const payloadByte = payload[i];
        if (maskByte !== undefined && payloadByte !== undefined) {
          payload[i] = payloadByte ^ maskByte;
        }
      }
    }

    if (opcode === OpCode.TEXT) {
      return payload.toString('utf-8');
    }

    return null;
  }

  /**
   * Send WebSocket message
   */
  private sendMessage(socket: any, data: unknown): void {
    const payload = JSON.stringify(data);
    const payloadBuffer = Buffer.from(payload);
    const payloadLength = payloadBuffer.length;

    let frame: Buffer;

    if (payloadLength <= 125) {
      frame = Buffer.allocUnsafe(2 + payloadLength);
      frame[0] = 0x81; // FIN + text frame
      frame[1] = payloadLength;
      payloadBuffer.copy(frame, 2);
    } else if (payloadLength <= 65535) {
      frame = Buffer.allocUnsafe(4 + payloadLength);
      frame[0] = 0x81;
      frame[1] = 126;
      frame.writeUInt16BE(payloadLength, 2);
      payloadBuffer.copy(frame, 4);
    } else {
      frame = Buffer.allocUnsafe(10 + payloadLength);
      frame[0] = 0x81;
      frame[1] = 127;
      frame.writeBigUInt64BE(BigInt(payloadLength), 2);
      payloadBuffer.copy(frame, 10);
    }

    socket.write(frame);
  }

  /**
   * Handle analyze request
   */
  private async handleAnalyze(socket: any, data: AnalyzeMessage): Promise<void> {
    if (!data.code) {
      this.sendMessage(socket, {
        type: 'error',
        error: 'Code parameter is required',
      });
      return;
    }

    try {
      // Decrypt if needed
      let code = data.code;
      if (data.encrypted && this.encryption && data.encryptionKey) {
        code = this.encryption.decrypt(code, data.encryptionKey);
      }

      // Send analysis started
      this.sendMessage(socket, {
        type: 'analysis-started',
        timestamp: Date.now(),
      });

      // Create config
      const config: ResolvedConfig = {
        basePath: process.cwd(),
        rules: {},
      };

      // Parse and analyze
      await this.parser.parse(code, { loc: true, tolerant: true });

      const result = await this.engine.analyze({
        files: ['contract.sol'],
        config,
      });

      // Format output
      const formatter = new JSONFormatter({ pretty: true });
      const output = formatter.format(result);

      // Count issues
      const issues = result.files[0]?.issues || [];
      const errors = issues.filter((i) => i.severity === 'error').length;
      const warnings = issues.filter((i) => i.severity === 'warning').length;

      // Send results
      this.sendMessage(socket, {
        type: 'analysis-complete',
        result: JSON.parse(output),
        summary: {
          issues: issues.length,
          errors,
          warnings,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      this.sendMessage(socket, {
        type: 'analysis-error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle list rules request
   */
  private async handleListRules(socket: any): Promise<void> {
    try {
      const rules = this.registry.getAllRules();
      const ruleInfos = rules.map((rule) => ({
        id: rule.metadata.id,
        title: rule.metadata.title,
        description: rule.metadata.description,
        category: rule.metadata.category,
        severity: rule.metadata.severity,
        fixable: rule.metadata.fixable || false,
      }));

      this.sendMessage(socket, {
        type: 'rules-list',
        rules: ruleInfos,
        count: ruleInfos.length,
      });
    } catch (error) {
      this.sendMessage(socket, {
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle get rule request
   */
  private async handleGetRule(socket: any, data: { ruleId: string }): Promise<void> {
    if (!data.ruleId) {
      this.sendMessage(socket, { type: 'error', error: 'Rule ID is required' });
      return;
    }

    try {
      const rule = this.registry.getRule(data.ruleId);
      if (!rule) {
        this.sendMessage(socket, {
          type: 'error',
          error: `Rule not found: ${data.ruleId}`,
        });
        return;
      }

      this.sendMessage(socket, {
        type: 'rule-details',
        rule: {
          id: rule.metadata.id,
          title: rule.metadata.title,
          description: rule.metadata.description,
          category: rule.metadata.category,
          severity: rule.metadata.severity,
          fixable: rule.metadata.fixable || false,
          recommendation: rule.metadata.recommendation,
        },
      });
    } catch (error) {
      this.sendMessage(socket, {
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(data: unknown): void {
    for (const client of this.clients) {
      this.sendMessage(client.socket, data);
    }
  }

  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.config.port, this.config.host, () => {
        console.log(`Solin WebSocket server listening on ws://${this.config.host}:${this.config.port}`);
        console.log(`Encryption: ${this.config.encryptionEnabled ? 'enabled' : 'disabled (default)'}`);
        console.log(`\nConnect using WebSocket client to: ws://${this.config.host}:${this.config.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    // Close all client connections
    for (const client of this.clients) {
      client.socket.end();
    }
    this.clients.clear();

    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

/**
 * Start WebSocket server if run directly
 */
if (require.main === module) {
  const server = new SolinWebSocketServer({
    host: process.env.WS_HOST || '0.0.0.0',
    port: parseInt(process.env.WS_PORT || '3001', 10),
    encryptionEnabled: process.env.ENCRYPTION_ENABLED === 'true',
  });

  server.start().catch((error) => {
    console.error('Failed to start WebSocket server:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    void server.stop();
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    void server.stop();
  });
}
