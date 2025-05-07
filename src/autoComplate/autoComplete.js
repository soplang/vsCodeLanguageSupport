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
      key: "bool",
      body: "bool",
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
      key: "walax",
      body: "walax",
      kind: vscode.CompletionItemKind.Variable,
      detail: "object Declaration",
    },
    {
      key: "maran",
      body: "maran",
      kind: vscode.CompletionItemKind.Value,
      detail: "Null type",
    },
    {
      key: "run",
      body: "run",
      kind: vscode.CompletionItemKind.Value,
      detail: "True type",
    },
    {
      key: "been",
      body: "been",
      kind: vscode.CompletionItemKind.Value,
      detail: "False type",
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
    {
      key:"ku_cel",
      body:"ku_cel",
      kind:vscode.CompletionItemKind.Keyword,
      detail:"for statement"
    },
    {
      key:"intay",
      body:"intay",
      kind:vscode.CompletionItemKind.Keyword,
      detail:"while statement"
    },
    {
      key:"jooji",
      body:"jooji",
      kind:vscode.CompletionItemKind.Keyword,
      detail:"break statement"
    },
    {
      key:"soco",
      body:"soco",
      kind:vscode.CompletionItemKind.Keyword,
      detail:"continue statement"
    },
    {
      key:"min",
      body:"min",
      kind:vscode.CompletionItemKind.Keyword,
      detail:"From (in for loops)"
    },
    {
        key:"ilaa",
        body:"ilaa",
        kind:vscode.CompletionItemKind.Keyword,
        detail:"To (in for loops) "
    },
    {
      key:"hawl",
      body:"hawl",
      kind:vscode.CompletionItemKind.Function,
      detail:"function declaration"
    },
    {
      key:"celi",
      body:"celi",
      kind:vscode.CompletionItemKind.Function,
      detail:"return statement"
    },
    {
      key:"isku_day",
      body:"isku_day",
      kind:vscode.CompletionItemKind.Keyword,
      detail:"try statement"
    },
    {
      key:"qabo",
      body:"qabo",
      kind:vscode.CompletionItemKind.Keyword,
      detail:"catch statement"
    },
    {
      key:"fasal",
      body:"fasal",
      kind:vscode.CompletionItemKind.Class,
      detail:"class declaration"
    },
    {
      key:"this",
      body:"this",
      kind:vscode.CompletionItemKind.Variable,
      detail:"this keyword"
    },
    {
      key:"dhaxal",
      body:"dhaxal",
      kind:vscode.CompletionItemKind.Variable,
      detail:"extends keyword"
    },
    {
      key:"bandhig",
      body:"bandhig()",
      kind:vscode.CompletionItemKind.Function,
      detail:"Print function"
    },
    {
      key:"gelin",
      body:"gelin()",
      kind:vscode.CompletionItemKind.Function,
      detail:"Input function"

    },
    {
      key:"nooc",
      body:"nooc()",
      kind:vscode.CompletionItemKind.Function,
      detail:"TypeOf function"
    },
    {
      key:"qoraal",
      body:"qoraal()",
      kind:vscode.CompletionItemKind.Function,
      detail:"String function"
    },
    {
      key:"tiro",
      body:"tiro()",
      kind:vscode.CompletionItemKind.Function,
      detail:"Integer function"
    },
    {
      key:"bool",
      body:"bool()",
      kind:vscode.CompletionItemKind.Function,
      detail:"Boolean function"
    },
    {
      key:"kudar",
      body:"kudar()",
      kind:vscode.CompletionItemKind.Function,
      detail:"push function"
    },
    {
      key:"kasaar",
      body:"kasaar()",
      kind:vscode.CompletionItemKind.Function,
      detail:"pop function"
    },
   {
    key:"dherer",
    body:"dherer()",
    kind:vscode.CompletionItemKind.Function,
    detail:"length function"
   },
   {
    key:"kudar",
    body:"kudar()",
    kind:vscode.CompletionItemKind.Function,
    detail:"concat function"
   },
   {
    key:"leeyahay",
    body:"leeyahay()",
    kind:vscode.CompletionItemKind.Function,
    detail:"contains function"
   },
   {
    key:"fure",
    body:"fure()",
    kind:vscode.CompletionItemKind.Function,
    detail:"keys function"
   },
   {
    key:"haystaa",
    body:"haystaa()",
    kind:vscode.CompletionItemKind.Function,
    detail:"has function"
   },
   {
    key:"tirtir",
    body:"tirtir()",
    kind:vscode.CompletionItemKind.Function,
    detail:"Delete function"
   },
   {
    key:"iskudar",
    body:"iskudar()",
    kind:vscode.CompletionItemKind.Function,
    detail:"merge function"
   }
   
    
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
