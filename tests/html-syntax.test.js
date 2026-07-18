const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.resolve(__dirname, "..", "index.html"), "utf8");
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1])
  .filter(script => script.trim());

scripts.forEach((script, index) => new vm.Script(script, { filename: `index-inline-${index + 1}.js` }));
console.log(`${scripts.length} inline scripts passed syntax checks.`);
