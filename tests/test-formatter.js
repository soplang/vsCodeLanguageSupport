// Test script for the Soplang formatter
const fs = require("fs");
const path = require("path");

// Mock VS Code API
const vscode = {
  Range: class {
    constructor(start, end) {
      this.start = start;
      this.end = end;
    }
  },
  TextEdit: {
    replace: (range, text) => ({ range, text }),
  },
};

// Mock document
const createMockDocument = (filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  return {
    getText: () => content,
    lineAt: (i) => ({
      range: {
        start: i,
        end: i,
      },
    }),
    lineCount: lines.length,
  };
};

// Load formatter with mocked vscode module
const formatterPath = path.join(__dirname, "../src/formatter.js");
const formatterCode = fs
  .readFileSync(formatterPath, "utf8")
  .replace('const vscode = require("vscode");', "// vscode is mocked");

// Create a module object to load the formatter
const formatterModule = {
  exports: {},
};

// Execute the formatter code with our mocked vscode
const moduleFunc = new Function("module", "exports", "vscode", formatterCode);
moduleFunc(formatterModule, formatterModule.exports, vscode);

// Get the formatter functions
const { formatSoplangCode } = formatterModule.exports;

// Test files
const testFiles = ["complex-test.sop", "test.sop"];

// Run tests
testFiles.forEach((file) => {
  const testFilePath = path.join(__dirname, file);
  const doc = createMockDocument(testFilePath);
  const formatted = formatSoplangCode(doc)[0].text;

  console.log(`\n===== Formatted ${file} =====\n`);
  console.log(formatted);

  // Save the formatted output to a new file
  const outputPath = path.join(__dirname, `formatted-${file}`);
  fs.writeFileSync(outputPath, formatted);
  console.log(`\nSaved formatted output to ${outputPath}`);
});

console.log("\nAll tests completed successfully!");
