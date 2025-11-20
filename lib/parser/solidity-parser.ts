/**
 * Solidity Parser
 *
 * Wrapper around @solidity-parser/parser with enhanced error handling
 */

import * as parser from '@solidity-parser/parser';
import * as fs from 'fs/promises';
import { IParser, ParseOptions, ParseResult, ParseError } from './types';

/**
 * Solidity parser implementation
 */
export class SolidityParser implements IParser {
  /**
   * Parse Solidity source code
   */
  async parse(source: string, options: ParseOptions = {}): Promise<ParseResult> {
    const parseOptions = {
      loc: options.loc ?? true, // Default to true for rule analysis
      range: options.range ?? false,
      tolerant: options.tolerant ?? false,
      comment: options.comment ?? false,
      tokens: options.tokens ?? false,
    };

    try {
      const ast = parser.parse(source, parseOptions);

      return {
        ast,
        errors: [],
        source,
      };
    } catch (error) {
      if (options.tolerant && this.isParserError(error)) {
        // In tolerant mode, return partial AST with errors
        const parseErrors = this.extractAllErrors(error);

        // Try to get partial AST by parsing with tolerant mode enabled
        try {
          const ast = parser.parse(source, { ...parseOptions, tolerant: true });
          return {
            ast,
            errors: parseErrors,
            source,
          };
        } catch (tolerantError) {
          // If even tolerant mode fails, return a minimal AST
          const allErrors = this.isParserError(tolerantError)
            ? this.extractAllErrors(tolerantError)
            : parseErrors;

          return {
            ast: {
              type: 'SourceUnit',
              children: [],
            },
            errors: allErrors,
            source,
          };
        }
      }

      // In strict mode, throw the error
      throw this.enhanceError(error);
    }
  }

  /**
   * Parse Solidity file from filesystem
   */
  async parseFile(filePath: string, options: ParseOptions = {}): Promise<ParseResult> {
    try {
      const source = await fs.readFile(filePath, 'utf-8');
      const result = await this.parse(source, options);

      return {
        ...result,
        filePath,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }

      throw error;
    }
  }

  /**
   * Validate Solidity syntax without full parsing
   */
  async validate(source: string): Promise<ParseError[]> {
    try {
      parser.parse(source, { tolerant: false });
      return [];
    } catch (error) {
      if (this.isParserError(error)) {
        return [this.convertToParseError(error)];
      }

      // Try tolerant mode to collect multiple errors
      try {
        parser.parse(source, { tolerant: true });
        return [];
      } catch (tolerantError) {
        if (this.isParserError(tolerantError)) {
          // Extract all errors from tolerant parse
          return this.extractAllErrors(tolerantError);
        }
        return [
          {
            message: 'Unknown parse error',
            line: 0,
            column: 0,
          },
        ];
      }
    }
  }

  /**
   * Check if error is a parser error
   */
  private isParserError(error: unknown): error is parser.ParserError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'errors' in error &&
      Array.isArray((error as any).errors)
    );
  }

  /**
   * Convert parser error to our ParseError format
   */
  private convertToParseError(error: parser.ParserError): ParseError {
    if (error.errors && error.errors.length > 0) {
      const firstError = error.errors[0];
      if (firstError) {
        return {
          message: firstError.message || 'Parse error',
          line: firstError.line || 0,
          column: firstError.column || 0,
        };
      }
    }

    return {
      message: error.message || 'Parse error',
      line: 0,
      column: 0,
    };
  }

  /**
   * Extract all errors from parser error
   */
  private extractAllErrors(error: parser.ParserError): ParseError[] {
    if (!error.errors || error.errors.length === 0) {
      return [
        {
          message: error.message || 'Parse error',
          line: 0,
          column: 0,
        },
      ];
    }

    return error.errors.map(err => ({
      message: err.message || 'Parse error',
      line: err.line || 0,
      column: err.column || 0,
    }));
  }

  /**
   * Enhance error with additional context
   */
  private enhanceError(error: unknown): Error {
    if (this.isParserError(error)) {
      const parseError = this.convertToParseError(error);
      return new Error(
        `Parse error at line ${parseError.line}, column ${parseError.column}: ${parseError.message}`
      );
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error(String(error));
  }
}
