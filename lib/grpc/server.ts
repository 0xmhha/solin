/**
 * gRPC Server for Solin
 *
 * Provides secure Solidity analysis over gRPC with encryption
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import { AnalysisEngine } from '@core/analysis-engine';
import { RuleRegistry } from '@core/rule-registry';
import { SolidityParser } from '@parser/solidity-parser';
import { StylishFormatter } from '@/formatters/stylish-formatter';
import { JSONFormatter } from '@/formatters/json-formatter';
import { SarifFormatter } from '@/formatters/sarif-formatter';
import { EncryptionService } from './encryption';
import * as Rules from '@/rules';
import type { ResolvedConfig } from '@config/types';

/**
 * gRPC Server configuration
 */
export interface GrpcServerConfig {
  host: string;
  port: number;
  tlsEnabled: boolean;
  certPath?: string;
  keyPath?: string;
  encryptionEnabled: boolean;
}

/**
 * Solin gRPC Server
 */
export class SolinGrpcServer {
  private server: grpc.Server;
  private engine: AnalysisEngine;
  private registry: RuleRegistry;
  private parser: SolidityParser;
  private encryption: EncryptionService;
  private config: GrpcServerConfig;

  constructor(config: Partial<GrpcServerConfig> = {}) {
    this.config = {
      host: config.host || '0.0.0.0',
      port: config.port || 50051,
      tlsEnabled: config.tlsEnabled ?? true,
      encryptionEnabled: config.encryptionEnabled ?? true,
      ...(config.certPath && { certPath: config.certPath }),
      ...(config.keyPath && { keyPath: config.keyPath }),
    };

    // Initialize components
    this.registry = new RuleRegistry();
    this.parser = new SolidityParser();
    this.engine = new AnalysisEngine(this.registry, this.parser);
    this.encryption = new EncryptionService();
    this.server = new grpc.Server();

    // Register rules
    this.registerRules();

    // Load proto and setup service
    this.setupService();
  }

  /**
   * Register all analysis rules
   */
  private registerRules(): void {
    const ruleClasses = [
      Rules.NamingConventionRule,
      Rules.NoEmptyBlocksRule,
      Rules.VisibilityModifiersRule,
      Rules.ReentrancyRule,
      Rules.TxOriginRule,
      // Add more rules as needed
    ];

    for (const RuleClass of ruleClasses) {
      if (RuleClass) {
        this.registry.register(new RuleClass());
      }
    }
  }

  /**
   * Setup gRPC service
   */
  private setupService(): void {
    const PROTO_PATH = path.join(__dirname, 'proto', 'solin.proto');

    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
    const solinProto = protoDescriptor.solin;

    this.server.addService(solinProto.SolinService.service, {
      AnalyzeCode: this.analyzeCode.bind(this),
      ListRules: this.listRules.bind(this),
      GetRule: this.getRule.bind(this),
      AnalyzeStream: this.analyzeStream.bind(this),
    });
  }

