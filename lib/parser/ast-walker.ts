/**
 * AST Walker
 *
 * Traverses Solidity AST using visitor pattern
 */

import type { ASTNode } from './types';

/**
 * Visitor callback for AST traversal
 */
export interface Visitor {
  /**
   * Called when entering a node
   * @returns SKIP to skip children, STOP to stop traversal
   */
  enter?: (node: ASTNode, parent?: ASTNode) => void | symbol;

  /**
   * Called when exiting a node
   */
  exit?: (node: ASTNode, parent?: ASTNode) => void;
}

/**
 * Node predicate function
 */
export type NodePredicate = (node: ASTNode) => boolean;

/**
 * AST Walker for traversing Solidity AST
 */
export class ASTWalker {
  /**
   * Symbol to skip visiting children of current node
   */
  public readonly SKIP = Symbol('SKIP');

  /**
   * Symbol to stop traversal completely
   */
  public readonly STOP = Symbol('STOP');

  /**
   * Walk AST synchronously with visitor pattern
   */
  walkSync(ast: ASTNode, visitor: Visitor): void {
    this.walkNode(ast, visitor, undefined);
  }

  /**
   * Walk AST (async version for future async visitors)
   */
  walk(ast: ASTNode, visitor: Visitor): void {
    this.walkNode(ast, visitor, undefined);
  }

  /**
   * Find all nodes matching predicate
   */
  findNodes(ast: ASTNode, predicate: NodePredicate): ASTNode[] {
    const results: ASTNode[] = [];

    this.walk(ast, {
      enter: node => {
        if (predicate(node)) {
          results.push(node);
        }
        return undefined;
      },
    });

    return results;
  }

  /**
   * Find first node matching predicate
   */
  findNode(ast: ASTNode, predicate: NodePredicate): ASTNode | undefined {
    let result: ASTNode | undefined;

    this.walk(ast, {
      enter: node => {
        if (predicate(node)) {
          result = node;
          return this.STOP;
        }
        return undefined;
      },
    });

    return result;
  }

  /**
   * Get path from root to target node
   */
  getNodePath(ast: ASTNode, target: ASTNode): ASTNode[] {
    const path: ASTNode[] = [];

    const findPath = (node: ASTNode, currentPath: ASTNode[]): boolean => {
      currentPath.push(node);

      if (node === target) {
        path.push(...currentPath);
        return true;
      }

      const children = this.getChildren(node);
      for (const child of children) {
        if (findPath(child, currentPath)) {
          return true;
        }
      }

      currentPath.pop();
      return false;
    };

    findPath(ast, []);
    return path;
  }

  /**
   * Walk a single node and its children
   */
  private walkNode(node: ASTNode, visitor: Visitor, parent: ASTNode | undefined): symbol | void {
    // Call enter callback
    if (visitor.enter) {
      const result = visitor.enter(node, parent);

      // Check if we should stop traversal
      if (result === this.STOP) {
        return this.STOP;
      }

      // Check if we should skip children
      if (result === this.SKIP) {
        // Still call exit for this node
        if (visitor.exit) {
          visitor.exit(node, parent);
        }
        return;
      }
    }

    // Visit children
    const children = this.getChildren(node);
    for (const child of children) {
      const result = this.walkNode(child, visitor, node);
      if (result === this.STOP) {
        return this.STOP;
      }
    }

    // Call exit callback
    if (visitor.exit) {
      visitor.exit(node, parent);
    }
  }

  /**
   * Get children nodes from a node
   */
  private getChildren(node: ASTNode): ASTNode[] {
    const children: ASTNode[] = [];

    // Handle different node structures
    if (Array.isArray((node as any).children)) {
      children.push(...(node as any).children);
    }

    if (Array.isArray((node as any).subNodes)) {
      children.push(...(node as any).subNodes);
    }

    if ((node as any).body) {
      const body = (node as any).body;
      if (Array.isArray(body)) {
        children.push(...body);
      } else if (body && typeof body === 'object') {
        children.push(body);
      }
    }

    if ((node as any).parameters) {
      const params = (node as any).parameters;
      if (Array.isArray(params)) {
        children.push(...params);
      }
    }

    if ((node as any).returnParameters) {
      const returnParams = (node as any).returnParameters;
      if (Array.isArray(returnParams)) {
        children.push(...returnParams);
      }
    }

    if ((node as any).members) {
      const members = (node as any).members;
      if (Array.isArray(members)) {
        children.push(...members);
      }
    }

    if ((node as any).baseContracts) {
      const bases = (node as any).baseContracts;
      if (Array.isArray(bases)) {
        children.push(...bases);
      }
    }

    if ((node as any).modifiers) {
      const mods = (node as any).modifiers;
      if (Array.isArray(mods)) {
        children.push(...mods);
      }
    }

    if ((node as any).statements) {
      const stmts = (node as any).statements;
      if (Array.isArray(stmts)) {
        children.push(...stmts);
      }
    }

    if ((node as any).expression) {
      children.push((node as any).expression);
    }

    if ((node as any).left) {
      children.push((node as any).left);
    }

    if ((node as any).right) {
      children.push((node as any).right);
    }

    // Filter out null/undefined
    return children.filter(child => child !== null && child !== undefined);
  }
}
