const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

/**
 * This class provides hover information for Soplang keywords
 */
class SoplangHoverProvider {
  constructor() {
    // Define hover descriptions for common Soplang keywords
    this.keywordDescriptions = {
      // Core keywords
      door: {
        description:
          "Variable Declaration - Used to declare variables in Soplang.",
        example: 'door x = 10\ndoor magac = "Sharafdin"',
        usage: "Declare variables with any type (numbers, strings, booleans).",
      },
      howl: {
        description: "Function Declaration - Defines a function in Soplang.",
        example: 'howl salaam(magac) {\n    qor("Salaan, " + magac)\n}',
        usage: 'To call the function: salaam("Sharafdin")',
      },
      qor: {
        description: "Print Statement - Outputs text to the console.",
        example: 'qor("Hello, World!")\nqor("Value: " + x)',
        usage: "Can print strings, variables, or expressions.",
      },
      akhri: {
        description: "Input Function - Reads user input from the console.",
        example: 'door magac = akhri("Fadlan gali magacaaga: ")',
        usage: "Stores the input value in a variable.",
      },
      soo_celi: {
        description: "Return Statement - Returns a value from a function.",
        example: "howl isuDar(a, b) {\n    soo_celi a + b\n}",
        usage: "Used to return values from functions.",
      },

      // Control flow
      haddii: {
        description: "If Statement - Used for conditionals in Soplang.",
        example: 'haddii (x > 5) {\n    qor("X waa weyn!")\n}',
        usage: "Executes code block if the condition is true.",
      },
      haddii_kale: {
        description:
          "Else If Statement - Secondary condition after an if statement.",
        example:
          'haddii (x > 10) {\n    qor("X aad buu weyn yahay!")\n} haddii_kale (x > 5) {\n    qor("X waa weyn!")\n}',
        usage: "Used for multiple conditions in sequence.",
      },
      haddii_kalena: {
        description: "Else Statement - Alternative when if condition is false.",
        example:
          'haddii (x > 5) {\n    qor("X waa weyn!")\n} haddii_kalena {\n    qor("X waa yar!")\n}',
        usage: "Executes when no other conditions are true.",
      },

      // Loops
      ku_celi: {
        description: "For Loop - Iterates a specific number of times.",
        example: 'ku_celi i min 1 ilaa 5 {\n    qor("Tirinta: " + i)\n}',
        usage: "Loops from start value to end value.",
      },
      inta_ay: {
        description: "While Loop - Executes as long as a condition is true.",
        example: "door i = 0\ninta_ay (i < 5) {\n    qor(i)\n    i = i + 1\n}",
        usage: "Continues looping while the condition remains true.",
      },
      jooji: {
        description: "Break Statement - Exits the current loop.",
        example:
          "ku_celi i min 1 ilaa 10 {\n    haddii (i == 5) {\n        jooji\n    }\n    qor(i)\n}",
        usage: "Immediately exits the enclosing loop.",
      },
      sii_wad: {
        description:
          "Continue Statement - Skips to the next iteration of a loop.",
        example:
          "ku_celi i min 1 ilaa 5 {\n    haddii (i == 3) {\n        sii_wad\n    }\n    qor(i) // Skips printing 3\n}",
        usage: "Skips the rest of the current iteration.",
      },

      // Data types
      tiro: {
        description: "Number Type - Declares a numeric variable.",
        example: "tiro x = 10\ntiro y = 3.14",
        usage: "Used for both integers and floating-point numbers.",
      },
      qoraal: {
        description: "String Type - Declares a text variable.",
        example: 'qoraal magac = "Sharafdin"\nqoraal fariin = "Salaan!"',
        usage: "Used for text and character data.",
      },
      boole: {
        description: "Boolean Type - Declares a true/false variable.",
        example: "boole run_ah = true\nboole khalad_ah = false",
        usage: "Used for conditional logic with true or false values.",
      },

      // Keywords from the dictionary
      isku_day: {
        description: "Try Block - Used for exception handling.",
        example:
          'isku_day {\n    // Code that might cause errors\n} qabo (khalad) {\n    qor("Khalad: " + khalad)\n}',
        usage: "Catches and handles errors during execution.",
      },
      qabo: {
        description: "Catch Block - Handles exceptions from a try block.",
        example:
          'isku_day {\n    // Code that might cause errors\n} qabo (khalad) {\n    qor("Khalad: " + khalad)\n}',
        usage: "Used with isku_day to handle errors.",
      },
    };
  }

  /**
   * Register the hover provider with the extension
   * @param {vscode.ExtensionContext} context
   */
  register(context) {
    // Register the hover provider for Soplang files
    const hoverProvider = vscode.languages.registerHoverProvider("soplang", {
      provideHover: (document, position, token) => {
        return this.provideHoverInfo(document, position, token);
      },
    });

    // Add to subscriptions
    context.subscriptions.push(hoverProvider);

    console.log("Soplang hover helper registered successfully.");
  }

  /**
   * Provides hover information for the current word
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   * @param {vscode.CancellationToken} token
   * @returns {vscode.Hover}
   */
  provideHoverInfo(document, position, token) {
    try {
      // Get the word at the current position
      const wordRange = document.getWordRangeAtPosition(position);
      if (!wordRange) {
        return null;
      }

      const word = document.getText(wordRange);

      // Check if the word is a Soplang keyword with hover info
      const keywordInfo = this.keywordDescriptions[word];
      if (keywordInfo) {
        // Create markdown content for the hover
        const markdown = new vscode.MarkdownString();

        // Add description
        markdown.appendMarkdown(`### ${word}\n\n`);
        markdown.appendMarkdown(`**${keywordInfo.description}**\n\n`);

        // Add example with syntax highlighting
        markdown.appendMarkdown(
          `#### Example:\n\`\`\`soplang\n${keywordInfo.example}\n\`\`\`\n\n`
        );

        // Add usage information
        if (keywordInfo.usage) {
          markdown.appendMarkdown(`**Note:** ${keywordInfo.usage}\n`);
        }

        // Enable syntax highlighting in code blocks
        markdown.isTrusted = true;

        return new vscode.Hover(markdown, wordRange);
      }

      return null;
    } catch (error) {
      console.error("Error providing hover info:", error);
      return null;
    }
  }
}

module.exports = {
  SoplangHoverProvider,
};
