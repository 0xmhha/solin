/**
 * Solin VS Code Extension
 *
 * Provides Solidity static analysis directly in VS Code
 */

import * as vscode from 'vscode';
import { SolinDiagnosticsProvider } from './diagnostics';

let diagnosticsProvider: SolinDiagnosticsProvider;
let outputChannel: vscode.OutputChannel;

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel('Solin');
  outputChannel.appendLine('Solin extension activated');

  // Create diagnostics provider
  diagnosticsProvider = new SolinDiagnosticsProvider(outputChannel);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('solin.analyzeFile', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === 'solidity') {
        diagnosticsProvider.analyzeDocument(editor.document);
      } else {
        vscode.window.showWarningMessage('No Solidity file is currently open');
      }
    }),

    vscode.commands.registerCommand('solin.analyzeWorkspace', () => {
      diagnosticsProvider.analyzeWorkspace();
    }),

    vscode.commands.registerCommand('solin.showOutput', () => {
      outputChannel.show();
    }),

    vscode.commands.registerCommand('solin.clearDiagnostics', () => {
      diagnosticsProvider.clearDiagnostics();
      vscode.window.showInformationMessage('Solin diagnostics cleared');
    })
  );

  // Register event handlers
  const config = vscode.workspace.getConfiguration('solin');

  // Analyze on open
  if (config.get<boolean>('analyzeOnOpen')) {
    context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument(document => {
        if (document.languageId === 'solidity') {
          diagnosticsProvider.analyzeDocument(document);
        }
      })
    );
  }

  // Analyze on save
  if (config.get<boolean>('analyzeOnSave')) {
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(document => {
        if (document.languageId === 'solidity') {
          diagnosticsProvider.analyzeDocument(document);
        }
      })
    );
  }

  // Clear diagnostics when document is closed
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(document => {
      if (document.languageId === 'solidity') {
        diagnosticsProvider.clearDocumentDiagnostics(document.uri);
      }
    })
  );

  // Watch for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('solin')) {
        diagnosticsProvider.updateConfiguration();
      }
    })
  );

  // Analyze currently open Solidity files
  if (config.get<boolean>('enable')) {
    vscode.workspace.textDocuments.forEach(document => {
      if (document.languageId === 'solidity') {
        diagnosticsProvider.analyzeDocument(document);
      }
    });
  }

  outputChannel.appendLine('Solin extension ready');
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  if (diagnosticsProvider) {
    diagnosticsProvider.dispose();
  }
  if (outputChannel) {
    outputChannel.dispose();
  }
}
