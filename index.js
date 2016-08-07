#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const glob = require('glob');

{
  const target = process.argv[2];

  if (target) {
    process.chdir(target);
    console.log(`> cd ${target}`);
  }
}

glob.sync(`**/index.js`).forEach(indexerPath => {
  const dirPath = path.dirname(indexerPath);

  const indexPath = `${dirPath}/index.js`;

  if (!shouldIndex(indexPath)) {
    return;
  }

  const root = {};

  // FIXME: Don't ignore nested index modules.
  glob.sync(`${dirPath}/**/!(index).js`).forEach(modPath => {
    const relModPath = path.relative(dirPath, modPath);

    const objPath = relModPath.split(path.sep);
    let objName = path.basename(objPath.pop(), '.js');

    {
      const objDotPath = objName.split('.');

      if (objDotPath.length > 1) {
        objName = objDotPath.pop();
        objPath.push(...objDotPath);
      }
    }

    objPath.reduce((node, key) => {
      let child = node[key];

      if (!child) {
        child = node[key] = {};
      }

      return child;
    }, root)[objName] = `require('./${relModPath}')`;
  });

  const indexedModPath = `${dirPath}/generated-index.js`;

  fs.writeFileSync(indexedModPath, [
    'module.exports = ' + JSON.stringify(root, null, 2).replace(
      /"(require\(.+\))"/g, '$1'
    ) + ';',
  ].join('\n'));
});

function shouldIndex(_path) {
  let data;

  try {
    data = fs.readFileSync(_path, { encoding: 'utf8' });
  }
  catch(err) {
    return false;
  }

  // FIXME: This is susceptible to false positives and negatives.
  return data.includes(`module.exports = require('./generated-index')`);
}
