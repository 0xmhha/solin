/**
 * Parser Types
 *
 * Type definitions for Solidity parsing
 */

// Re-export types from @solidity-parser/parser
export type {
  ASTNode,
  SourceUnit,
  ContractDefinition,
  FunctionDefinition,
  VariableDeclaration,
  ModifierDefinition,
  EventDefinition,
  StateVariableDeclaration,
  Location,
  Range,
} from '@solidity-parser/parser';

/**
 * Parse options
 */
export interface ParseOptions {
  /**
   * Include location information (line, column)
   */
  loc?: boolean;

  /**
   * Include range information (start, end positions)
   */
  range?: boolean;

  /**
   * Tolerant mode - continue parsing on errors
   */
  tolerant?: boolean;

  /**
   * Include comments in AST
   */
  comment?: boolean;

  /**
   * Include token information
   */
  tokens?: boolean;
}

/**
 * Parse result
 */
export interface ParseResult {
  /**
   * Abstract Syntax Tree
   */
  ast: any; // Using any for now, will be typed as SourceUnit

  /**
   * Parse errors (if any)
   */
  errors: ParseError[];

  /**
   * Source code that was parsed
   */
  source: string;

  /**
   * File path (if available)
   */
  filePath?: string;
}

/**
 * Parse error information
 */
export interface ParseError {
  /**
   * Error message
   */
  message: string;

  /**
   * Line number where error occurred
   */
  line: number;

  /**
   * Column number where error occurred
   */
  column: number;

  /**
   * Error code (if available)
   */
  code?: string;
}

/**
 * Parser interface
 */
export interface IParser {
  /**
   * Parse Solidity source code
   */
  parse(source: string, options?: ParseOptions): Promise<ParseResult>;

  /**
   * Parse Solidity file
   */
  parseFile(filePath: string, options?: ParseOptions): Promise<ParseResult>;

  /**
   * Validate Solidity syntax without full parsing
   */
  validate(source: string): Promise<ParseError[]>;
}
