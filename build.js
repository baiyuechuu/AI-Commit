#!/usr/bin/env node

import fs from "fs";

// Create dist directory if it doesn't exist
if (!fs.existsSync("dist")) {
	fs.mkdirSync("dist");
}

// Read the built bundle
const bundlePath = "dist/index.js";
if (!fs.existsSync(bundlePath)) {
	console.error('Bundle not found. Run "npm run build" first.');
	process.exit(1);
}

let bundle = fs.readFileSync(bundlePath, "utf8");

// Remove any existing shebang from bundle
bundle = bundle.replace(/^#!.*\n/, '');

// Create executable script
const executable = `#!/usr/bin/env node
${bundle}`;

// Write executable
const executablePath = "dist/aicommit";
fs.writeFileSync(executablePath, executable);

// Make executable
fs.chmodSync(executablePath, "755");

console.log("Executable created at dist/aicommit");
console.log("To install globally, run: npm run install:bin");