  /**
   * Analyze code handler
   */
  private async analyzeCode(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const { code, format = 'stylish', encryption_key } = call.request;

      // Decrypt code if encryption is enabled
      let decryptedCode = code;
      if (this.config.encryptionEnabled && encryption_key) {
        decryptedCode = this.encryption.decrypt(code, encryption_key);
      }

      // Analyze code
      const config: ResolvedConfig = {
        basePath: process.cwd(),
        rules: {},
      };

      // Parse code
      await this.parser.parse(decryptedCode, { loc: true, tolerant: true });

      const result = await this.engine.analyze({
        files: ['contract.sol'],
        config,
      });

      // Format result
      let formattedResult: string;
      switch (format) {
        case 'json':
          formattedResult = new JSONFormatter({ pretty: true }).format(result);
          break;
        case 'sarif':
          formattedResult = new SarifFormatter({ pretty: true }).format(result);
          break;
        default:
          formattedResult = new StylishFormatter().format(result);
      }

      // Encrypt result if encryption is enabled
      let encryptedResult = formattedResult;
      if (this.config.encryptionEnabled && encryption_key) {
        encryptedResult = this.encryption.encrypt(formattedResult, encryption_key);
      }

      callback(null, {
        result: encryptedResult,
        total_issues: result.totalIssues,
        errors: result.summary.errors,
        warnings: result.summary.warnings,
        info: result.summary.info,
        duration_ms: result.duration,
      });
    } catch (error) {
      callback(
        {
          code: grpc.status.INTERNAL,
          message: error instanceof Error ? error.message : 'Analysis failed',
        },
        null
      );
    }
  }

  /**
   * List rules handler
   */
  private async listRules(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const { category = 'all', severity = 'all' } = call.request;

      const rules = this.registry.getAllRules();
      const filteredRules = rules.filter(rule => {
        const categoryMatch =
          category === 'all' || rule.metadata.category.toLowerCase() === category;
        const severityMatch =
          severity === 'all' || rule.metadata.severity.toLowerCase() === severity;
        return categoryMatch && severityMatch;
      });

      const ruleInfos = filteredRules.map(rule => ({
        id: rule.metadata.id,
        title: rule.metadata.title,
        description: rule.metadata.description,
        category: rule.metadata.category,
        severity: rule.metadata.severity,
        fixable: rule.metadata.fixable || false,
        recommendation: rule.metadata.recommendation || '',
      }));

      callback(null, {
        rules: ruleInfos,
        total_count: ruleInfos.length,
      });
    } catch (error) {
      callback(
        {
          code: grpc.status.INTERNAL,
          message: 'Failed to list rules',
        },
        null
      );
    }
  }

  /**
   * Get rule handler
   */
  private async getRule(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const { rule_id } = call.request;

      const rule = this.registry.getRule(rule_id);

      if (!rule) {
        callback(null, {
          rule: null,
          found: false,
        });
        return;
      }

      callback(null, {
        rule: {
          id: rule.metadata.id,
          title: rule.metadata.title,
          description: rule.metadata.description,
          category: rule.metadata.category,
          severity: rule.metadata.severity,
          fixable: rule.metadata.fixable || false,
          recommendation: rule.metadata.recommendation || '',
        },
        found: true,
      });
    } catch (error) {
      callback(
        {
          code: grpc.status.INTERNAL,
          message: 'Failed to get rule',
        },
        null
      );
    }
  }

  /**
   * Stream analysis handler
   */
  private async analyzeStream(call: grpc.ServerDuplexStream<any, any>): Promise<void> {
    const chunks: Buffer[] = [];

    call.on('data', (chunk: any) => {
      chunks.push(Buffer.from(chunk.data));

      if (chunk.is_final) {
        this.processStreamAnalysis(chunks, call);
      }
    });

    call.on('error', error => {
      console.error('Stream error:', error);
    });
  }

  /**
   * Process streamed analysis
   */
  private async processStreamAnalysis(
    chunks: Buffer[],
    call: grpc.ServerDuplexStream<any, any>
  ): Promise<void> {
    try {
      const code = Buffer.concat(chunks).toString('utf-8');

      const config: ResolvedConfig = {
        basePath: process.cwd(),
        rules: {},
      };

      await this.parser.parse(code, { loc: true, tolerant: true });
      const result = await this.engine.analyze({
        files: ['contract.sol'],
        config,
      });

      // Stream results
      const issues = result.files[0]?.issues || [];
      for (let i = 0; i < issues.length; i++) {
        call.write({
          issue_json: JSON.stringify(issues[i]),
          issue_index: i,
          is_complete: false,
        });
      }

      // Send completion
      call.write({
        issue_json: '',
        issue_index: issues.length,
        is_complete: true,
      });

      call.end();
    } catch (error) {
      call.destroy(new Error('Stream analysis failed'));
    }
  }

  /**
   * Start the gRPC server
   */
  async start(): Promise<void> {
    const address = `${this.config.host}:${this.config.port}`;

    return new Promise((resolve, reject) => {
      // Use insecure credentials for now (TLS can be added later)
      this.server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (error, _port) => {
        if (error) {
          reject(error);
          return;
        }

        this.server.start();
        console.log(`Solin gRPC server listening on ${address}`);
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise(resolve => {
      this.server.tryShutdown(() => {
        console.log('Solin gRPC server stopped');
        resolve();
      });
    });
  }
}

/**
 * Start gRPC server if run directly
 */
if (require.main === module) {
  const server = new SolinGrpcServer({
    host: process.env.GRPC_HOST || '0.0.0.0',
    port: parseInt(process.env.GRPC_PORT || '50051'),
    tlsEnabled: process.env.GRPC_TLS === 'true',
    encryptionEnabled: process.env.ENCRYPTION_ENABLED !== 'false',
  });

  server.start().catch(error => {
    console.error('Failed to start gRPC server:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}
