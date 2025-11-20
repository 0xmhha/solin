/**
 * REST API Server for Solin
 *
 * Default HTTP interface for Solidity analysis
 * - Easy to use without configuration
 * - Optional encryption
 * - Swagger/OpenAPI documentation
 */

import http from 'http';
import { URL } from 'url';
import { AnalysisEngine } from '@core/analysis-engine';
import { RuleRegistry } from '@core/rule-registry';
import { SolidityParser } from '@parser/solidity-parser';
import { StylishFormatter } from '@/formatters/stylish-formatter';
import { JSONFormatter } from '@/formatters/json-formatter';
import { SarifFormatter } from '@/formatters/sarif-formatter';
import { EncryptionService } from '@/grpc/encryption';
import * as Rules from '@/rules';
import type { ResolvedConfig } from '@config/types';

/**
 * REST API Server configuration
 */
export interface RestServerConfig {
  host: string;
  port: number;
  corsEnabled: boolean;
  encryptionEnabled?: boolean; // Optional encryption
  maxRequestSize: number; // Max request body size in bytes
}

/**
 * API Request/Response types
 */
interface AnalyzeRequest {
  code: string;
  format?: 'stylish' | 'json' | 'sarif';
  rules?: string[];
  encrypted?: boolean;
  encryptionKey?: string;
}

interface AnalyzeResponse {
  success: boolean;
  result?: string;
  issues?: number;
  errors?: number;
  warnings?: number;
  error?: string;
}

interface ListRulesRequest {
  category?: 'lint' | 'security' | 'all';
  severity?: 'error' | 'warning' | 'info' | 'all';
}

interface RuleInfo {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  fixable: boolean;
}

interface ListRulesResponse {
  success: boolean;
  rules?: RuleInfo[];
  count?: number;
  error?: string;
}

interface GetRuleResponse {
  success: boolean;
  rule?: RuleInfo & {
    recommendation?: string;
    examples?: {
      invalid?: string[];
      valid?: string[];
    };
  };
  error?: string;
}

interface SuggestFixesRequest {
  code: string;
  issueIndex?: number;
}

interface SuggestFixesResponse {
  success: boolean;
  suggestions?: Array<{
    issue: string;
    location: { line: number; column: number };
    severity: string;
    ruleId: string;
    suggestion: string;
  }>;
  count?: number;
  error?: string;
}

/**
 * Solin REST API Server
 */
export class SolinRestServer {
  private server: http.Server;
  private engine: AnalysisEngine;
  private registry: RuleRegistry;
  private parser: SolidityParser;
  private encryption?: EncryptionService;
  private config: RestServerConfig;

  constructor(config: Partial<RestServerConfig> = {}) {
    this.config = {
      host: config.host || '0.0.0.0',
      port: config.port || 3000,
      corsEnabled: config.corsEnabled ?? true,
      encryptionEnabled: config.encryptionEnabled ?? false, // Disabled by default for ease of use
      maxRequestSize: config.maxRequestSize || 10 * 1024 * 1024, // 10MB default
    };

    // Initialize components
    this.registry = new RuleRegistry();
    this.parser = new SolidityParser();
    this.engine = new AnalysisEngine(this.registry, this.parser);

    // Initialize encryption if enabled
    if (this.config.encryptionEnabled) {
      this.encryption = new EncryptionService();
    }

    // Register all rules
    this.registerRules();

    // Create HTTP server
    this.server = http.createServer((req, res) => {
      void this.handleRequest(req, res);
    });
  }

