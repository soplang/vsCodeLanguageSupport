const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

// Load Soplang keywords from the dictionary file
let soplangKeywords = [];
try {
  const dictionaryPath = path.join(__dirname, "../dictionaries/soplang.txt");
  const dictionaryContent = fs.readFileSync(dictionaryPath, "utf8");
  soplangKeywords = dictionaryContent
    .split("\n")
    .filter((line) => line.trim() !== "");
} catch (error) {
  console.error("Error loading Soplang keywords:", error);
}

/**
 * Common programming keywords that might be mistakenly used instead of Soplang keywords
 */
const commonKeywordMappings = {
  // Function declarations
  fun: "howl",
  function: "howl",
  func: "howl",
  def: "howl",
  fn: "howl",
  method: "howl",
  kowl: "howl",

  // Variable declarations
  let: "door",
  var: "door",
  const: "door",
  int: "door",
  float: "door",
  string: "door",
  boolean: "door",

  // Control flow
  if: "haddii",
  else: "haddii_kale",
  "else if": "haddii_kale",
  elif: "haddii_kale",
  for: "ku_celi",
  while: "intay",
  continue: "sii_wad",
  break: "jooji",
  return: "soo_celi",
  try: "isku_day",
  catch: "qabo",

  // Output
  print: "bandhig",
  console: "bandhig",
  log: "bandhig",
  write: "bandhig",
  echo: "bandhig",

  // Input
  input: "akhri",
  read: "akhri",
  scan: "akhri",
  get: "akhri",
};

/**
 * Calculates the Levenshtein distance between two strings
 * This helps find similar keywords for suggestions
 */
