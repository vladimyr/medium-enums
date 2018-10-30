'use strict';

const { promisify } = require('util');
const argv = require('minimist')(process.argv.slice(2));
const getStdin = require('get-stdin');
const path = require('path');
const writeFile = promisify(require('fs').writeFile);

const jsonify = data => JSON.stringify(data, null, 2);
const enumFile = data => `module.exports = ${jsonify(data)};\n`;
const mainFile = enums => {
  const line = name => `module.exports.${name} = require('./${name}');`;
  const code = enums.map(name => line(name)).join('\n');
  return code + '\n';
};

(async function () {
  const dest = argv.d;
  const enums = JSON.parse(await getStdin());
  const names = Object.keys(enums);
  await Promise.all(names.map(name => {
    const file = path.join(dest, `${name}.js`);
    const data = enums[name];
    return writeFile(file, enumFile(data), 'utf8');
  }));
  return writeFile(path.join(dest, 'index.js'), mainFile(names), 'utf8');
}());
