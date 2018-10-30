'use strict';

const argv = require('minimist')(process.argv.slice(2));
const execSync = require('child_process').execSync;
const del = require('del');
const fs = require('fs');
const path = require('path');

const ensureDir = path => del.sync(path) && fs.mkdirSync(output);
const isCommand = (line, cmd) => line && line.startsWith(cmd);
const isEnumFile = filename => filename.endsWith('.j') && filename.includes('$');
const split = str => str.split(/\r?\n/g);

const [input] = argv._;
const output = argv.d;
const name = path.basename(input, '.apk');
const jar = path.join(output, `./${name}.jar`);
const errors = path.join(output, './errors.zip');
const sources = path.join(output, './sources');

ensureDir(output);
exec(`d2j-dex2jar -o ${jar} -e ${errors} ${input}`);
exec(`d2j-jar2jasmin -o ${sources} ${jar}`);

const enumDir = path.join(sources, './com/medium/android/common/generated/obv/post');
const files = fs.readdirSync(enumDir).filter(name => isEnumFile(name));
const enums = files.reduce((acc, filename) => {
  const name = dictName(filename);
  const lines = readLines(filename, enumDir);
  const properties = lines.reduce((acc, _, lineno) => {
    const prev = lines[lineno - 1];
    const curr = lines[lineno];
    if (!isCommand(curr, 'ldc') || !isCommand(prev, 'dup')) return acc;
    const isInvoke = it => !isCommand(it, 'invokespecial');
    const key = readArg(curr);
    const endLineno = findLineno(lines, lineno, isInvoke);
    const value = readArg(lines[endLineno - 1]);
    acc.push({ key, value });
    return acc;
  }, []);
  properties.sort((a, b) => a.value - b.value);
  const dict = properties.reduce((acc, { key, value }) => {
    return Object.assign(acc, { [key]: value });
  }, {});
  return Object.assign(acc, { [name]: dict });
}, {});

console.log(JSON.stringify(enums, null, 2));

function exec(cmd, options) {
  const stdio = ['pipe', process.stderr, process.stderr];
  return execSync(cmd, { stdio, ...options });
}

function dictName(filename) {
  const ext = path.extname(filename);
  return path.basename(filename, ext).split('$')[1];
}

function readLines(filename, dir) {
  const filepath = path.join(dir, filename);
  return split(fs.readFileSync(filepath, 'utf8'));
}

function findLineno(lines, start, cond) {
  let index = start;
  while (cond(lines[index], index)) index += 1;
  return index;
}

function readArg(line) {
  const [command, arg] = line.split(/\s+/g);
  if (isCommand(line, 'ldc')) return JSON.parse(arg);
  if (isCommand(line, 'bipush')) return parseInt(arg, 10);
  if (isCommand(line, 'iconst_')) {
    const [, val] = command.split('_');
    if (val.startsWith('m')) return -parseInt(val.slice(1), 10);
    return parseInt(val, 10);
  }
}
