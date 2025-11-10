/**
 * AST Walker Tests
 *
 * Testing AST traversal with visitor pattern
 */

import { ASTWalker } from '@parser/ast-walker';
import { SolidityParser } from '@parser/solidity-parser';

describe('ASTWalker', () => {
  let walker: ASTWalker;
  let parser: SolidityParser;

  beforeEach(() => {
    walker = new ASTWalker();
    parser = new SolidityParser();
  });

  describe('constructor', () => {
    test('should create ASTWalker instance', () => {
      expect(walker).toBeInstanceOf(ASTWalker);
    });
  });

  describe('walk', () => {
    test('should visit all nodes in AST', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 public value;

          function setValue(uint256 _value) public {
            value = _value;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const visitedTypes: string[] = [];

      walker.walk(ast, {
        enter(node) {
          visitedTypes.push(node.type);
        },
      });

      expect(visitedTypes.length).toBeGreaterThan(0);
      expect(visitedTypes).toContain('SourceUnit');
      expect(visitedTypes).toContain('ContractDefinition');
      expect(visitedTypes).toContain('FunctionDefinition');
    });

    test('should call enter callback for each node', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Simple {}
      `;

      const { ast } = await parser.parse(source);
      const enterCallback = jest.fn();

      walker.walk(ast, {
        enter: enterCallback,
      });

      expect(enterCallback).toHaveBeenCalled();
      expect(enterCallback.mock.calls.length).toBeGreaterThan(0);
    });

    test('should call exit callback for each node', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Simple {}
      `;

      const { ast } = await parser.parse(source);
      const exitCallback = jest.fn();

      walker.walk(ast, {
        exit: exitCallback,
      });

      expect(exitCallback).toHaveBeenCalled();
    });

    test('should call enter before exit for same node', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {}
      `;

      const { ast } = await parser.parse(source);
      const calls: string[] = [];

      walker.walk(ast, {
        enter(node) {
          calls.push(`enter:${node.type}`);
        },
        exit(node) {
          calls.push(`exit:${node.type}`);
        },
      });

      // For each node type, enter should come before exit
      const contractEnterIndex = calls.indexOf('enter:ContractDefinition');
      const contractExitIndex = calls.indexOf('exit:ContractDefinition');

      expect(contractEnterIndex).toBeLessThan(contractExitIndex);
    });

    test('should traverse in depth-first order', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract First {
          uint256 value;
          function foo() public {}
        }

        contract Second {
          uint256 data;
        }
      `;

      const { ast } = await parser.parse(source);
      const order: string[] = [];

      walker.walk(ast, {
        enter(node) {
          if (node.type === 'ContractDefinition') {
            order.push(`enter:${node.name}`);
          } else if (node.type === 'FunctionDefinition') {
            order.push(`enter:function`);
          }
        },
        exit(node) {
          if (node.type === 'ContractDefinition') {
            order.push(`exit:${node.name}`);
          } else if (node.type === 'FunctionDefinition') {
            order.push(`exit:function`);
          }
        },
      });

      // Depth-first: enter contract, enter function, exit function, exit contract
      const firstContractEnter = order.indexOf('enter:First');
      const firstContractExit = order.indexOf('exit:First');
      const functionEnter = order.indexOf('enter:function');
      const functionExit = order.indexOf('exit:function');

      expect(firstContractEnter).toBeLessThan(functionEnter);
      expect(functionEnter).toBeLessThan(functionExit);
      expect(functionExit).toBeLessThan(firstContractExit);
    });

    test('should provide parent node in callback', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function foo() public {}
        }
      `;

      const { ast } = await parser.parse(source);
      const parents: any[] = [];

      walker.walk(ast, {
        enter(node, parent) {
          if (node.type === 'FunctionDefinition') {
            parents.push(parent);
          }
        },
      });

      expect(parents.length).toBeGreaterThan(0);
      expect(parents[0]?.type).toBe('ContractDefinition');
    });

    test('should handle nodes with no children', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Empty {}
      `;

      const { ast } = await parser.parse(source);

      expect(() => {
        walker.walk(ast, {
          enter: jest.fn(),
        });
      }).not.toThrow();
    });

    test('should support stopping traversal', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test1 {}
        contract Test2 {}
        contract Test3 {}
      `;

      const { ast } = await parser.parse(source);
      const visited: string[] = [];

      walker.walk(ast, {
        enter(node) {
          if (node.type === 'ContractDefinition') {
            visited.push(node.name);
            if (node.name === 'Test2') {
              return walker.STOP;
            }
          }
          return undefined;
        },
      });

      expect(visited).toContain('Test1');
      expect(visited).toContain('Test2');
      // Should stop before Test3
      expect(visited.length).toBeLessThanOrEqual(2);
    });

    test('should support skipping children', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function foo() public {
            uint256 x = 1;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const visited: string[] = [];

      walker.walk(ast, {
        enter(node) {
          visited.push(node.type);
          if (node.type === 'FunctionDefinition') {
            return walker.SKIP;
          }
          return undefined;
        },
      });

      expect(visited).toContain('FunctionDefinition');
      // Should skip children of FunctionDefinition
      expect(visited).not.toContain('Block');
      expect(visited).not.toContain('VariableDeclarationStatement');
    });
  });

  describe('walkSync', () => {
    test('should walk AST synchronously', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {}
      `;

      const { ast } = await parser.parse(source);
      const visited: string[] = [];

      walker.walkSync(ast, {
        enter(node) {
          visited.push(node.type);
        },
      });

      expect(visited.length).toBeGreaterThan(0);
      expect(visited).toContain('ContractDefinition');
    });
  });

  describe('findNodes', () => {
    test('should find all nodes matching predicate', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test1 {}
        contract Test2 {}
        contract Test3 {}
      `;

      const { ast } = await parser.parse(source);

      const contracts = walker.findNodes(
        ast,
        (node) => node.type === 'ContractDefinition',
      );

      expect(contracts.length).toBe(3);
      expect(contracts.every((n) => n.type === 'ContractDefinition')).toBe(
        true,
      );
    });

    test('should return empty array if no matches', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {}
      `;

      const { ast } = await parser.parse(source);

      const events = walker.findNodes(
        ast,
        (node) => node.type === 'EventDefinition',
      );

      expect(events).toEqual([]);
    });
  });

  describe('findNode', () => {
    test('should find first node matching predicate', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test1 {}
        contract Test2 {}
      `;

      const { ast } = await parser.parse(source);

      const contract = walker.findNode(
        ast,
        (node) => node.type === 'ContractDefinition',
      );

      expect(contract).toBeDefined();
      expect(contract?.type).toBe('ContractDefinition');
    });

    test('should return undefined if no match', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {}
      `;

      const { ast } = await parser.parse(source);

      const event = walker.findNode(
        ast,
        (node) => node.type === 'EventDefinition',
      );

      expect(event).toBeUndefined();
    });
  });

  describe('getNodePath', () => {
    test('should return path from root to target node', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function foo() public {}
        }
      `;

      const { ast } = await parser.parse(source);

      const func = walker.findNode(
        ast,
        (node) => node.type === 'FunctionDefinition',
      );

      if (func) {
        const path = walker.getNodePath(ast, func);

        expect(path.length).toBeGreaterThan(0);
        expect(path[0].type).toBe('SourceUnit');
        expect(path[path.length - 1].type).toBe('FunctionDefinition');
      }
    });

    test('should return empty array for root node', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {}
      `;

      const { ast } = await parser.parse(source);
      const path = walker.getNodePath(ast, ast);

      expect(path).toEqual([ast]);
    });
  });
});
