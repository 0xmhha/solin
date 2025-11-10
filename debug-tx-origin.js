const parser = require('@solidity-parser/parser');

const code = `
pragma solidity ^0.8.0;

contract Test {
  address owner;
  
  function test1() public {
    require(tx.origin == owner);
  }
  
  function test2() public {
    if (tx.origin == owner) {}
  }
  
  function test3() public returns (bool) {
    return tx.origin == owner;
  }
}
`;

try {
  const ast = parser.parse(code, { loc: true, range: false });
  
  function walk(node, depth = 0) {
    const indent = '  '.repeat(depth);
    if (node.type === 'MemberAccess') {
      console.log(`${indent}MemberAccess: ${node.expression?.name}.${node.memberName}`);
    }
    
    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          value.forEach(child => child && typeof child === 'object' && walk(child, depth + 1));
        } else {
          walk(value, depth + 1);
        }
      }
    }
  }
  
  walk(ast);
} catch (e) {
  console.error('Parse error:', e.message);
}
