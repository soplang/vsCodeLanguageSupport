// Test script for the Soplang diagnostics
const fs = require("fs");
const path = require("path");
const assert = require("assert");

// Define directory paths explicitly
const testsDir = __dirname || path.resolve("tests");
const rootDir = path.resolve(testsDir, "..");

// Mock VS Code API
const vscode = {
  Range: class {
    constructor(start, end) {
      this.start = start;
      this.end = end;
    }
  },
  Position: class {
    constructor(line, character) {
      this.line = line;
      this.character = character;
    }
  },
  Diagnostic: class {
    constructor(range, message, severity) {
      this.range = range;
      this.message = message;
      this.severity = severity;
    }
  },
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3,
  },
  languages: {
    createDiagnosticCollection: (name) => ({
      set: (uri, diagnostics) => diagnostics,
      delete: () => {},
    }),
  },
  workspace: {
    onDidOpenTextDocument: () => ({ dispose: () => {} }),
    onDidChangeTextDocument: () => ({ dispose: () => {} }),
    onDidCloseTextDocument: () => ({ dispose: () => {} }),
  },
  window: {
    activeTextEditor: null,
  },
  CodeActionProvider: class {},
  CodeAction: class {
    constructor(title, kind) {
      this.title = title;
      this.kind = kind;
    }
  },
  CodeActionKind: {
    QuickFix: "quickfix",
  },
  WorkspaceEdit: class {
    replace() {}
  },
};

// Create a mock for keyword loading
const soplangKeywords = [
  "door",
  "howl",
  "soo_celi",
  "bandhig",
  "akhri",
  "haddii",
  "haddii_kale",
  "haddii_kalena",
  "ku_celi",
  "intay",
  "jooji",
  "sii_wad",
  "isku_day",
  "qabo",
  "ka_keen",
  "fasalka",
  "ka_dhaxal",
  "cusub",
  "nafta",
  "liis",
  "walax",
  "waxba",
  "run",
  "been",
  "tiro",
  "qoraal",
  "boole",
  "waxa",
  "fadhi",
  "waxaba",
  "kuCeli",
  "intaAy",
  "min",
  "ilaa",
  "fasal",
  "this",
  "dhaxal",
  "keeno",
  "siidaayo",
  "nooc",
  "dherer",
  "soplang",
  "sop",
];

// Directly load our diagnostics module with modifications
const diagnosticsPath = path.join(rootDir, "src/diagnostics.js");
let diagnosticsCode = fs
  .readFileSync(diagnosticsPath, "utf8")
  .replace('const vscode = require("vscode");', "// vscode is mocked")
  .replace(
    /let soplangKeywords = \[\];[\s\S]*?} catch \(error\) {[\s\S]*?}/m,
    "let soplangKeywords = " + JSON.stringify(soplangKeywords) + ";"
  );

// Create a module object and run the code with our mocked vscode
const diagnosticsModule = { exports: {} };
const moduleFunc = new Function(
  "module",
  "exports",
  "vscode",
  "require",
  "__dirname",
  diagnosticsCode
);
moduleFunc(
  diagnosticsModule,
  diagnosticsModule.exports,
  vscode,
  (module) => {
    if (module === "vscode") return vscode;
    if (module === "fs") return fs;
    if (module === "path") return path;
    return null;
  },
  testsDir
);

// Get the diagnostic functions
const { SoplangDiagnostics } = diagnosticsModule.exports;

// Mock document for testing
const createMockDocument = (filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  return {
    getText: () => content,
    languageId: "soplang",
    uri: { fsPath: filePath },
    lineAt: (i) => ({
      text: lines[i],
      range: {
        start: { line: i, character: 0 },
        end: { line: i, character: lines[i].length },
      },
    }),
    lineCount: lines.length,
  };
};

// Run the tests
console.log("Running Soplang Diagnostics Tests...");

// Create diagnostic instance
const diagnostics = new SoplangDiagnostics();

// Test with our error file
const testFilePath = path.join(testsDir, "syntax-error-test.sop");
const doc = createMockDocument(testFilePath);

// Get diagnostics
const results = diagnostics.analyzeSoplangDocument(doc);

// Print results
console.log(`\nFound ${results.length} issues in the test file:\n`);
results.forEach((diagnostic, index) => {
  console.log(`Issue ${index + 1}:`);
  console.log(
    `- Range: Line ${diagnostic.range.start.line}, Chars ${diagnostic.range.start.character}-${diagnostic.range.end.character}`
  );
  console.log(`- Message: ${diagnostic.message}`);
  console.log(`- Code: ${diagnostic.code}`);
  if (diagnostic.data) {
    console.log(`- Suggestion: ${diagnostic.data.suggestion}`);
  }
  console.log("");
});

// Test that we find the expected number of errors
assert(
  results.length >= 8,
  `Expected at least 8 errors but only found ${results.length}`
);

// Test specific error cases
const expectedErrors = [
  {
    line: 4,
    message:
      "Invalid conditional statement. Did you mean 'haddii (condition) {...}'?",
    suggestion: "haddii",
  },
  {
    line: 10,
    message:
      "Invalid conditional statement. Did you mean 'haddii (condition) {...}'?",
    suggestion: "haddii",
  },
  {
    line: 22,
    message: "Invalid loop statement. Did you mean 'ku_celi i min...'?",
    suggestion: "ku_celi",
  },
  {
    line: 27,
    message: "Missing variable declaration. Did you mean 'door magac = ...'?",
    suggestion: "door magac",
  },
  {
    line: 30,
    message:
      "Invalid function declaration. Did you mean 'howl salamBixin(...) {...}'?",
    suggestion: "howl",
  },
  {
    line: 41,
    message: "Invalid return statement. Did you mean 'soo_celi'?",
    suggestion: "soo_celi",
  },
  {
    line: 45,
    message:
      "Invalid conditional statement. Did you mean 'haddii (condition) {...}'?",
    suggestion: "haddii",
  },
];

// Verify each expected error is found
for (const expected of expectedErrors) {
  const found = results.some(
    (d) =>
      d.range.start.line === expected.line - 1 && // Adjust for 0-based line numbers
      d.message === expected.message &&
      d.data?.suggestion === expected.suggestion
  );
  assert(
    found,
    `Expected to find error "${expected.message}" on line ${expected.line}`
  );
}

console.log("All tests completed successfully!");
