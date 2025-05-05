// src/auto-complete/index.js
const vscode = require("vscode");

function registerAutoComplete(context) {
  const entries = [
    {
      key: "door",
      body: "door",
      kind: vscode.CompletionItemKind.Variable,
      detail: "Dynamic variable declaration",
    },
    {
      key: "qoraal",
      body: "qoraal",
      kind: vscode.CompletionItemKind.Variable,
      detail: "String type",
    },
    {
      key: "tiro",
      body: "tiro",
      kind: vscode.CompletionItemKind.Variable,
      detail: "Integer type",
    },
    {
      key: "fadhi",
      body: "fadhi",
      kind: vscode.CompletionItemKind.Variable,
      detail: "Float type",
    },
    {
      key: "labadaran",
      body: "labadaran",
      kind: vscode.CompletionItemKind.Variable,
      detail: "boolean type",
    },
    {
      key: "liis",
      body: "liis",
      kind: vscode.CompletionItemKind.Variable,
      detail: "array Declaration",
    },
    {
      key: "shey",
      body: "shey",
      kind: vscode.CompletionItemKind.Variable,
      detail: "object Declaration",
    },
    {
      key: "waxba",
      body: "waxba",
      kind: vscode.CompletionItemKind.Value,
      detail: "Null type",
    },
    {
      key:"haddii",
      body:"haddii",
      kind:vscode.CompletionItemKind.Keyword,
      detail:"if statement"
    },
    {
        key:"haddii_kale",
        body:"haddii_kale",
        kind:vscode.CompletionItemKind.Keyword,
        detail:"else if statement"
    },
    {
      key:"Haddii_kalena",
      body:"Haddii_kalena",
      kind:vscode.CompletionItemKind.Keyword,
      detail:"Else statement"
    },
    
    
  ];

  const provider = vscode.languages.registerCompletionItemProvider(
    { language: "soplang", scheme: "file" },
    {
      provideCompletionItems(document, position) {
        // --- existing SopLang items here ...
        console.log("SopLang autocomplete invoked");
        return entries.map(({ key, body, kind, detail }) => {
          const item = new vscode.CompletionItem(key, kind);
          item.detail = detail;
          // If you want tab stops, still use SnippetString; but it's not a snippet kind:
          item.insertText = new vscode.SnippetString(body);
          return item;
        });
      },
    },
    " ",
    "." // trigger characters
  );

  context.subscriptions.push(provider);
}

module.exports = { registerAutoComplete };
