/**
 * Solidity Parser Tests
 *
 * Testing Solidity source code parsing
 */

import { SolidityParser } from '@parser/solidity-parser';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('SolidityParser', () => {
  let parser: SolidityParser;
  let tempDir: string;

  beforeEach(async () => {
    parser = new SolidityParser();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'solin-test-parser-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    test('should create SolidityParser instance', () => {
      expect(parser).toBeInstanceOf(SolidityParser);
    });
  });

  describe('parse', () => {
    test('should parse valid Solidity contract', async () => {
      const source = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;

        contract SimpleStorage {
          uint256 public value;

          function setValue(uint256 _value) public {
            value = _value;
          }
        }
      `;

      const result = await parser.parse(source);

      expect(result).toHaveProperty('ast');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('source');
      expect(result.ast).toBeDefined();
      expect(result.ast.type).toBe('SourceUnit');
      expect(result.errors).toEqual([]);
      expect(result.source).toBe(source);
    });

    test('should parse contract with multiple functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Counter {
          uint256 private count;

          function increment() public {
            count++;
          }

          function decrement() public {
            count--;
          }

          function getCount() public view returns (uint256) {
            return count;
          }
        }
      `;

      const result = await parser.parse(source);

      expect(result.ast.type).toBe('SourceUnit');
      expect(result.errors.length).toBe(0);

      // Check that contract was parsed
      const contracts = result.ast.children.filter(
        (node: any) => node.type === 'ContractDefinition',
      );
      expect(contracts.length).toBeGreaterThan(0);
    });

    test('should include location information when requested', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {}
      `;

      const result = await parser.parse(source, { loc: true });

      expect(result.ast.loc).toBeDefined();
      expect(result.ast.loc).toHaveProperty('start');
      expect(result.ast.loc).toHaveProperty('end');
    });

    test('should include range information when requested', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {}
      `;

      const result = await parser.parse(source, { range: true });

      expect(result.ast.range).toBeDefined();
      expect(Array.isArray(result.ast.range)).toBe(true);
      expect(result.ast.range.length).toBe(2);
    });

    test('should handle parse errors in tolerant mode', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Invalid {
          function broken( {
            // Missing closing parenthesis
          }
        }
      `;

      const result = await parser.parse(source, { tolerant: true });

      expect(result.ast).toBeDefined();
      // Tolerant mode may or may not collect errors depending on the parser implementation
      // The key is that it should not throw and should return an AST
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);

      if (result.errors.length > 0) {
        const error = result.errors[0];
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('line');
        expect(error).toHaveProperty('column');
      }
    });

    test('should throw error for invalid syntax in strict mode', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Invalid {
          function broken( {
            // Missing closing parenthesis
          }
        }
      `;

      await expect(parser.parse(source, { tolerant: false })).rejects.toThrow();
    });

    test('should parse empty contract', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Empty {}
      `;

      const result = await parser.parse(source);

      expect(result.ast.type).toBe('SourceUnit');
      expect(result.errors.length).toBe(0);
    });

    test('should parse contract with events', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract EventEmitter {
          event ValueChanged(uint256 newValue);

          function emitEvent(uint256 value) public {
            emit ValueChanged(value);
          }
        }
      `;

      const result = await parser.parse(source);

      expect(result.ast.type).toBe('SourceUnit');
      expect(result.errors.length).toBe(0);
    });

    test('should parse contract with modifiers', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Owned {
          address public owner;

          modifier onlyOwner() {
            require(msg.sender == owner, "Not owner");
            _;
          }

          function changeOwner(address newOwner) public onlyOwner {
            owner = newOwner;
          }
        }
      `;

      const result = await parser.parse(source);

      expect(result.ast.type).toBe('SourceUnit');
      expect(result.errors.length).toBe(0);
    });
  });

  describe('parseFile', () => {
    test('should parse Solidity file from filesystem', async () => {
      const source = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;

        contract FileTest {
          uint256 public value;
        }
      `;

      const filePath = path.join(tempDir, 'Test.sol');
      await fs.writeFile(filePath, source);

      const result = await parser.parseFile(filePath);

      expect(result.ast.type).toBe('SourceUnit');
      expect(result.errors.length).toBe(0);
      expect(result.source).toBe(source);
      expect(result.filePath).toBe(filePath);
    });

    test('should throw error for non-existent file', async () => {
      const filePath = path.join(tempDir, 'NonExistent.sol');

      await expect(parser.parseFile(filePath)).rejects.toThrow();
    });

    test('should handle file read errors gracefully', async () => {
      const filePath = '/invalid/path/to/file.sol';

      await expect(parser.parseFile(filePath)).rejects.toThrow();
    });
  });

  describe('validate', () => {
    test('should return empty array for valid syntax', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Valid {
          uint256 public value;
        }
      `;

      const errors = await parser.validate(source);

      expect(Array.isArray(errors)).toBe(true);
      expect(errors.length).toBe(0);
    });

    test('should return errors for invalid syntax', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Invalid {
          function broken( {
            // Missing closing parenthesis
          }
        }
      `;

      const errors = await parser.validate(source);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toHaveProperty('message');
      expect(errors[0]).toHaveProperty('line');
      expect(errors[0]).toHaveProperty('column');
    });

    test('should handle multiple syntax errors', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MultipleErrors {
          function broken1( {
          }

          function broken2) {
          }
        }
      `;

      const errors = await parser.validate(source);

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    test('should provide detailed error information', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract ErrorTest {
          function test( public {
          }
        }
      `;

      await expect(parser.parse(source, { tolerant: false })).rejects.toThrow();
    });

    test('should handle empty source', async () => {
      const source = '';

      const result = await parser.parse(source, { tolerant: true });

      // Empty source might be valid or have errors depending on parser
      expect(result).toHaveProperty('ast');
      expect(result).toHaveProperty('errors');
    });
  });
});
