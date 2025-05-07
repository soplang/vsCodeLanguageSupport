const vscode = require("vscode");

/**
 * Formats Soplang code - main entry point for formatting functionality
 * @param {vscode.TextDocument} document
 * @returns {vscode.TextEdit[]}
 */
function formatSoplangCode(document) {
  const edits = [];
  const fullRange = new vscode.Range(
    document.lineAt(0).range.start,
    document.lineAt(document.lineCount - 1).range.end
  );

  // Get the original text from the document
  const originalText = document.getText();

  // Process the text through several formatting steps
  let formattedText = originalText;

  // First apply basic formatting (spacing, operators, etc.)
  formattedText = preProcessComments(formattedText);
  formattedText = formatSoplangOperators(formattedText);
  formattedText = formatSoplangBlocks(formattedText);
  formattedText = formatSoplangStatements(formattedText);

  // Then handle indentation and structure
  formattedText = formatIndentation(formattedText);

  // Finally clean up whitespace and line breaks
  formattedText = removeExcessWhitespace(formattedText);

  edits.push(vscode.TextEdit.replace(fullRange, formattedText));
  return edits;
}

/**
 * Formats indentation using a simple and consistent approach
 * @param {string} text
 * @returns {string}
 */
function formatIndentation(text) {
  const lines = text.split("\n");
  const result = [];
  let indentLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (line === "") {
      result.push("");
      continue;
    }

    // Adjust indent level first for closing braces
    if (line.startsWith("}")) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Special case for else clauses
    if (
      (line.startsWith("haddii_kale") || line.startsWith("haddii_kalena")) &&
      !line.startsWith("}")
    ) {
      // Use parent if indent level
      result.push("    ".repeat(Math.max(0, indentLevel - 1)) + line);
    } else {
      // Apply current indent level
      result.push("    ".repeat(indentLevel) + line);
    }

    // Increase indent after opening braces
    if (line.endsWith("{")) {
      indentLevel++;
    }

    // Special case: Add empty lines between blocks
    if (i < lines.length - 1) {
      const nextLine = lines[i + 1].trim();

      // Add empty line after blocks (if not followed by else)
      if (
        line.endsWith("}") &&
        !nextLine.startsWith("}") &&
        !nextLine.startsWith("haddii_kale") &&
        !nextLine.startsWith("haddii_kalena")
      ) {
        result.push("");
      }

      // Add empty line after statements (except grouped variable declarations)
      if (
        line.endsWith(";") &&
        indentLevel === 0 &&
        !(line.startsWith("door") && nextLine.startsWith("door"))
      ) {
        result.push("");
      }
    }
  }

  return result.join("\n");
}

/**
 * Completely reformats the document with correct indentation and spacing
 * This handles proper indentation, block separation, and root-level code placement
 * @param {string} text
 * @returns {string}
 */
function reformatEntireDocument(text) {
  // Split text into lines for processing
  const lines = text.split("\n");
  const formattedLines = [];

  // Variables to track state
  let indentLevel = 0;
  let inMultiLineComment = false;

  // Process each line
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Skip empty lines
    if (line === "") {
      formattedLines.push("");
      continue;
    }

    // Track multi-line comments
    if (line.startsWith("/*")) inMultiLineComment = true;
    if (line.endsWith("*/")) inMultiLineComment = false;

    // Root level code detection
    const isCommentLine = line.startsWith("//") || inMultiLineComment;
    const isDeclaration =
      line.startsWith("door") ||
      line.startsWith("howl") ||
      line.startsWith("bandhig") ||
      line.startsWith("kuceli");

    // Decrease indentation for closing braces (before adding the line)
    if (line.startsWith("}")) {
      // Don't decrease for else clauses
      if (!line.match(/^} (haddii_kale|haddii_kalena)/)) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
    }

    // Special case for standalone else clauses
    if (
      (line.startsWith("haddii_kale") || line.startsWith("haddii_kalena")) &&
      !line.startsWith("}")
    ) {
      // Use same indent as previous closing brace
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Apply indentation for root level vs. block level
    if (indentLevel === 0 || (isCommentLine && isDeclaration)) {
      // Root level declarations and comments - no indent
      formattedLines.push(line);
    } else {
      // Block level - apply appropriate indent
      formattedLines.push("    ".repeat(indentLevel) + line);
    }

    // Increase indentation after opening brace
    if (line.endsWith("{")) {
      indentLevel++;
    }

    // Handle special case: Add empty line after blocks and statements at same indent level
    if (i < lines.length - 1) {
      const nextLine = lines[i + 1].trim();

      if (
        !nextLine.startsWith("}") &&
        line.endsWith("}") &&
        !nextLine.startsWith("haddii_kale") &&
        !nextLine.startsWith("haddii_kalena")
      ) {
        // Add empty line after closing block (if not followed by else)
        formattedLines.push("");
      } else if (
        line.endsWith(";") &&
        indentLevel === 0 &&
        !line.startsWith("door") &&
        !nextLine.startsWith("door")
      ) {
        // Add empty line after root-level statements (if not variable declarations)
        formattedLines.push("");
      }
    }
  }

  // Final pass to fix root-level code after nested blocks
  const result = [];
  let lastRootLine = -1;

  for (let i = 0; i < formattedLines.length; i++) {
    const line = formattedLines[i].trim();
    const indented = formattedLines[i];

    // If this is a root-level construct
    if (
      line.startsWith("door") ||
      line.startsWith("howl") ||
      line.startsWith("bandhig") ||
      line.startsWith("kuceli") ||
      line.startsWith("//")
    ) {
      // If it's a comment after a root-level code, add spacing
      if (line.startsWith("//") && lastRootLine >= 0 && i - lastRootLine <= 2) {
        result.push(line);
      } else {
        // Otherwise use a newline to separate root level blocks
        if (lastRootLine >= 0 && i - lastRootLine > 2) {
          result.push("");
        }
        result.push(line);
      }

      lastRootLine = i;
    } else {
      // Not root code - keep as is
      result.push(indented);
    }
  }

  return result.join("\n");
}

