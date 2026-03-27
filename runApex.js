const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ==========================
// 🔹 INPUT
// ==========================
let input = process.argv[2];

if (!input) {
  console.log("Usage:");
  console.log("node runApex.js ClassName");
  console.log("node runApex.js path/to/Class.cls");
  process.exit(1);
}

// ==========================
// 🔹 FIND PROJECT ROOT
// ==========================
function findProjectRoot(startDir) {
  let currentDir = startDir;

  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, "sfdx-project.json"))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

// ==========================
// 🔹 FIND CLASS FILE
// ==========================
function findClassFile(dir, className) {
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir);

  for (let file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const result = findClassFile(fullPath, className);
      if (result) return result;
    } else if (file.toLowerCase() === className.toLowerCase() + ".cls") {
      return fullPath;
    }
  }

  return null;
}

// ==========================
// 🔹 GET PROJECT ROOT
// ==========================
const projectRoot = findProjectRoot(process.cwd());

if (!projectRoot) {
  console.log("Not inside a Salesforce project");
  process.exit(1);
}

const forceAppPath = path.join(projectRoot, "force-app");

// ==========================
// 🔹 RESOLVE FILE PATH
// ==========================
let filePath = input;

if (!input.endsWith(".cls")) {
  filePath = findClassFile(forceAppPath, input);

  if (!filePath) {
    console.log(`Class '${input}' not found inside force-app`);
    process.exit(1);
  }
}

// Normalize path
filePath = path.normalize(filePath);

// ==========================
// 🔹 READ FILE
// ==========================
const fileContent = fs.readFileSync(filePath, "utf-8");

// Extract class name
const className = path.basename(filePath, ".cls");

// ==========================
// 🔹 FIND METHODS (static & non-static)
// ==========================
const methodRegex = /public\s+(static\s+)?[a-zA-Z0-9_<>,\s]+\s+(\w+)\s*\(/g;

let match;
let methods = [];

while ((match = methodRegex.exec(fileContent)) !== null) {
  methods.push({ name: match[2], isStatic: !!match[1] });
}

if (methods.length === 0) {
  console.log("No public methods found in class");
  process.exit(1);
}

// Pick first method
const methodName = methods[0].name;
const isStatic = methods[0].isStatic;

// ==========================
// 🔹 AUTO DEPLOY CLASS (sf CLI compatible)
// ==========================
try {
  console.log(`\nDeploying ${className} to current org...`);
  const deployOutput = execSync(
    `sf project deploy start --source-dir "${filePath}"`,
    { encoding: "utf-8" }
  );
  console.log("✅ Deployment finished successfully\n");
} catch (e) {
  console.error("❌ Deployment failed:");
  console.error(e.stdout || e.message);
  process.exit(1);
}

// ==========================
// 🔹 CREATE TEMP APEX
// ==========================
const apexCode = isStatic
  ? `${className}.${methodName}();`
  : `new ${className}().${methodName}();`;

const tempFilePath = path.join(__dirname, "temp.apex");
fs.writeFileSync(tempFilePath, apexCode);

// ==========================
// 🔹 GET CURRENT ORG
// ==========================
let currentOrg = "Unknown";

try {
  const orgInfo = execSync("sf org display --json", { encoding: "utf-8" });
  const parsed = JSON.parse(orgInfo);
  currentOrg = parsed.result.username;
} catch (e) {
  console.log("Could not detect org");
}

// ==========================
// 🔹 RUN APEX
// ==========================
console.log("=====================================");
console.log(`Running: ${className}.${methodName}()`);
console.log(`File: ${filePath}`);
console.log(`Org: ${currentOrg}`);
console.log("=====================================\n");

try {
  const output = execSync(`sf apex run --file "${tempFilePath}"`, {
    encoding: "utf-8"
  });

  // ==========================
  // 🔹 CLEAN DEBUG OUTPUT (like Java)
  // ==========================
  const debugLines = output
    .split("\n")
    .filter(line => line.includes("USER_DEBUG"))
    .map(line => {
      const parts = line.split("|");
      return parts[parts.length - 1];
    });

  if (debugLines.length === 0) {
    console.log("No debug logs found");
  } else {
    debugLines.forEach(line => console.log(line));
  }

  console.log("\nApex executed successfully");
} catch (err) {
  console.error("ERROR:\n");
  console.error(err.stdout || err.message);
}