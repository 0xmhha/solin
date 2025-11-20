/**
 * MCP Server for Solin
 *
 * Provides Solidity static analysis capabilities through Model Context Protocol
 * Compatible with ChatGPT, Claude, and other AI assistants
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { AnalysisEngine } from '@core/analysis-engine';
import { RuleRegistry } from '@core/rule-registry';
import { SolidityParser } from '@parser/solidity-parser';
import { StylishFormatter } from '@/formatters/stylish-formatter';
import { JSONFormatter } from '@/formatters/json-formatter';
import * as Rules from '@/rules';
import type { ResolvedConfig } from '@config/types';

/**
 * MCP Server class
 */
export class SolinMCPServer {
  private server: Server;
  private engine: AnalysisEngine;
  private registry: RuleRegistry;
  private parser: SolidityParser;

  constructor() {
    this.server = new Server(
      {
        name: 'solin-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    // Initialize analysis components
    this.registry = new RuleRegistry();
    this.parser = new SolidityParser();
    this.engine = new AnalysisEngine(this.registry, this.parser);

    // Register all rules
    this.registerRules();

    // Setup MCP handlers
    this.setupHandlers();
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
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const toolArgs = args || {};

      switch (name) {
        case 'analyze_solidity':
          return await this.analyzeSolidity(toolArgs);
        case 'list_rules':
          return await this.listRules(toolArgs);
        case 'explain_rule':
          return await this.explainRule(toolArgs);
        case 'suggest_fixes':
          return await this.suggestFixes(toolArgs);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  /**
   * Get available MCP tools
   */
  private getTools(): Tool[] {
    return [
      {
        name: 'analyze_solidity',
        description:
          'Analyze Solidity smart contract code for bugs, vulnerabilities, and code quality issues. Returns detailed analysis results with severity levels and recommendations.',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'The Solidity source code to analyze',
            },
            format: {
              type: 'string',
              enum: ['stylish', 'json'],
              description: 'Output format (default: stylish)',
              default: 'stylish',
            },
            rules: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific rules to enable (optional, all rules by default)',
            },
          },
          required: ['code'],
        },
      },
      {
        name: 'list_rules',
        description:
          'List all available analysis rules with descriptions. Can filter by category (lint, security) or severity (error, warning, info).',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['lint', 'security', 'all'],
              description: 'Filter by rule category (default: all)',
              default: 'all',
            },
            severity: {
              type: 'string',
              enum: ['error', 'warning', 'info', 'all'],
              description: 'Filter by severity level (default: all)',
              default: 'all',
            },
          },
        },
      },
      {
        name: 'explain_rule',
        description:
          'Get detailed explanation of a specific rule including what it checks, why it matters, and how to fix violations.',
        inputSchema: {
          type: 'object',
          properties: {
            ruleId: {
              type: 'string',
              description: 'Rule ID (e.g., "security/reentrancy", "lint/naming-convention")',
            },
          },
          required: ['ruleId'],
        },
      },
      {
        name: 'suggest_fixes',
        description:
          'Analyze code and provide specific fix suggestions for detected issues.',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'The Solidity source code with issues',
            },
            issueIndex: {
              type: 'number',
              description: 'Index of specific issue to fix (optional, fixes all by default)',
            },
          },
          required: ['code'],
        },
      },
    ];
  }

  /**
   * Analyze Solidity code
   */
  private async analyzeSolidity(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
  }> {
    const code = args.code as string;
    const format = (args.format as string) || 'stylish';

    if (!code) {
      throw new Error('Code parameter is required');
    }

    try {
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
      let output: string;
      if (format === 'json') {
        const formatter = new JSONFormatter({ pretty: true });
        output = formatter.format(result);
      } else {
        const formatter = new StylishFormatter();
        output = formatter.format(result);
      }

      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Analysis error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  /**
   * List available rules
   */
  private async listRules(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
  }> {
    const category = (args.category as string) || 'all';
    const severity = (args.severity as string) || 'all';

    const rules = this.registry.getAllRules();
    const filteredRules = rules.filter((rule) => {
      const categoryMatch = category === 'all' || rule.metadata.category.toLowerCase() === category;
      const severityMatch =
        severity === 'all' || rule.metadata.severity.toLowerCase() === severity;
      return categoryMatch && severityMatch;
    });

    const ruleList = filteredRules
      .map((rule) => {
        return `- **${rule.metadata.id}** (${rule.metadata.severity})\n  ${rule.metadata.title}\n  ${rule.metadata.description}`;
      })
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `# Available Rules (${filteredRules.length})\n\n${ruleList}`,
        },
      ],
    };
  }

  /**
   * Explain a specific rule
   */
  private async explainRule(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
  }> {
    const ruleId = args.ruleId as string;

    if (!ruleId) {
      throw new Error('ruleId parameter is required');
    }

    const rule = this.registry.getRule(ruleId);
    if (!rule) {
      return {
        content: [
          {
            type: 'text',
            text: `Rule not found: ${ruleId}`,
          },
        ],
      };
    }

    const explanation = `# ${rule.metadata.title}

**Rule ID**: ${rule.metadata.id}
**Category**: ${rule.metadata.category}
**Severity**: ${rule.metadata.severity}

## Description
${rule.metadata.description}

## Recommendation
${rule.metadata.recommendation || 'Follow Solidity best practices'}

## Additional Information
- **Fixable**: ${rule.metadata.fixable ? 'Yes' : 'No'}
- **Category**: ${rule.metadata.category}
`;

    return {
      content: [
        {
          type: 'text',
          text: explanation,
        },
      ],
    };
  }

  /**
   * Suggest fixes for issues
   */
  private async suggestFixes(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
  }> {
    const code = args.code as string;

    if (!code) {
      throw new Error('Code parameter is required');
    }

    // First analyze to find issues
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
      return {
        content: [
          {
            type: 'text',
            text: 'No issues found! Code looks good. ✅',
          },
        ],
      };
    }

    const suggestions = issues
      .map((issue, index) => {
        return `## Issue ${index + 1}: ${issue.message}

**Location**: Line ${issue.location.start.line}, Column ${issue.location.start.column}
**Severity**: ${issue.severity}
**Rule**: ${issue.ruleId}

**Suggestion**: ${issue.metadata?.suggestion || 'Review and fix according to rule guidelines'}
`;
      })
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `# Fix Suggestions (${issues.length} issues)\n\n${suggestions}`,
        },
      ],
    };
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Solin MCP server running on stdio');
  }
}

/**
 * Start MCP server if run directly
 */
if (require.main === module) {
  const server = new SolinMCPServer();
  server.start().catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}