// ==============================
// Text Preprocessing Functions
// ==============================

/**
 * Pre-processes comments to ensure they're properly formatted
 * @param {string} text
 * @returns {string}
 */
function preProcessComments(text) {
  // Ensure proper spacing for block comments
  let result = text.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    return "\n" + match.trim() + "\n";
  });

  // Ensure line comments end with newlines
  result = result.replace(/\/\/[^\n]*/g, (match) => {
    return match.trim() + "\n";
  });

  // Fix comments directly after code without newlines
  result = result.replace(/([;}])\s*\/\//g, "$1\n//");

  // Fix comments directly after closing braces without newlines
  result = result.replace(/}\s*\/\//g, "}\n//");

  return result;
}

/**
 * Formats operators with consistent spacing
 * @param {string} text
 * @returns {string}
 */
function formatSoplangOperators(text) {
  // Add spaces around operators
  return text
    .replace(/\s*([\+\-\*\/=<>]+)\s*/g, " $1 ")
    .replace(/\s*([,;])\s*/g, "$1 ")
    .replace(/\s+([,;])/g, "$1")
    .replace(/\s*(==|!=|>=|<=|&&|\|\|)\s*/g, " $1 ");
}

// ==============================
// Structure Formatting Functions
// ==============================

/**
 * Formats code blocks with consistent spacing and newlines
 * @param {string} text
 * @returns {string}
 */
function formatSoplangBlocks(text) {
  // Format braces and block structures - brackets on same line
  return text
    .replace(/\)\s*{/g, ") {") // Space before opening brace, on same line
    .replace(/([a-zA-Z0-9_])\s*{/g, "$1 {") // Space before opening brace, on same line
    .replace(/\s*{\s*/g, " {\n") // Newline after opening brace
    .replace(/\s*}\s*/g, "\n}") // Newline before closing brace
    .replace(/{\n\s*}/g, "{ }") // Empty blocks stay on one line
    .replace(/}\s*(haddii_kale|haddii_kalena)/g, "} $1"); // Keep else on same line
}

/**
 * Formats statements with consistent newlines
 * @param {string} text
 * @returns {string}
 */
function formatSoplangStatements(text) {
  // Format statements and line breaks
  let result = text
    .replace(/;\s*/g, ";\n") // Ensure semicolon newlines
    .replace(/(door|tiro|qoraal|boole|waxa|liis|fadhi)\s+/g, "$1 ") // Format variable declarations
    .replace(/(haddii|intaAy|kuCeli|intay|kuceli)\s*\(/g, "$1 (") // Format control statements
    .replace(/\b(soo_celi|bandhig|akhri)\s*\(/g, "$1(") // Format function calls
    .replace(/\/\*[\s\S]*?\*\/\s*/g, (match) => match.trim() + "\n\n") // Format multiline comments
    .replace(/}\s*([^h\s}])/g, "}\n$1"); // Ensure newline after closing brace if followed by code

  // Ensure comments are on their own line
  result = result.replace(/([^;])\s*(\/\/.*)/g, "$1\n$2");

  // Ensure line breaks after trailing comments
  result = result.replace(/(\/\/.*)\s*/g, "$1\n");

  return result;
}

// ==============================
// Whitespace and Cleanup Functions
// ==============================

/**
 * Removes excess whitespace and normalizes line breaks
 * @param {string} text
 * @returns {string}
 */
function removeExcessWhitespace(text) {
  let result = text
    .replace(/\n{3,}/g, "\n\n") // Limit to max 2 consecutive newlines
    .replace(/^\s+\n/gm, "\n") // Remove lines with only whitespace
    .replace(/}\s*\/\//g, "}\n//") // Ensure comments after closing braces are on new line
    .replace(/;\s*\/\//g, ";\n//") // Ensure comments after statements are on new line
    .trim(); // Trim leading/trailing whitespace

  // Ensure comments after statements have newlines
  result = result.replace(/(\/\/.+)\n([^\s\/])/g, "$1\n\n$2");

  // Ensure proper spacing between block comments and code
  result = result.replace(/(\*\/)\s*([^\s\/\n])/g, "$1\n\n$2");

  // Fix comment lines that might have gotten merged with code
  result = result.replace(/([;}])\s*(\/\/[^\n]*)/g, "$1\n$2");

  return result;
}

// Export the formatter functionality
module.exports = {
  formatSoplangCode,
};