  /**
   * Register all available rules
   */
  private registerRules(): void {
    const ruleClasses = [
      // Lint rules
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

      // Security rules
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
   * Handle HTTP requests
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // Set CORS headers if enabled
    if (this.config.corsEnabled) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
    }

    // Parse URL
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    try {
      // Route requests
      if (req.method === 'POST' && url.pathname === '/api/analyze') {
        await this.handleAnalyze(req, res);
      } else if (req.method === 'GET' && url.pathname === '/api/rules') {
        await this.handleListRules(req, res);
      } else if (req.method === 'GET' && url.pathname.startsWith('/api/rules/')) {
        await this.handleGetRule(req, res);
      } else if (req.method === 'POST' && url.pathname === '/api/suggest-fixes') {
        await this.handleSuggestFixes(req, res);
      } else if (req.method === 'GET' && url.pathname === '/api/health') {
        this.sendJson(res, 200, { status: 'ok', version: '0.1.0' });
      } else if (req.method === 'GET' && url.pathname === '/') {
        this.sendJson(res, 200, {
          name: 'Solin API',
          version: '0.1.0',
          endpoints: {
            analyze: 'POST /api/analyze',
            rules: 'GET /api/rules',
            rule: 'GET /api/rules/:ruleId',
            suggestFixes: 'POST /api/suggest-fixes',
            health: 'GET /api/health',
          },
        });
      } else {
        this.sendJson(res, 404, { error: 'Not found' });
      }
    } catch (error) {
      console.error('Request error:', error);
      this.sendJson(res, 500, {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle analyze request
   */
  private async handleAnalyze(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    const request: AnalyzeRequest = JSON.parse(body);

    if (!request.code) {
      this.sendJson(res, 400, { success: false, error: 'Code parameter is required' });
      return;
    }

    try {
      // Decrypt if needed
      let code = request.code;
      if (request.encrypted && this.encryption && request.encryptionKey) {
        code = this.encryption.decrypt(code, request.encryptionKey);
      }

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
      const format = request.format || 'json';
      let output: string;

      if (format === 'sarif') {
        const formatter = new SarifFormatter();
        output = formatter.format(result);
      } else if (format === 'stylish') {
        const formatter = new StylishFormatter();
        output = formatter.format(result);
      } else {
        const formatter = new JSONFormatter({ pretty: true });
        output = formatter.format(result);
      }

      // Count issues
      const issues = result.files[0]?.issues || [];
      const errors = issues.filter(i => i.severity === 'error').length;
      const warnings = issues.filter(i => i.severity === 'warning').length;

      const response: AnalyzeResponse = {
        success: true,
        result: output,
        issues: issues.length,
        errors,
        warnings,
      };

      this.sendJson(res, 200, response);
    } catch (error) {
      this.sendJson(res, 400, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle list rules request
   */
  private async handleListRules(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const category = (url.searchParams.get('category') as ListRulesRequest['category']) || 'all';
    const severity = (url.searchParams.get('severity') as ListRulesRequest['severity']) || 'all';

    try {
      const rules = this.registry.getAllRules();
      const filteredRules = rules.filter(rule => {
        const categoryMatch =
          category === 'all' || rule.metadata.category.toLowerCase() === category;
        const severityMatch =
          severity === 'all' || rule.metadata.severity.toLowerCase() === severity;
        return categoryMatch && severityMatch;
      });

      const ruleInfos: RuleInfo[] = filteredRules.map(rule => ({
        id: rule.metadata.id,
        title: rule.metadata.title,
        description: rule.metadata.description,
        category: rule.metadata.category,
        severity: rule.metadata.severity,
        fixable: rule.metadata.fixable || false,
      }));

      const response: ListRulesResponse = {
        success: true,
        rules: ruleInfos,
        count: ruleInfos.length,
      };

      this.sendJson(res, 200, response);
    } catch (error) {
      this.sendJson(res, 500, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle get rule request
   */
  private async handleGetRule(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const ruleId = url.pathname.replace('/api/rules/', '');

    if (!ruleId) {
      this.sendJson(res, 400, { success: false, error: 'Rule ID is required' });
      return;
    }

    try {
      const rule = this.registry.getRule(ruleId);
      if (!rule) {
        this.sendJson(res, 404, { success: false, error: `Rule not found: ${ruleId}` });
        return;
      }

      const response: GetRuleResponse = {
        success: true,
        rule: {
          id: rule.metadata.id,
          title: rule.metadata.title,
          description: rule.metadata.description,
          category: rule.metadata.category,
          severity: rule.metadata.severity,
          fixable: rule.metadata.fixable || false,
          recommendation: rule.metadata.recommendation,
        },
      };

      this.sendJson(res, 200, response);
    } catch (error) {
      this.sendJson(res, 500, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle suggest fixes request
   */
  private async handleSuggestFixes(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const body = await this.readBody(req);
    const request: SuggestFixesRequest = JSON.parse(body);

    if (!request.code) {
      this.sendJson(res, 400, { success: false, error: 'Code parameter is required' });
      return;
    }

    try {
      // Create config
      const config: ResolvedConfig = {
        basePath: process.cwd(),
        rules: {},
      };

      const result = await this.engine.analyze({
        files: ['contract.sol'],
        config,
      });

      const issues = result.files[0]?.issues || [];

      if (issues.length === 0) {
        this.sendJson(res, 200, {
          success: true,
          suggestions: [],
          count: 0,
        });
        return;
      }

      const suggestions = issues.map(issue => ({
        issue: issue.message,
        location: {
          line: issue.location.start.line,
          column: issue.location.start.column,
        },
        severity: issue.severity,
        ruleId: issue.ruleId,
        suggestion: issue.metadata?.suggestion || 'Review and fix according to rule guidelines',
      }));

      const response: SuggestFixesResponse = {
        success: true,
        suggestions,
        count: suggestions.length,
      };

      this.sendJson(res, 200, response);
    } catch (error) {
      this.sendJson(res, 400, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Read request body
   */
  private async readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;

      req.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > this.config.maxRequestSize) {
          reject(new Error('Request body too large'));
          return;
        }
        chunks.push(chunk);
      });

      req.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf-8'));
      });

      req.on('error', reject);
    });
  }

  /**
   * Send JSON response
   */
  private sendJson(res: http.ServerResponse, status: number, data: unknown): void {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(status);
    res.end(JSON.stringify(data, null, 2));
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise(resolve => {
      this.server.listen(this.config.port, this.config.host, () => {
        console.log(
          `Solin REST API server listening on http://${this.config.host}:${this.config.port}`
        );
        console.log(`\nAvailable endpoints:`);
        console.log(`  POST   http://${this.config.host}:${this.config.port}/api/analyze`);
        console.log(`  GET    http://${this.config.host}:${this.config.port}/api/rules`);
        console.log(`  GET    http://${this.config.host}:${this.config.port}/api/rules/:ruleId`);
        console.log(`  POST   http://${this.config.host}:${this.config.port}/api/suggest-fixes`);
        console.log(`  GET    http://${this.config.host}:${this.config.port}/api/health`);
        console.log(
          `\nEncryption: ${this.config.encryptionEnabled ? 'enabled' : 'disabled (default)'}`
        );
        console.log(`CORS: ${this.config.corsEnabled ? 'enabled' : 'disabled'}`);
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close(err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

/**
 * Start REST API server if run directly
 */
if (require.main === module) {
  const server = new SolinRestServer({
    host: process.env.REST_HOST || '0.0.0.0',
    port: parseInt(process.env.REST_PORT || '3000', 10),
    corsEnabled: process.env.CORS_ENABLED !== 'false',
    encryptionEnabled: process.env.ENCRYPTION_ENABLED === 'true',
  });

  server.start().catch(error => {
    console.error('Failed to start REST API server:', error);
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
