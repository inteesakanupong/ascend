const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const assets = [...source.matchAll(/`\.\/([^`$]+)\$\{VERSION\}`/g)].map(match => match[1]);

assert.ok(assets.length >= 30, "the service worker should include the complete app shell");
assets.forEach(asset => assert.ok(fs.existsSync(path.join(root, asset)), `missing service-worker asset: ${asset}`));
assert.ok(assets.includes("src/activity/running.js"));
assert.ok(assets.includes("src/planner/weekly-planner.js"));
assert.ok(assets.includes("src/ui/render-running.js"));
assert.ok(assets.includes("src/ui/render-planner.js"));
console.log(`${assets.length} service-worker assets exist.`);
