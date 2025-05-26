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
      key: "madoor",
      body: "madoor",
      kind: vscode.CompletionItemKind.Variable,
      detail: "Constant variable declaration",
    },
    {
      key: "qoraal",
      body: "qoraal",
      kind: vscode.CompletionItemKind.Variable,
      detail: "String type",
    },
    {
      key: "abn",
      body: "abn",
      kind: vscode.CompletionItemKind.Variable,
      detail: "Integer type",
    },
    {
      key: "jajab",
      body: "jajab",
      kind: vscode.CompletionItemKind.Variable,
      detail: "Float/decimal type",
    },
    {
      key: "bool",
      body: "bool",
      kind: vscode.CompletionItemKind.Variable,
      detail: "Boolean type",
    },
    {
      key: "liis",
      body: "liis",
      kind: vscode.CompletionItemKind.Variable,
      detail: "Array declaration",
    },
    {
      key: "walax",
      body: "walax",
      kind: vscode.CompletionItemKind.Variable,
      detail: "Object declaration",
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
      key: "haddii",
      body: "haddii",
      kind: vscode.CompletionItemKind.Keyword,
      detail: "If statement",
    },
    {
      key: "haddii_kale",
      body: "haddii_kale",
      kind: vscode.CompletionItemKind.Keyword,
      detail: "Else if statement",
    },
    {
      key: "ugudambeyn",
      body: "ugudambeyn",
      kind: vscode.CompletionItemKind.Keyword,
      detail: "Else statement",
    },
    {
      key: "kuceli",
      body: "kuceli",
      kind: vscode.CompletionItemKind.Keyword,
      detail: "For statement",
    },
    {
      key: "intay",
      body: "intay",
      kind: vscode.CompletionItemKind.Keyword,
      detail: "While statement",
    },
    {
      key: "jooji",
      body: "jooji",
      kind: vscode.CompletionItemKind.Keyword,
      detail: "Break statement",
    },
    {
      key: "soco",
      body: "soco",
      kind: vscode.CompletionItemKind.Keyword,
      detail: "Continue statement",
    },
    {
      key: "min",
      body: "min",
      kind: vscode.CompletionItemKind.Keyword,
      detail: "From (in for loops)",
    },
    {
      key: "ilaa",
      body: "ilaa",
      kind: vscode.CompletionItemKind.Keyword,
      detail: "To (in for loops)",
    },
    {
      key: "dooro",
      body: "dooro",
      kind: vscode.CompletionItemKind.Keyword,
      detail: "Switch statement",
    },
    {
      key: "xaalad",
      body: "xaalad",
      kind: vscode.CompletionItemKind.Keyword,
      detail: "Case statement",
    },
    {
      key: "hawl",
      body: "hawl",
      kind: vscode.CompletionItemKind.Function,
      detail: "Function declaration",
    },
    {
      key: "celi",
      body: "celi",
      kind: vscode.CompletionItemKind.Function,
      detail: "Return statement",
    },
    {
      key: "isku_day",
      body: "isku_day",
      kind: vscode.CompletionItemKind.Keyword,
      detail: "Try statement",
    },
    {
      key: "qabo",
      body: "qabo",
      kind: vscode.CompletionItemKind.Keyword,
      detail: "Catch statement",
    },
    {
      key: "fasalka",
      body: "fasalka",
      kind: vscode.CompletionItemKind.Class,
      detail: "Class declaration",
    },
    {
      key: "nafta",
      body: "nafta",
      kind: vscode.CompletionItemKind.Variable,
      detail: "This keyword",
    },
    {
      key: "ka_dhaxal",
      body: "ka_dhaxal",
      kind: vscode.CompletionItemKind.Variable,
      detail: "Extends keyword",
    },
    {
      key: "ka_keen",
      body: "ka_keen",
      kind: vscode.CompletionItemKind.Keyword,
      detail: "Import statement",
    },
    {
      key: "qor",
      body: "qor()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Print function",
    },
    {
      key: "gelin",
      body: "gelin()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Input function",
    },
    {
      key: "nooc",
      body: "nooc()",
      kind: vscode.CompletionItemKind.Function,
      detail: "TypeOf function",
    },
    {
      key: "qoraal",
      body: "qoraal()",
      kind: vscode.CompletionItemKind.Function,
      detail: "String function",
    },
    {
      key: "abn",
      body: "abn()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Integer function",
    },
    {
      key: "jajab",
      body: "jajab()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Float function",
    },
    {
      key: "bool",
      body: "bool()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Boolean function",
    },
    {
      key: "kudar",
      body: "kudar()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Push function",
    },
    {
      key: "kasaar",
      body: "kasaar()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Pop function",
    },
    {
      key: "dherer",
      body: "dherer()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Length function",
    },
    {
      key: "leeyahay",
      body: "leeyahay()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Contains function",
    },
    {
      key: "fure",
      body: "fure()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Keys function",
    },
    {
      key: "daji",
      body: "daji()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Stop/pause function",
    },
    {
      key: "kor",
      body: "kor()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Up/increment function",
    },
    {
      key: "xul",
      body: "xul()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Close function",
    },
    {
      key: "nadiifi",
      body: "nadiifi()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Clean function",
    },
    {
      key: "rog",
      body: "rog()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Turn/rotate function",
    },
    {
      key: "habee",
      body: "habee()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Format function",
    },
    {
      key: "jar",
      body: "jar()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Cut function",
    },
    {
      key: "aaddin",
      body: "aaddin()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Add function",
    },
    {
      key: "shaandhee",
      body: "shaandhee()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Share function",
    },
    {
      key: "muuji",
      body: "muuji()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Show function",
    },
    {
      key: "qiime",
      body: "qiime()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Value function",
    },
    {
      key: "lamaane",
      body: "lamaane()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Double function",
    },
    {
      key: "tir",
      body: "tir()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Count function",
    },
    {
      key: "qeybi",
      body: "qeybi()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Divide function",
    },
    {
      key: "dhamaad",
      body: "dhamaad()",
      kind: vscode.CompletionItemKind.Function,
      detail: "End function",
    },
    {
      key: "bilow",
      body: "bilow()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Start function",
    },
    {
      key: "beddel",
      body: "beddel()",
      kind: vscode.CompletionItemKind.Function,
      detail: "Change function",
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