function levenshteinDistance(a, b) {
  const matrix = [];

  // Initialize the matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find similar Soplang keywords based on Levenshtein distance
 */
function findSimilarKeywords(word, maxDistance = 3) {
  return soplangKeywords
    .filter((keyword) => levenshteinDistance(word, keyword) <= maxDistance)
    .sort(
      (a, b) => levenshteinDistance(word, a) - levenshteinDistance(word, b)
    );
}

/**
 * Check if a word might be a misspelled or incorrect Soplang keyword
 */
function checkForIncorrectKeyword(word) {
  // Check if it's a common programming keyword with a direct mapping
  if (commonKeywordMappings[word]) {
    return {
      isIncorrect: true,
      suggestion: commonKeywordMappings[word],
      reason: `'${word}' is not a valid keyword in Soplang. Did you mean '${commonKeywordMappings[word]}'?`,
    };
  }

  // Skip words that are already valid Soplang keywords
  if (soplangKeywords.includes(word)) {
    return { isIncorrect: false };
  }

  // Find similar keywords based on Levenshtein distance
  const similarKeywords = findSimilarKeywords(word);
  if (similarKeywords.length > 0) {
    return {
      isIncorrect: true,
      suggestion: similarKeywords[0],
      reason: `'${word}' is not a valid keyword in Soplang. Did you mean '${similarKeywords[0]}'?`,
    };
  }

  return { isIncorrect: false };
}

/**
 * Tracks variable declarations within document scopes
 */
class VariableTracker {
  constructor() {
    this.reset();
  }

  reset() {
    this.scopes = [new Map()]; // Start with global scope
    this.currentScope = 0;
    this.functionParams = new Map(); // Track function parameters
  }

  enterScope() {
    this.scopes.push(new Map());
    this.currentScope++;
  }

  exitScope() {
    if (this.currentScope > 0) {
      this.scopes.pop();
      this.currentScope--;
    }
  }

  declareVariable(name, location, isInitialized = true) {
    // Check if variable exists in current scope
    if (this.scopes[this.currentScope].has(name)) {
      return {
        isDuplicate: true,
        previousDeclaration: this.scopes[this.currentScope].get(name),
        message: `Variable '${name}' is already declared in this scope. Cannot redeclare.`,
      };
    }

    // Store the variable in current scope with initialization status
    this.scopes[this.currentScope].set(name, { location, isInitialized });
    return { isDuplicate: false };
  }

  trackFunctionParameters(funcName, params) {
    // Check for duplicate parameters
    const uniqueParams = new Set();
    const duplicateParams = [];

    params.forEach((param) => {
      if (uniqueParams.has(param)) {
        duplicateParams.push(param);
      } else {
        uniqueParams.add(param);
      }
    });

    this.functionParams.set(funcName, {
      params: Array.from(uniqueParams),
      duplicates: duplicateParams,
    });

    return duplicateParams;
  }

  isVariableDeclared(name) {
    // Check all scopes from current to global
    for (let i = this.currentScope; i >= 0; i--) {
      if (this.scopes[i].has(name)) {
        return true;
      }
    }
    return false;
  }

  isVariableInitialized(name) {
    // Check all scopes from current to global
    for (let i = this.currentScope; i >= 0; i--) {
      if (this.scopes[i].has(name)) {
        return this.scopes[i].get(name).isInitialized;
      }
    }
    return false;
  }
}

/**
 * Class that manages the diagnostics for Soplang files
 */
class SoplangDiagnostics {
  constructor() {
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection("soplang");
    this.variableTracker = new VariableTracker();

    // Define syntax patterns for structure validation based on EBNF grammar
    this.syntaxPatterns = [
      // Conditional statements without braces
      {
        pattern: /\b(haddii|haddii_kale)\s*\(([^)]*)\)(?!\s*{)/g,
        validate: (match, line) => {
          // Don't flag if the next non-whitespace character after the closing parenthesis is semicolon
          const afterParen = line
            .substring(match.index + match[0].length)
            .trim();
          if (afterParen.startsWith(";")) return null;

          return {
            isInvalid: true,
            message: `Missing '{}' after '${match[1]}'. Example: '${match[1]} (${match[2]}) { bandhig("example") }'`,
            code: "missing-braces",
            suggestion: `${match[1]} (${match[2]}) {`,
            startPos: match.index,
            endPos: match.index + match[0].length,
          };
        },
      },

      // Assignment operator in conditionals (= instead of ==)
      {
        pattern:
          /\b(haddii|haddii_kale|intay)\s*\([^)]*?([^=!<>])=[^=][^)]*?\)/g,
        validate: (match, line) => {
          const assignIndex = match[0].indexOf("=", match[1].length);
          if (assignIndex !== -1) {
            return {
              isInvalid: true,
              message: `Using assignment operator '=' in a conditional. Did you mean '==' for comparison?`,
              code: "incorrect-operator",
              suggestion: "==",
              startPos: match.index + assignIndex,
              endPos: match.index + assignIndex + 1,
              originalText: "=",
            };
          }
          return null;
        },
      },

      // Incorrect conditional keywords
      {
        pattern: /\b(if|else\s*if|else|elif)\s*\(/g,
        validate: (match, line) => {
          const keywordMap = {
            if: "haddii",
            "else if": "haddii_kale",
            else: "haddii_kalena",
            elif: "haddii_kale",
          };

          const incorrectKeyword = match[1].trim();
          const correctKeyword = keywordMap[incorrectKeyword] || "haddii"; // Default to 'haddii' if not found

          return {
            isInvalid: true,
            message: `'${incorrectKeyword}' is not a valid keyword in Soplang. Did you mean '${correctKeyword}'?`,
            code: "incorrect-keyword",
            suggestion: correctKeyword,
            startPos: match.index,
            endPos: match.index + incorrectKeyword.length,
            originalText: incorrectKeyword,
          };
        },
      },

      // For loops without required 'min' keyword
      {
        pattern: /\b(ku_celi)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(?!min)/g,
        validate: (match, line) => {
          return {
            isInvalid: true,
            message: `Missing 'min' keyword in for loop. Example: 'ku_celi ${match[2]} min 1 ilaa 10 { ... }'`,
            code: "missing-min-keyword",
            suggestion: `${match[1]} ${match[2]} min`,
            startPos: match.index,
            endPos: match.index + match[0].length,
            originalText: match[0],
          };
        },
      },

      // While loops without braces
      {
        pattern: /\b(intay)\s*\(([^)]*)\)(?!\s*{)/g,
        validate: (match, line) => {
          // Don't flag if the next non-whitespace character after the closing parenthesis is semicolon
          const afterParen = line
            .substring(match.index + match[0].length)
            .trim();
          if (afterParen.startsWith(";")) return null;

          return {
            isInvalid: true,
            message: `Missing '{}' after 'intay'. Example: 'intay (${match[2]}) { ... }'`,
            code: "missing-braces",
            suggestion: `${match[1]} (${match[2]}) {`,
            startPos: match.index,
            endPos: match.index + match[0].length,
            originalText: match[0],
          };
        },
      },

      // Incorrect loop keywords
      {
        pattern: /\b(for|while|looping|myloop)\b/g,
        validate: (match, line) => {
          const keywordMap = {
            for: "ku_celi",
            while: "intay",
            looping: "ku_celi",
            myloop: "intay",
          };

          const incorrectKeyword = match[1];
          const correctKeyword = keywordMap[incorrectKeyword];

          return {
            isInvalid: true,
            message: `'${incorrectKeyword}' is not a valid keyword in Soplang. Did you mean '${correctKeyword}'?`,
            code: "incorrect-keyword",
            suggestion: correctKeyword,
            startPos: match.index,
            endPos: match.index + incorrectKeyword.length,
            originalText: incorrectKeyword,
          };
        },
      },

      // Function declarations without braces
      {
        pattern: /\b(howl)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)(?!\s*{)/g,
        validate: (match, line) => {
          // Don't flag if the function is followed by a semicolon (might be a forward declaration)
          const afterMatch = line
            .substring(match.index + match[0].length)
            .trim();
          if (afterMatch.startsWith(";")) return null;

          return {
            isInvalid: true,
            message: `Missing '{}' in function definition. Example: 'howl ${match[2]}(...) { ... }'`,
            code: "missing-braces",
            suggestion: `${match[0]} {`,
            startPos: match.index,
            endPos: match.index + match[0].length,
            originalText: match[0],
          };
        },
      },

      // Incorrect function declaration keywords
      {
        pattern: /\b(function|func|fn|def)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
        validate: (match, line) => {
          const incorrectKeyword = match[1];

          return {
            isInvalid: true,
            message: `'${incorrectKeyword}' is not a valid keyword in Soplang. Did you mean 'howl'?`,
            code: "incorrect-keyword",
            suggestion: "howl",
            startPos: match.index,
            endPos: match.index + incorrectKeyword.length,
            originalText: incorrectKeyword,
          };
        },
      },

      // Incorrect return statements
      {
        pattern: /\b(return)\b/g,
        validate: (match, line) => {
          return {
            isInvalid: true,
            message: `'return' is not a valid keyword in Soplang. Did you mean 'soo_celi'?`,
            code: "incorrect-keyword",
            suggestion: "soo_celi",
            startPos: match.index,
            endPos: match.index + match[1].length,
            originalText: "return",
          };
        },
      },

      // Print statements using non-Soplang syntax
      {
        pattern: /\b(console\.log|print|echo|log)\s*\(/g,
        validate: (match, line) => {
          const incorrectKeyword = match[1];

          return {
            isInvalid: true,
            message: `'${incorrectKeyword}' is not a valid function in Soplang. Did you mean 'bandhig'?`,
            code: "incorrect-function",
            suggestion: "bandhig",
            startPos: match.index,
            endPos: match.index + incorrectKeyword.length,
            originalText: incorrectKeyword,
          };
        },
      },

      // Incorrect variable declarations
      {
        pattern: /\b(let|var|const)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
        validate: (match, line) => {
          const incorrectKeyword = match[1];

          return {
            isInvalid: true,
            message: `'${incorrectKeyword}' is not a valid keyword in Soplang. Did you mean 'door'?`,
            code: "incorrect-keyword",
            suggestion: "door",
            startPos: match.index,
            endPos: match.index + incorrectKeyword.length,
            originalText: incorrectKeyword,
          };
        },
      },

      // Improved: Strict check for qoraal (string) variables to require quotes
      {
        pattern:
          /\b(qoraal)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^'"][^;]*?)(?:$|;)/g,
        validate: (match, line) => {
          // Skip if it's already a properly quoted string
          if (/=\s*['"]/.test(match[0])) {
            return null;
          }

          // Get the value to quote it properly
          const value = match[3].trim();

          return {
            isInvalid: true,
            message: `Type mismatch: 'qoraal' (string) variables must have string values enclosed in quotes.`,
            code: "missing-string-quotes",
            suggestion: `qoraal ${match[2]} = "${value}"`,
            startPos: match.index,
            endPos: match.index + match[0].length,
            originalText: match[0],
          };
        },
      },

      // Improved: Type check for tiro (number) variables
      {
        pattern: /\b(tiro)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+?)(?:$|;)/g,
        validate: (match, line) => {
          const value = match[3].trim();

          // Check if the value is enclosed in quotes (either single or double)
          if (/(^['"].*['"]$)/.test(value)) {
            return {
              isInvalid: true,
              message: `Type mismatch: 'tiro' (number) variables cannot have string values (enclosed in quotes).`,
              code: "type-mismatch-number",
              suggestion: `tiro ${match[2]} = ${value.replace(/['"]/g, "")}`,
              startPos: match.index,
              endPos: match.index + match[0].length,
              originalText: match[0],
            };
          }

          // If it's a numeric value, it's valid
          if (/^-?\d+(\.\d+)?$/.test(value)) {
            return null;
          }

          // If it looks like a string or other non-numeric value
          return {
            isInvalid: true,
            message: `Type mismatch: 'tiro' (number) variables must have numeric values.`,
            code: "type-mismatch-number",
            suggestion: `tiro ${match[2]} = 0`,
            startPos: match.index,
            endPos: match.index + match[0].length,
            originalText: match[0],
          };
        },
      },

      // Improved: Type check for jajab (float) variables
      {
        pattern: /\b(jajab)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+?)(?:$|;)/g,
        validate: (match, line) => {
          const value = match[3].trim();

          // Check if the value is enclosed in quotes (either single or double)
          if (/(^['"].*['"]$)/.test(value)) {
            return {
              isInvalid: true,
              message: `Type mismatch: 'jajab' (float) variables cannot have string values (enclosed in quotes).`,
              code: "type-mismatch-float",
              suggestion: `jajab ${match[2]} = ${value.replace(/['"]/g, "")}`,
              startPos: match.index,
              endPos: match.index + match[0].length,
              originalText: match[0],
            };
          }

          // If it's a numeric value, it's valid
          if (/^-?\d+(\.\d+)?$/.test(value)) {
            return null;
          }

          // If it looks like a string or other non-numeric value
          return {
            isInvalid: true,
            message: `Type mismatch: 'jajab' (float) variables must have numeric values.`,
            code: "type-mismatch-float",
            suggestion: `jajab ${match[2]} = 0.0`,
            startPos: match.index,
            endPos: match.index + match[0].length,
            originalText: match[0],
          };
        },
      },

      // Improved: Type check for boole/labadaran (boolean) variables
      {
        pattern:
          /\b(boole|labadaran)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+?)(?:$|;)/g,
        validate: (match, line) => {
          const value = match[3].trim();

          // Check if the value is enclosed in quotes (either single or double)
          if (/(^['"].*['"]$)/.test(value)) {
            return {
              isInvalid: true,
              message: `Type mismatch: '${match[1]}' (boolean) variables cannot have string values (enclosed in quotes).`,
              code: "type-mismatch-boolean",
              suggestion: `${match[1]} ${match[2]} = run`,
              startPos: match.index,
              endPos: match.index + match[0].length,
              originalText: match[0],
            };
          }

          // If it's a valid boolean value, it's valid
          if (/^(run|been|true|false)$/.test(value)) {
            return null;
          }

          // If it's not a valid boolean value
          return {
            isInvalid: true,
            message: `Type mismatch: '${match[1]}' (boolean) variables must have boolean values (run/been).`,
            code: "type-mismatch-boolean",
            suggestion: `${match[1]} ${match[2]} = run`,
            startPos: match.index,
            endPos: match.index + match[0].length,
            originalText: match[0],
          };
        },
      },

      // Check for malformed string literals with open/close quotes mismatch
      {
        pattern: /=\s*(['"])(?:(?!\1).)*[^\\]\1\1/g,
        validate: (match, line) => {
          return {
            isInvalid: true,
            message: `Malformed string literal. Don't repeat quote characters. Use single or double quotes consistently.`,
            code: "malformed-string",
            suggestion: match[0].replace(/(['"])\1$/, "$1"),
            startPos: match.index,
            endPos: match.index + match[0].length,
            originalText: match[0],
          };
        },
      },

      // Check for proper use of door vs. typed declaration
      {
        pattern:
          /\b(door)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(['"].*['"]|true|false|run|been|\d+\.\d+)/g,
        validate: (match, line) => {
          // Detect what kind of value it is
          let suggestedType = "door";
          let reason = "";

          if (match[3].startsWith('"') || match[3].startsWith("'")) {
            suggestedType = "qoraal";
            reason = "string";
          } else if (["true", "false", "run", "been"].includes(match[3])) {
            suggestedType = "boole";
            reason = "boolean";
          } else if (match[3].includes(".")) {
            suggestedType = "jajab";
            reason = "decimal";
          } else if (/^\d+$/.test(match[3])) {
            suggestedType = "tiro";
            reason = "integer";
          }

          // Only suggest if we found a more specific type
          if (suggestedType !== "door") {
            return {
              isInvalid: false, // This is just a suggestion, not an error
              message: `Consider using '${suggestedType}' instead of 'door' for ${reason} values.`,
              code: "type-suggestion",
              suggestion: `${suggestedType} ${match[2]} = ${match[3]}`,
              startPos: match.index,
              endPos: match.index + match[1].length,
              originalText: match[1],
              severity: vscode.DiagnosticSeverity.Information,
            };
          }

          return null;
        },
      },

      // New pattern to detect invalid escape sequence errors
      {
        pattern: /"(?:[^"\\]|\\[^"\\/btnfr])+"/g,
        validate: (match, line) => {
          // Find invalid escape sequences in the string
          const str = match[0];
          const invalidEscapeMatch = str.match(/\\([^"\\/btnfr])/);

          if (invalidEscapeMatch) {
            const escapedChar = invalidEscapeMatch[1];
            const escapePos = str.indexOf(`\\${escapedChar}`);

            return {
              isInvalid: true,
              message: `Invalid escape sequence '\\${escapedChar}' in string. Valid escapes are: \\", \\\\, \\b, \\t, \\n, \\f, \\r.`,
              code: "invalid-escape",
              suggestion: str.replace(`\\${escapedChar}`, escapedChar),
              startPos: match.index + escapePos,
              endPos: match.index + escapePos + 2,
              originalText: `\\${escapedChar}`,
            };
          }

          return null;
        },
      },

      // Check for unclosed strings
      {
        pattern: /"(?:[^"\\]|\\.)*$|'(?:[^'\\]|\\.)*$/g,
        validate: (match, line) => {
          // This pattern will catch unclosed strings at the end of a line
          const openQuote = match[0][0]; // first character (opening quote)

          return {
            isInvalid: true,
            message: `Unclosed string. Missing closing ${openQuote} quote.`,
            code: "unclosed-string",
            suggestion: `${match[0]}${openQuote}`,
            startPos: match.index,
            endPos: match.index + match[0].length,
            originalText: match[0],
          };
        },
      },
    ];
  }

  /**
   * Activate the diagnostics for the current document
   */
  activate(context) {
    // Register handlers for document events
    context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument(this.updateDiagnostics, this),
      vscode.workspace.onDidChangeTextDocument(
        (event) => this.updateDiagnostics(event.document),
        this
      ),
      vscode.workspace.onDidCloseTextDocument((doc) => {
        this.diagnosticCollection.delete(doc.uri);
      }),
      vscode.languages.registerCodeActionsProvider(
        "soplang",
        new SoplangCodeActionProvider(),
        {
          providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
        }
      )
    );

    // Run the first diagnostic on the active editor if it exists
    if (vscode.window.activeTextEditor) {
      this.updateDiagnostics(vscode.window.activeTextEditor.document);
    }
  }

  /**
   * Update diagnostics for the given document
   */
  updateDiagnostics(document) {
    if (document.languageId !== "soplang") {
      return;
    }

    const diagnostics = this.analyzeSoplangDocument(document);
    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * Analyze the document for errors
   */
  analyzeSoplangDocument(document) {
    const text = document.getText();
    const diagnostics = [];
    this.variableTracker.reset();

    // Split the document into lines for easier processing
    const lines = text.split(/\r?\n/);

    let inBlockComment = false;
    let openBraces = 0;
    let currentFunctionName = null;

    // First pass: collect structure information and variable declarations
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      // Skip empty lines
      if (!line.trim()) {
        continue;
      }

      // Handle block comments
      if (line.includes("/*")) {
        inBlockComment = true;
      }
      if (line.includes("*/")) {
        inBlockComment = false;
        continue;
      }
      if (inBlockComment) {
        continue;
      }

      // Skip single-line comments
      if (line.trim().startsWith("//")) {
        continue;
      }

      // Preprocess the line to mask string literals
      const { maskedLine, stringMap } = this.maskStringLiterals(line);

      // Track function declarations to collect parameters
      const funcPattern = /\bhowl\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/g;
      let funcMatch;

      while ((funcMatch = funcPattern.exec(maskedLine)) !== null) {
        currentFunctionName = funcMatch[1];
        const params = funcMatch[2]
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p !== "");

        // Track parameters and check for duplicates
        const duplicateParams = this.variableTracker.trackFunctionParameters(
          currentFunctionName,
          params
        );

        // Add diagnostics for duplicate parameters
        if (duplicateParams.length > 0) {
          for (const dupParam of duplicateParams) {
            const paramIndex = line.indexOf(dupParam, line.indexOf("("));

            // Check if parameter is in a string
            const isInString = stringMap.some(
              (str) => paramIndex >= str.start && paramIndex < str.end
            );

            if (isInString) {
              continue;
            }

            const startPos = new vscode.Position(lineIndex, paramIndex);
            const endPos = new vscode.Position(
              lineIndex,
              paramIndex + dupParam.length
            );
            const range = new vscode.Range(startPos, endPos);

            const diagnostic = new vscode.Diagnostic(
              range,
              `Duplicate parameter '${dupParam}' in function '${currentFunctionName}'. Parameter names must be unique.`,
              vscode.DiagnosticSeverity.Error
            );

            diagnostic.code = "duplicate-parameter";
            diagnostics.push(diagnostic);
          }
        }
      }

      // Helper function to check if position is in a string
      const isInString = (position) => {
        return stringMap.some(
          (str) => position >= str.start && position < str.end
        );
      };

      // Track brace scope for variable tracking
      // Skip braces that are inside string literals
      for (let i = 0; i < line.length; i++) {
        if (isInString(i)) {
          continue;
        }

        const char = line[i];
        if (char === "{") {
          this.variableTracker.enterScope();
          openBraces++;
        } else if (char === "}") {
          this.variableTracker.exitScope();
          openBraces = Math.max(0, openBraces - 1);

          // Reset current function when exiting function scope
          if (currentFunctionName && openBraces === 0) {
            currentFunctionName = null;
          }
        }
      }
    }

    // Second pass: process each line for errors
    inBlockComment = false;
    this.variableTracker.reset();
    openBraces = 0;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      // Skip empty lines
      if (!line.trim()) {
        continue;
      }

      // Handle block comments
      if (line.includes("/*")) {
        inBlockComment = true;
      }
      if (line.includes("*/")) {
        inBlockComment = false;
        continue;
      }
      if (inBlockComment) {
        continue;
      }

      // Skip single-line comments
      if (line.trim().startsWith("//")) {
        continue;
      }

      // Preprocess the line to mask string literals for the second pass
      const { maskedLine, stringMap } = this.maskStringLiterals(line);

      // Helper function to check if position is in a string
      const isInString = (position) => {
        return stringMap.some(
          (str) => position >= str.start && position < str.end
        );
      };

      // Track brace scope
      for (let i = 0; i < line.length; i++) {
        if (isInString(i)) {
          continue;
        }

        const char = line[i];
        if (char === "{") {
          this.variableTracker.enterScope();
          openBraces++;
        } else if (char === "}") {
          this.variableTracker.exitScope();
          openBraces = Math.max(0, openBraces - 1);
        }
      }

      // Process tokens in the line
      this.processLineTokens(document, line, lineIndex, diagnostics);
    }

    return diagnostics;
  }

  /**
   * Process tokens in a line to find errors
   */
  processLineTokens(document, line, lineIndex, diagnostics) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith("//")) {
      return;
    }

    // Preprocess the line to mask string literals
    // This is a more robust approach to prevent false positives in strings
    const { maskedLine, stringMap } = this.maskStringLiterals(line);

    // Track all valid identifiers to avoid false positives
    const validIdentifiers = new Set();

    // First pass: collect all valid identifiers using the masked line
    // Variable declarations
    const varDeclRegex =
      /\b(door|tiro|qoraal|boole)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let varMatch;
    while ((varMatch = varDeclRegex.exec(maskedLine)) !== null) {
      validIdentifiers.add(varMatch[2]);

      // Check if the variable has an initializer
      const hasInitializer = maskedLine
        .substring(varMatch.index + varMatch[0].length)
        .trim()
        .startsWith("=");

      // Track the variable declaration
      const result = this.variableTracker.declareVariable(
        varMatch[2],
        { line: lineIndex, column: varMatch.index },
        hasInitializer
      );

      // Add diagnostic for duplicate variable declaration
      if (result.isDuplicate) {
        const startPos = new vscode.Position(
          lineIndex,
          varMatch.index + varMatch[1].length + 1
        );
        const endPos = new vscode.Position(
          lineIndex,
          varMatch.index + varMatch[0].length
        );
        const range = new vscode.Range(startPos, endPos);

        const diagnostic = new vscode.Diagnostic(
          range,
          result.message,
          vscode.DiagnosticSeverity.Error
        );

        diagnostic.code = "duplicate-variable";
        diagnostics.push(diagnostic);
      }
    }

    // Function parameters and names
    const funcParamRegex = /\b(howl)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/g;
    let funcMatch;
    while ((funcMatch = funcParamRegex.exec(maskedLine)) !== null) {
      // Add function name
      validIdentifiers.add(funcMatch[2]);

      // Add parameters
      const params = funcMatch[3].split(",").map((p) => p.trim());
      params.forEach((param) => {
        if (param && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(param)) {
          validIdentifiers.add(param);
          this.variableTracker.declareVariable(param, null, true);
        }
      });
    }

    // Loop variables
    const loopVarRegex = /\b(ku_celi)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+min/g;
    let loopMatch;
    while ((loopMatch = loopVarRegex.exec(maskedLine)) !== null) {
      validIdentifiers.add(loopMatch[2]);
      this.variableTracker.declareVariable(loopMatch[2], null, true);
    }

    // Check for variable usage before initialization
    const variableUsageRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b(?!\s*=|\s*\()/g;
    let usageMatch;
    while ((usageMatch = variableUsageRegex.exec(maskedLine)) !== null) {
      const varName = usageMatch[1];

      // Skip if it's a keyword
      if (soplangKeywords.includes(varName)) {
        continue;
      }

      // Check if it's a known identifier but hasn't been initialized
      if (
        this.variableTracker.isVariableDeclared(varName) &&
        !this.variableTracker.isVariableInitialized(varName)
      ) {
        const startPos = new vscode.Position(lineIndex, usageMatch.index);
        const endPos = new vscode.Position(
          lineIndex,
          usageMatch.index + varName.length
        );
        const range = new vscode.Range(startPos, endPos);

        const diagnostic = new vscode.Diagnostic(
          range,
          `Variable '${varName}' is used without initialization.`,
          vscode.DiagnosticSeverity.Error
        );

        diagnostic.code = "uninitialized-variable";
        diagnostics.push(diagnostic);
      }

      // Add to valid identifiers to avoid false positives in keyword checks
      if (this.variableTracker.isVariableDeclared(varName)) {
        validIdentifiers.add(varName);
      }
    }

    // Add previously declared variables
    for (const scope of this.variableTracker.scopes) {
      for (const [name] of scope) {
        validIdentifiers.add(name);
      }
    }

    // Apply syntax pattern validation
    this.applySyntaxPatternValidation(
      document,
      line,
      maskedLine,
      lineIndex,
      diagnostics,
      validIdentifiers,
      stringMap
    );

    // Check for standalone variable assignments without declaration
    this.checkUndeclaredVariableAssignments(
      document,
      line,
      maskedLine,
      lineIndex,
      diagnostics,
      validIdentifiers
    );

    // Check for incorrect keywords that aren't caught by syntax patterns
    this.checkIncorrectKeywords(
      document,
      line,
      maskedLine,
      lineIndex,
      diagnostics,
      validIdentifiers
    );
  }

  /**
   * Mask string literals in a line to prevent false positives
   * @param {string} line The line of code to mask
   * @returns {object} Object containing the masked line and a map of string positions
   */
  maskStringLiterals(line) {
    const stringMap = [];
    let maskedLine = line;

    // First, collect all string literals
    const stringRegex = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;
    let match;

    while ((match = stringRegex.exec(line)) !== null) {
      const str = match[0];
      const start = match.index;
      const end = start + str.length;

      stringMap.push({
        start,
        end,
        content: str,
        length: str.length,
      });
    }

    // Replace strings with placeholder spaces while preserving length
    // We process in reverse order to avoid messing up indices
    for (let i = stringMap.length - 1; i >= 0; i--) {
      const { start, length } = stringMap[i];
      const placeholder = " ".repeat(length); // Replace with spaces to maintain character positions
      maskedLine =
        maskedLine.substring(0, start) +
        placeholder +
        maskedLine.substring(start + length);
    }

    return { maskedLine, stringMap };
  }

  /**
   * Apply syntax pattern validation based on defined patterns
   */
  applySyntaxPatternValidation(
    document,
    originalLine,
    maskedLine,
    lineIndex,
    diagnostics,
    validIdentifiers,
    stringMap
  ) {
    // Function to check if a given position range is inside a string
    const isInString = (start, length) => {
      const end = start + length;
      return stringMap.some(
        (str) =>
          (start >= str.start && start < str.end) ||
          (end > str.start && end <= str.end) ||
          (start <= str.start && end >= str.end)
      );
    };

    for (const { pattern, validate } of this.syntaxPatterns) {
      pattern.lastIndex = 0;
      let match;

      // Special case for string-specific patterns like unclosed strings
      const isStringPattern =
        pattern.toString().includes('(?:[^"\\\\]|\\\\.) *$') || // unclosed string
        pattern.toString().includes('\\\\[^"\\\\/btnfr]'); // invalid escape

      if (isStringPattern) {
        // Apply these patterns to the original line since they work on strings
        while ((match = pattern.exec(originalLine)) !== null) {
          const validation = validate(match, originalLine);
          if (validation && validation.isInvalid) {
            // Create diagnostic
            this.createDiagnostic(
              document,
              lineIndex,
              validation,
              match,
              diagnostics
            );
          }
        }
        continue;
      }

      // For normal patterns, use the masked line
      while ((match = pattern.exec(maskedLine)) !== null) {
        // Skip if any part of the match was originally in a string
        if (isInString(match.index, match[0].length)) {
          continue;
        }

        const validation = validate(match, originalLine);
        if (validation && validation.isInvalid) {
          // Skip if the validation region is in a string
          if (
            isInString(
              validation.startPos,
              validation.endPos - validation.startPos
            )
          ) {
            continue;
          }

          // Create diagnostic
          this.createDiagnostic(
            document,
            lineIndex,
            validation,
            match,
            diagnostics
          );
        }
      }
    }
  }

  /**
   * Helper to create diagnostics from validation results
   */
  createDiagnostic(document, lineIndex, validation, match, diagnostics) {
    const startPos = new vscode.Position(lineIndex, validation.startPos);
    const endPos = new vscode.Position(lineIndex, validation.endPos);
    const range = new vscode.Range(startPos, endPos);

    const diagnostic = new vscode.Diagnostic(
      range,
      validation.message,
      vscode.DiagnosticSeverity.Error
    );

    diagnostic.code = validation.code;

    if (validation.suggestion) {
      diagnostic.data = {
        suggestion: validation.suggestion,
        original: validation.originalText || match[0],
      };
    }

    diagnostics.push(diagnostic);
  }

  /**
   * Check for standalone variable assignments without declaration
   */
  checkUndeclaredVariableAssignments(
    document,
    originalLine,
    maskedLine,
    lineIndex,
    diagnostics,
    validIdentifiers
  ) {
    const standaloneAssignmentRegex = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=/;
    const assignMatch = maskedLine.match(standaloneAssignmentRegex);

    if (
      assignMatch &&
      !validIdentifiers.has(assignMatch[1]) &&
      !this.variableTracker.isVariableDeclared(assignMatch[1])
    ) {
      const range = new vscode.Range(
        new vscode.Position(lineIndex, 0),
        new vscode.Position(lineIndex, assignMatch[1].length)
      );

      const diagnostic = new vscode.Diagnostic(
        range,
        `Undefined variable '${assignMatch[1]}'. Declare it first using 'door'.`,
        vscode.DiagnosticSeverity.Error
      );

      diagnostic.code = "missing-declaration";
      diagnostic.data = {
        suggestion: `door ${assignMatch[1]}`,
        original: assignMatch[1],
      };

      diagnostics.push(diagnostic);
    }
  }

  /**
   * Check for incorrect keywords not caught by syntax patterns
   */
  checkIncorrectKeywords(
    document,
    originalLine,
    maskedLine,
    lineIndex,
    diagnostics,
    validIdentifiers
  ) {
    const wordRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    let wordMatch;

    while ((wordMatch = wordRegex.exec(maskedLine)) !== null) {
      const word = wordMatch[1];

      // Skip if is valid identifier, or is valid keyword
      if (validIdentifiers.has(word) || soplangKeywords.includes(word)) {
        continue;
      }

      // Check against common incorrect keywords
      const check = checkForIncorrectKeyword(word);
      if (check.isIncorrect) {
        const startPos = new vscode.Position(lineIndex, wordMatch.index);
        const endPos = new vscode.Position(
          lineIndex,
          wordMatch.index + word.length
        );
        const range = new vscode.Range(startPos, endPos);

        const diagnostic = new vscode.Diagnostic(
          range,
          check.reason,
          vscode.DiagnosticSeverity.Error
        );

        diagnostic.code = "incorrect-keyword";
        diagnostic.data = {
          suggestion: check.suggestion,
          original: word,
        };

        diagnostics.push(diagnostic);
      }
    }
  }
}

/**
 * Code action provider for quick fixes
 */
class SoplangCodeActionProvider {
  provideCodeActions(document, range, context, token) {
    const actions = [];

    // Process all diagnostics that have fix data
    for (const diagnostic of context.diagnostics) {
      if (diagnostic.code) {
        switch (diagnostic.code) {
          case "incorrect-keyword":
          case "incorrect-function":
          case "incorrect-operator":
            this.createSimpleReplacementFix(document, diagnostic, actions);
            break;

          case "missing-braces":
            this.createMissingBracesFix(document, diagnostic, actions);
            break;

          case "missing-semicolon":
            this.createMissingSemicolonFix(document, diagnostic, actions);
            break;

          case "missing-declaration":
            this.createMissingDeclarationFix(document, diagnostic, actions);
            break;

          case "missing-min-keyword":
            this.createSimpleReplacementFix(document, diagnostic, actions);
            break;

          case "duplicate-variable":
          case "uninitialized-variable":
            this.createVariableIssueFix(document, diagnostic, actions);
            break;

          case "duplicate-parameter":
            this.createDuplicateParameterFix(document, diagnostic, actions);
            break;

          case "unclosed-string":
            this.createUnclosedStringFix(document, diagnostic, actions);
            break;

          case "invalid-escape":
            this.createInvalidEscapeFix(document, diagnostic, actions);
            break;

          case "invalid-string-format":
          case "malformed-string":
          case "type-mismatch-number":
          case "type-mismatch-boolean":
          case "type-mismatch-string":
            this.createSimpleReplacementFix(document, diagnostic, actions);
            break;

          case "type-suggestion":
            this.createTypeImprovement(document, diagnostic, actions);
            break;
        }
      }
    }

    return actions;
  }

  /**
   * Create a fix for unclosed strings
   */
  createUnclosedStringFix(document, diagnostic, actions) {
    if (diagnostic.data && diagnostic.data.suggestion) {
      const fixTitle = "Add closing quote";

      const fix = new vscode.CodeAction(
        fixTitle,
        vscode.CodeActionKind.QuickFix
      );

      fix.edit = new vscode.WorkspaceEdit();
      fix.edit.replace(
        document.uri,
        diagnostic.range,
        diagnostic.data.suggestion
      );
      fix.diagnostics = [diagnostic];
      fix.isPreferred = true;
      actions.push(fix);
    }
  }

  /**
   * Create a fix for invalid escape sequences in strings
   */
  createInvalidEscapeFix(document, diagnostic, actions) {
    if (diagnostic.data && diagnostic.data.suggestion) {
      const fixTitle = "Remove invalid escape";

      const fix = new vscode.CodeAction(
        fixTitle,
        vscode.CodeActionKind.QuickFix
      );

      fix.edit = new vscode.WorkspaceEdit();
      fix.edit.replace(
        document.uri,
        diagnostic.range,
        diagnostic.data.suggestion
      );
      fix.diagnostics = [diagnostic];
      fix.isPreferred = true;
      actions.push(fix);

      // Add a second action to show the valid escape sequences
      const helpFix = new vscode.CodeAction(
        "Show valid escape sequences",
        vscode.CodeActionKind.QuickFix
      );

      helpFix.command = {
        title: "Show Valid Escape Sequences",
        command: "editor.action.showHover",
      };

      helpFix.diagnostics = [diagnostic];
      actions.push(helpFix);
    }
  }

  /**
   * Create a simple text replacement fix
   */
  createSimpleReplacementFix(document, diagnostic, actions) {
    if (diagnostic.data && diagnostic.data.suggestion) {
      const fixTitle = `Replace with '${diagnostic.data.suggestion}'`;

      const fix = new vscode.CodeAction(
        fixTitle,
        vscode.CodeActionKind.QuickFix
      );

      fix.edit = new vscode.WorkspaceEdit();
      fix.edit.replace(
        document.uri,
        diagnostic.range,
        diagnostic.data.suggestion
      );
      fix.diagnostics = [diagnostic];
      fix.isPreferred = true;
      actions.push(fix);
    }
  }

  /**
   * Create a fix for missing braces
   */
  createMissingBracesFix(document, diagnostic, actions) {
    if (diagnostic.data && diagnostic.data.suggestion) {
      const fixTitle = "Add missing braces";

      const fix = new vscode.CodeAction(
        fixTitle,
        vscode.CodeActionKind.QuickFix
      );

      // Get the original text and determine indentation
      const lineText = document.lineAt(diagnostic.range.start.line).text;
      const indentation = lineText.match(/^\s*/)[0];
      const extraIndent = indentation + "    "; // 4 spaces for inner content

      // Create properly formatted code with braces
      let newText;
      if (diagnostic.data.suggestion.includes("{")) {
        // Only add the opening brace if it's in the suggestion
        newText = `${diagnostic.data.suggestion}\n${extraIndent}\n${indentation}}`;
      } else {
        newText = diagnostic.data.suggestion;
      }

      fix.edit = new vscode.WorkspaceEdit();
      fix.edit.replace(document.uri, diagnostic.range, newText);
      fix.diagnostics = [diagnostic];
      fix.isPreferred = true;
      actions.push(fix);
    }
  }

  /**
   * Create a fix for missing semicolons
   */
  createMissingSemicolonFix(document, diagnostic, actions) {
    if (diagnostic.data && diagnostic.data.suggestion) {
      const fixTitle = "Add missing semicolon";

      const fix = new vscode.CodeAction(
        fixTitle,
        vscode.CodeActionKind.QuickFix
      );

      fix.edit = new vscode.WorkspaceEdit();
      fix.edit.replace(
        document.uri,
        diagnostic.range,
        diagnostic.data.suggestion
      );
      fix.diagnostics = [diagnostic];
      fix.isPreferred = true;
      actions.push(fix);
    }
  }

  /**
   * Create a fix for missing variable declarations
   */
  createMissingDeclarationFix(document, diagnostic, actions) {
    if (diagnostic.data && diagnostic.data.suggestion) {
      const fixTitle = "Add 'door' declaration";

      const fix = new vscode.CodeAction(
        fixTitle,
        vscode.CodeActionKind.QuickFix
      );

      fix.edit = new vscode.WorkspaceEdit();
      fix.edit.replace(
        document.uri,
        diagnostic.range,
        diagnostic.data.suggestion
      );
      fix.diagnostics = [diagnostic];
      fix.isPreferred = true;
      actions.push(fix);
    }
  }

  /**
   * Create a fix for variable issues
   */
  createVariableIssueFix(document, diagnostic, actions) {
    if (diagnostic.code === "uninitialized-variable") {
      // Extract variable name from the message
      const match = diagnostic.message.match(/Variable '([^']+)'/);
      if (match) {
        const varName = match[1];
        const fixTitle = `Initialize '${varName}' first`;

        const fix = new vscode.CodeAction(
          fixTitle,
          vscode.CodeActionKind.QuickFix
        );

        // Insert a variable initialization before this line
        const lineText = document.lineAt(diagnostic.range.start.line).text;
        const indentation = lineText.match(/^\s*/)[0];
        const insertPosition = new vscode.Position(
          diagnostic.range.start.line,
          0
        );

        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.insert(
          document.uri,
          insertPosition,
          `${indentation}door ${varName} = 0; // Initialize variable\n${indentation}`
        );
        fix.diagnostics = [diagnostic];
        fix.isPreferred = false;
        actions.push(fix);
      }
    }

    // For duplicate variables, offer to rename
    if (diagnostic.code === "duplicate-variable") {
      const match = diagnostic.message.match(/Variable '([^']+)'/);
      if (match) {
        const varName = match[1];
        const fixTitle = `Rename duplicate variable '${varName}'`;

        const fix = new vscode.CodeAction(
          fixTitle,
          vscode.CodeActionKind.QuickFix
        );

        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.replace(document.uri, diagnostic.range, `${varName}_2`);
        fix.diagnostics = [diagnostic];
        fix.isPreferred = true;
        actions.push(fix);
      }
    }
  }

  /**
   * Create a fix for duplicate parameters
   */
  createDuplicateParameterFix(document, diagnostic, actions) {
    const match = diagnostic.message.match(/Duplicate parameter '([^']+)'/);
    if (match) {
      const paramName = match[1];
      const fixTitle = `Rename duplicate parameter '${paramName}'`;

      const fix = new vscode.CodeAction(
        fixTitle,
        vscode.CodeActionKind.QuickFix
      );

      fix.edit = new vscode.WorkspaceEdit();
      fix.edit.replace(document.uri, diagnostic.range, `${paramName}_2`);
      fix.diagnostics = [diagnostic];
      fix.isPreferred = true;
      actions.push(fix);
    }
  }

  /**
   * Create a fix for type improvement suggestions
   */
  createTypeImprovement(document, diagnostic, actions) {
    if (diagnostic.data && diagnostic.data.suggestion) {
      const fixTitle = `Use more specific type: ${
        diagnostic.data.suggestion.split(" ")[0]
      }`;

      const fix = new vscode.CodeAction(
        fixTitle,
        vscode.CodeActionKind.QuickFix
      );

      fix.edit = new vscode.WorkspaceEdit();
      fix.edit.replace(
        document.uri,
        diagnostic.range,
        diagnostic.data.suggestion.split(" ")[0] // Just the type name
      );
      fix.diagnostics = [diagnostic];
      fix.isPreferred = true;
      actions.push(fix);
    }
  }
}

module.exports = {
  SoplangDiagnostics,
  SoplangCodeActionProvider,
};
