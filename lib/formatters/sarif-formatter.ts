/**
 * SARIF Formatter
 *
 * Formats analysis results in SARIF (Static Analysis Results Interchange Format) v2.1.0
 * SARIF is a standard JSON-based format supported by:
 * - GitHub Code Scanning
 * - Azure DevOps
 * - VS Code
 * - Many other CI/CD and IDE tools
 *
 * @see https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
 */

import type { IFormatter, FormatterOptions } from './types';
import type { AnalysisResult, Issue } from '@core/types';
import { Severity } from '@core/types';

/**
 * SARIF report level mapping
 */
const SARIF_LEVEL_MAP: Record<Severity, string> = {
  [Severity.ERROR]: 'error',
  [Severity.WARNING]: 'warning',
  [Severity.INFO]: 'note',
};

/**
 * SARIF formatter options
 */
export interface SarifFormatterOptions extends FormatterOptions {
  /**
   * Whether to include rule help content
   * @default true
   */
  includeRuleHelp?: boolean;

  /**
   * Whether to use pretty printing
   * @default false
   */
  pretty?: boolean;
}

/**
 * SARIF v2.1.0 type definitions
 */
interface SarifMessage {
  text: string;
}

interface SarifRegion {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

interface SarifArtifactLocation {
  uri: string;
  uriBaseId: string;
}

interface SarifPhysicalLocation {
  artifactLocation: SarifArtifactLocation;
  region: SarifRegion;
}

interface SarifLocation {
  physicalLocation: SarifPhysicalLocation;
}

interface SarifResult {
  ruleId: string;
  ruleIndex: number;
  level: string;
  message: SarifMessage;
  locations: SarifLocation[];
}

interface SarifRuleConfiguration {
  level: string;
}

interface SarifRuleProperties {
  category: string;
  tags: string[];
}

interface SarifRule {
  id: string;
  name: string;
  shortDescription: SarifMessage;
  fullDescription?: SarifMessage;
  helpUri?: string;
  defaultConfiguration?: SarifRuleConfiguration;
  properties?: SarifRuleProperties;
}

interface SarifToolDriver {
  name: string;
  version: string;
  informationUri: string;
  semanticVersion: string;
  rules: SarifRule[];
}

interface SarifTool {
  driver: SarifToolDriver;
}

interface SarifRun {
  tool: SarifTool;
  results: SarifResult[];
  columnKind: string;
}

interface SarifReport {
  $schema: string;
  version: string;
  runs: SarifRun[];
}

/**
 * SARIF v2.1.0 formatter
 */
export class SarifFormatter implements IFormatter {
  private options: SarifFormatterOptions;

  constructor(options: SarifFormatterOptions = {}) {
    this.options = {
      includeRuleHelp: true,
      pretty: false,
      ...options,
    };
  }

  /**
   * Format analysis results as SARIF JSON
   */
  format(result: AnalysisResult): string {
    const sarifReport = this.createSarifReport(result);

    return this.options.pretty ? JSON.stringify(sarifReport, null, 2) : JSON.stringify(sarifReport);
  }

