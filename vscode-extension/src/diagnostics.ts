/**
 * Solin Diagnostics Provider
 *
 * Provides VS Code diagnostics from Solin analysis results
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Solin issue from JSON output
 */
interface SolinIssue {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  filePath: string;
  location: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

/**
 * Solin analysis result
 */
interface SolinResult {
  files: Array<{
    filePath: string;
    issues: SolinIssue[];
  }>;
  totalIssues: number;
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

/**
 * Diagnostics Provider
 */
export class SolinDiagnosticsProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private outputChannel: vscode.OutputChannel;
  private isAnalyzing = false;

  constructor(outputChannel: vscode.OutputChannel) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('solin');
    this.outputChannel = outputChannel;
  }

  /**
   * Analyze a single document
   */
  async analyzeDocument(document: vscode.TextDocument): Promise<void> {
    const config = vscode.workspace.getConfiguration('solin');

    if (!config.get<boolean>('enable')) {
      return;
    }

    if (this.isAnalyzing) {
      return;
    }

    this.isAnalyzing = true;

    try {
      this.outputChannel.appendLine(`Analyzing: ${document.fileName}`);

      const result = await this.runSolin(document.fileName);

      if (result) {
        this.updateDiagnostics(document.uri, result);
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error analyzing ${document.fileName}: ${error}`);
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Analyze entire workspace
   */
  async analyzeWorkspace(): Promise<void> {
    const config = vscode.workspace.getConfiguration('solin');

    if (!config.get<boolean>('enable')) {
      vscode.window.showWarningMessage('Solin is disabled');
      return;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showWarningMessage('No workspace folder open');
      return;
    }

    this.isAnalyzing = true;

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Running Solin analysis...',
          cancellable: false,
        },
        async () => {
          for (const folder of workspaceFolders) {
            this.outputChannel.appendLine(`Analyzing workspace: ${folder.uri.fsPath}`);

            const result = await this.runSolin(folder.uri.fsPath);

            if (result) {
              // Update diagnostics for each file
              for (const fileResult of result.files) {
                const uri = vscode.Uri.file(fileResult.filePath);
                this.updateDiagnosticsForFile(uri, fileResult.issues);
              }

              // Show summary
              vscode.window.showInformationMessage(
                `Solin: Found ${result.totalIssues} issues ` +
                  `(${result.summary.errors} errors, ` +
                  `${result.summary.warnings} warnings, ` +
                  `${result.summary.info} info)`
              );
            }
          }
        }
      );
    } catch (error) {
      this.outputChannel.appendLine(`Error analyzing workspace: ${error}`);
      vscode.window.showErrorMessage(`Solin analysis failed: ${error}`);
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Clear all diagnostics
   */
  clearDiagnostics(): void {
    this.diagnosticCollection.clear();
  }

  /**
   * Clear diagnostics for a specific document
   */
  clearDocumentDiagnostics(uri: vscode.Uri): void {
    this.diagnosticCollection.delete(uri);
  }

  /**
   * Update configuration
   */
  updateConfiguration(): void {
    this.outputChannel.appendLine('Configuration updated');
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.diagnosticCollection.dispose();
  }

  /**
   * Run Solin CLI and get results
   */
  private async runSolin(target: string): Promise<SolinResult | null> {
    const config = vscode.workspace.getConfiguration('solin');
    const configFile = config.get<string>('configFile');

    let command = `npx solin "${target}" --format json`;

    if (configFile) {
      command += ` --config "${configFile}"`;
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        timeout: 60000,
      });

      if (stderr) {
        this.outputChannel.appendLine(`Solin stderr: ${stderr}`);
      }

      if (stdout) {
        return JSON.parse(stdout) as SolinResult;
      }
    } catch (error: unknown) {
      // Solin exits with non-zero when issues found, but still outputs JSON
      const execError = error as { stdout?: string; stderr?: string; message?: string };
      if (execError.stdout) {
        try {
          return JSON.parse(execError.stdout) as SolinResult;
        } catch {
          // Not valid JSON
        }
      }

      this.outputChannel.appendLine(`Solin error: ${execError.message || error}`);
    }

    return null;
  }

  /**
   * Update diagnostics from Solin result
   */
  private updateDiagnostics(uri: vscode.Uri, result: SolinResult): void {
    // Find issues for this file
    const fileResult = result.files.find(
      f => path.resolve(f.filePath) === path.resolve(uri.fsPath)
    );

    if (fileResult) {
      this.updateDiagnosticsForFile(uri, fileResult.issues);
    } else {
      // No issues found, clear diagnostics
      this.diagnosticCollection.set(uri, []);
    }
  }

  /**
   * Update diagnostics for a specific file
   */
  private updateDiagnosticsForFile(uri: vscode.Uri, issues: SolinIssue[]): void {
    const config = vscode.workspace.getConfiguration('solin');
    const maxProblems = config.get<number>('maxProblems') || 100;

    const diagnostics: vscode.Diagnostic[] = issues
      .slice(0, maxProblems)
      .map(issue => this.issueToDiagnostic(issue));

    this.diagnosticCollection.set(uri, diagnostics);

    this.outputChannel.appendLine(
      `Updated diagnostics for ${uri.fsPath}: ${diagnostics.length} issues`
    );
  }

  /**
   * Convert Solin issue to VS Code diagnostic
   */
  private issueToDiagnostic(issue: SolinIssue): vscode.Diagnostic {
    const range = new vscode.Range(
      issue.location.start.line - 1, // VS Code is 0-indexed
      issue.location.start.column,
      issue.location.end.line - 1,
      issue.location.end.column
    );

    const severity = this.getSeverity(issue.severity);

    const diagnostic = new vscode.Diagnostic(range, issue.message, severity);

    diagnostic.source = 'solin';
    diagnostic.code = issue.ruleId;

    return diagnostic;
  }

  /**
   * Map Solin severity to VS Code severity
   */
  private getSeverity(solinSeverity: string): vscode.DiagnosticSeverity {
    const config = vscode.workspace.getConfiguration('solin');

    const severityMap: Record<string, keyof typeof vscode.DiagnosticSeverity> = {
      error: config.get('severity.error') || 'Error',
      warning: config.get('severity.warning') || 'Warning',
      info: config.get('severity.info') || 'Information',
    };

    const vscodeSeverity = severityMap[solinSeverity] || 'Warning';

    return vscode.DiagnosticSeverity[vscodeSeverity];
  }
}
