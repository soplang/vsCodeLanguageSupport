// The module 'vscode' contains the VS Code extensibility API
const vscode = require("vscode");
const path = require("path");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // Handle spell checker integration if it's installed
  setupSpellChecker(context);
}

/**
 * Sets up integration with the Code Spell Checker if it's installed
 * @param {vscode.ExtensionContext} context
 */
function setupSpellChecker(context) {
  // Check if Code Spell Checker is installed
  const codeSpellCheckerExtension = vscode.extensions.getExtension(
    "streetsidesoftware.code-spell-checker"
  );

  // Only set up the dictionary if Code Spell Checker is installed
  if (codeSpellCheckerExtension) {
    // Get the path to the soplang dictionary relative to the extension
    const dictionaryPath = path.join(
      context.extensionPath,
      "dictionaries",
      "soplang.txt"
    );

    // Try to register the dictionary with Code Spell Checker
    try {
      // Register the dictionary with Code Spell Checker
      const config = vscode.workspace.getConfiguration("cSpell");

      // Get current dictionaries or create empty array if none
      let dictionaryDefinitions = config.get("dictionaryDefinitions") || [];
      let dictionaries = config.get("dictionaries") || [];
      let languageSettings = config.get("languageSettings") || [];

      // Check if our dictionary is already registered
      const soplangDictExists = dictionaryDefinitions.some(
        (dict) => dict.name === "soplang"
      );

      if (!soplangDictExists) {
        // Add our dictionary definition
        dictionaryDefinitions.push({
          name: "soplang",
          path: dictionaryPath,
          description: "Soplang programming language keywords and syntax terms",
        });

        // Update the config
        config.update(
          "dictionaryDefinitions",
          dictionaryDefinitions,
          vscode.ConfigurationTarget.Global
        );
      }

      // Add our dictionary to the list of active dictionaries if not already there
      if (!dictionaries.includes("soplang")) {
        dictionaries.push("soplang");
        config.update(
          "dictionaries",
          dictionaries,
          vscode.ConfigurationTarget.Global
        );
      }

      // Check if we already have language settings for soplang
      const soplangLangExists = languageSettings.some(
        (setting) =>
          setting.languageId === "soplang" &&
          Array.isArray(setting.dictionaries) &&
          setting.dictionaries.includes("soplang")
      );

      if (!soplangLangExists) {
        // Add language settings for soplang
        languageSettings.push({
          languageId: "soplang",
          dictionaries: ["soplang"],
          enabled: true,
        });

        // Update the config
        config.update(
          "languageSettings",
          languageSettings,
          vscode.ConfigurationTarget.Global
        );
      }

      // Enable cSpell for soplang files
      const enableFiletypes = config.get("enableFiletypes") || [];
      if (!enableFiletypes.includes("soplang")) {
        enableFiletypes.push("soplang");
        config.update(
          "enableFiletypes",
          enableFiletypes,
          vscode.ConfigurationTarget.Global
        );
      }

      console.log(
        "Soplang dictionary has been registered with Code Spell Checker."
      );
    } catch (error) {
      // Just log the error and continue - we don't want to break the extension
      // if spell checking setup fails
      console.error("Error setting up Soplang dictionary:", error);
    }
  } else {
    console.log(
      "Code Spell Checker not installed. Soplang syntax highlighting will work, but spell checking features are not available."
    );
  }
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