  /**
   * Create SARIF report structure
   */
  private createSarifReport(result: AnalysisResult): SarifReport {
    // Collect all unique rules from issues
    const ruleIds = new Set<string>();
    const issuesByRule = new Map<string, Issue[]>();

    for (const fileResult of result.files) {
      for (const issue of fileResult.issues) {
        ruleIds.add(issue.ruleId);

        if (!issuesByRule.has(issue.ruleId)) {
          issuesByRule.set(issue.ruleId, []);
        }
        issuesByRule.get(issue.ruleId)!.push(issue);
      }
    }

    // Create SARIF results
    const sarifResults: SarifResult[] = [];

    for (const fileResult of result.files) {
      for (const issue of fileResult.issues) {
        sarifResults.push(this.createSarifResult(issue, fileResult.filePath));
      }
    }

    // Create SARIF rules
    const sarifRules: SarifRule[] = [];

    for (const ruleId of Array.from(ruleIds).sort()) {
      const issues = issuesByRule.get(ruleId) || [];
      if (issues.length > 0) {
        sarifRules.push(this.createSarifRule(issues[0]!));
      }
    }

    // Create SARIF report
    return {
      $schema:
        'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'Solin',
              version: '0.1.0',
              informationUri: 'https://github.com/0xmhha/solin',
              semanticVersion: '0.1.0',
              rules: sarifRules,
            },
          },
          results: sarifResults,
          columnKind: 'utf16CodeUnits',
        },
      ],
    };
  }

  /**
   * Create SARIF result (individual issue)
   */
  private createSarifResult(issue: Issue, filePath: string): SarifResult {
    const level = SARIF_LEVEL_MAP[issue.severity] || 'warning';

    const result: SarifResult = {
      ruleId: issue.ruleId,
      ruleIndex: 0, // Will be set correctly by the consumer
      level,
      message: {
        text: issue.message,
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: filePath,
              uriBaseId: '%SRCROOT%',
            },
            region: {
              startLine: issue.location.start.line,
              startColumn: issue.location.start.column + 1, // SARIF uses 1-based columns
              endLine: issue.location.end.line,
              endColumn: issue.location.end.column + 1,
            },
          },
        },
      ],
    };

    return result;
  }

  /**
   * Create SARIF rule metadata
   */
  private createSarifRule(issue: Issue): SarifRule {
    const rule: SarifRule = {
      id: issue.ruleId,
      name: this.getRuleName(issue.ruleId),
      shortDescription: {
        text: issue.message,
      },
    };

    // Add help if available and enabled
    if (this.options.includeRuleHelp) {
      const helpUri = this.getHelpUri(issue.ruleId);
      if (helpUri) {
        rule.helpUri = helpUri;
      }

      // Add full description based on category and message
      rule.fullDescription = {
        text: this.getFullDescription(issue),
      };

      // Add default severity level
      const defaultLevel = SARIF_LEVEL_MAP[issue.severity] || 'warning';
      rule.defaultConfiguration = {
        level: defaultLevel,
      };

      // Add properties for categorization
      rule.properties = {
        category: issue.category,
        tags: this.getTags(issue),
      };
    }

    return rule;
  }

  /**
   * Get rule name from rule ID
   */
  private getRuleName(ruleId: string): string {
    // Convert rule ID to readable name
    // e.g., "security/reentrancy" -> "Reentrancy"
    const parts = ruleId.split('/');
    const name = parts[parts.length - 1] || ruleId;
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get help URI for a rule
   */
  private getHelpUri(ruleId: string): string | undefined {
    // Generate documentation URL for the rule
    const baseUrl = 'https://github.com/0xmhha/solin/blob/main/docs/rules';
    const rulePath = ruleId.replace('/', '-');
    return `${baseUrl}/${rulePath}.md`;
  }

  /**
   * Get full description for an issue
   */
  private getFullDescription(issue: Issue): string {
    // Create a more detailed description
    const category = issue.category.toLowerCase();
    return `[${category}] ${issue.message}`;
  }

  /**
   * Get tags for an issue
   */
  private getTags(issue: Issue): string[] {
    const tags: string[] = [issue.category.toLowerCase()];

    // Add severity tag
    const severityTag = Object.keys(Severity).find(
      key => Severity[key as keyof typeof Severity] === issue.severity
    );
    if (severityTag) {
      tags.push(severityTag.toLowerCase());
    }

    // Add specific tags based on rule ID
    const ruleId = issue.ruleId.toLowerCase();

    if (ruleId.includes('security')) {
      tags.push('security');
    }

    if (ruleId.includes('gas')) {
      tags.push('gas-optimization');
    }

    if (ruleId.includes('reentrancy')) {
      tags.push('reentrancy', 'vulnerability');
    }

    if (ruleId.includes('overflow') || ruleId.includes('underflow')) {
      tags.push('arithmetic', 'vulnerability');
    }

    // Remove duplicates
    return Array.from(new Set(tags));
  }
}
