const parser = require('@solidity-parser/parser');

const code1 = `
pragma solidity ^0.8.0;
contract Test {
  address owner;
  function test() public {
    require(tx.origin == owner);
  }
}
`;

const code2 = `
pragma solidity ^0.8.0;
contract Test {
  function test(address addr) public view returns (bool) {
    return tx.origin == addr;
  }
}
`;

function countTxOrigin(code, label) {
  const ast = parser.parse(code, { loc: true });
  let count = 0;
  
  function walk(node) {
    if (node && typeof node === 'object') {
      if (node.type === 'MemberAccess' && 
          node.memberName === 'origin' && 
          node.expression?.type === 'Identifier' && 
          node.expression?.name === 'tx') {
        count++;
      }
      
      for (const key in node) {
        if (key !== 'loc' && key !== 'range') {
          const value = node[key];
          if (Array.isArray(value)) {
            value.forEach(walk);
          } else {
            walk(value);
          }
        }
      }
    }
  }
  
  walk(ast);
  console.log(`${label}: found ${count} tx.origin`);
}

countTxOrigin(code1, 'require case');
countTxOrigin(code2, 'return case');
