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
          "Doorsoome Caddeyn - Waxaad u adeegsan kartaa inaad ku qeexdo doorsoome cusub.",
        example: 'door x = 10\ndoor magac = "Sharafdin"',
        usage:
          "Bandhig doorsoome nooc kasta leh (tiro, qoraal, run_mise_been).",
      },
      hawl: {
        description: "Hawl - Waxay qeexaysaa shaqo (function) cusub.",
        usage: "Qor doorsoome nooc kasta leh (abn, qoraal, bool).",
        syntax: "hawl magac(parameters) { ... }",
        example: 'hawl salaam(magac) {\n    qor("Salaan, " + magac)\n}',
      },
      qor: {
        description: "Qor - Waxay daabacaysaa qoraal console-ka.",
        example: 'qor("Salaam, Adduunka!")\nqor("Qiimaha: " + x)',
      },
      bandhig: {
        description: "Daabacaad - Wuxuu daabacayaa qoraal.",
        example: 'bandhig("Salaam, Adduunka!")\bandhig("Qiimaha: " + x)',
        usage: "Waxay daabici kartaa qoraal, doorsoome, ama xisaab.",
      },
      gelin: {
        description: "Gelinta - Wuxuu gelinyaa wixii isticmaaluhu geliyo.",
        example: 'door magac = gelin("Fadlan gali magacaaga: ")',
        usage: "Wuxuu kaydiyaa qiimaha la geliyo.",
      },
      celi: {
        description: "Soo Celin - Waxay soo celisaa qiime ka yimid shaqo.",
        example: "hawl isuDar(a, b) {\n    celi a + b\n}",
        usage: "Waxaa loo isticmaalaa in lagu soo celiyo qiimayaal.",
      },

      // Control flow
      haddii: {
        description: "Haddii - Waxay hubisaa shuruud.",
        syntax: "haddii (shuruud) { ... }",
        example: 'haddii (x > 5) {\n    qor("X waa weyn yahay")\n}',
      },
      haddii_kale: {
        description: "Haddii_kale - Waxay hubisaa shuruud kale.",
        syntax: "haddii_kale (shuruud) { ... }",
        example:
          'haddii (x > 10) {\n    qor("X aad bay u weyn tahay")\n} haddii_kale (x > 5) {\n    qor("X waa dhex dhexaad")\n}',
      },
      ugudambeyn: {
        description:
          "Ugudambeyn - Waxay fulisaa koodka haddii shuruudihii hore been ahaayeen.",
        syntax: "ugudambeyn { ... }",
        example:
          'haddii (x > 5) {\n    qor("X waa weyn yahay")\n} ugudambeyn {\n    qor("X waa yar yahay")\n}',
      },

      // Loops
      kuceli: {
        description: "Kuceli - Waxay soo celcelisaa koodka.",
        syntax: "kuceli (variable start ilaa end) { ... }",
        example: 'kuceli (i 1 ilaa 5) {\n    qor("Tirinta: " + i)\n}',
      },
      intay: {
        description:
          "Intay - Waxay soo celcelisaa koodka ilaa shuruuddu been noqoto.",
        syntax: "intay (shuruud) { ... }",
        example: "door i = 0\nintay (i < 5) {\n    qor(i)\n    i = i + 1\n}",
      },
      jooji: {
        description: "Jooji - Waxay joojisaa xisaabinta socota.",
        example:
          "kuceli (i 1 ilaa 10) {\n    haddii (i == 5) {\n        jooji\n    }\n    qor(i)\n}",
      },
      soco: {
        description: "Soco - Waxay u gudbaa xisaabinta soo socota ee wareegga.",
        example:
          "kuceli (i 1 ilaa 5) {\n    haddii (i == 3) {\n        soco\n    }\n    qor(i) // Waxay ka booddaa daabacaadda 3\n}",
      },

      // Data types
      abn: {
        description: "Abn - Waxay sheegaysaa doorsoome tiro ah.",
        example: "abn x = 10\nabn y = 25",
      },
      jajab: {
        description: "Jajab - Waxay sheegaysaa doorsoome jajab ah.",
        example: "jajab pi = 3.14\njajab qiimo = 2.5",
      },
      qoraal: {
        description: "Qoraal - Waxay sheegaysaa doorsoome qoraal ah.",
        example: 'qoraal magac = "Sharafdin"\nqoraal fariin = "Salaan!"',
        usage: "Waxaa loo isticmaalaa qoraal iyo xaraf.",
      },
      run_mise_been: {
        description:
          "Run_mise_been - Waxay sheegaysaa doorsoome run ama been ah.",
        example: "run_mise_been runbaa = run\nrun_mise_been beenbaa = been",
        usage: "Waxaa loo isticmaalaa qiimo run ama been ah.",
      },
      bool: {
        description: "bool - Waxay sheegaysaa doorsoome boolean ah.",
        example: "bool runbaa = run\nbool beenbaa = been",
        usage: "Waxaa loo isticmaalaa qiime boolean ah (run ama been).",
      },
      // Keywords from the dictionary
      isku_day: {
        description: "Isku_day - Waxay isku daysa fulinta koodka aan la hubin.",
        syntax: "isku_day { ... } qabo (khalad) { ... }",
        example:
          'isku_day {\n    // Koodka laga yaabo inuu cillad keeno\n} qabo (khalad) {\n    qor("Khalad: " + khalad)\n}',
      },
      qabo: {
        description: "Qabo - Waxay qabtaa cilladaha ka dhasha isku_day.",
        syntax: "qabo (khalad) { ... }",
        example:
          'isku_day {\n    // Koodka laga yaabo inuu cillad keeno\n} qabo (khalad) {\n    qor("Khalad: " + khalad)\n}',
      },

      // Additional keywords
      ilaa: {
        description: "Ilaa - Waxay sheegaysaa dhamaadka wareegga.",
        example: "kuceli (i 1 ilaa 5) {\n    qor(i)\n}",
      },
      ka_keen: {
        description: "Ka_keen - Waxay soo dejisaa qaybo dibadda ah.",
        example: 'ka_keen "module"\nka_keen "path"',
      },
      siidaayo: {
        description:
          "Siidaayo - Waxay sii daayaa code si loogu isticmaalo qaybaha kale.",
        example: "siidaayo hawl kuDar(a, b) {\n    celi a + b\n}",
        usage:
          "Waxay ka dhigaysaa shaqooyin, doorsoome, ama fasal inay u furan yihiin qaybaha kale.",
      },
      fasalka: {
        description: "Fasalka - Waxay qeexaysaa fasal (class) cusub.",
        syntax: "fasalka MagacFasal { ... }",
        example:
          'fasalka Xayawaan {\n    hawl sameeQayl() {\n        qor("Cod")\n    }\n}',
      },
      ka_dhaxal: {
        description: "Ka_dhaxal - Waxay dhaxashaa fasal kale.",
        syntax: "fasalka MagacFasal ka_dhaxal WaalidFasal { ... }",
        example:
          'fasalka Bisad ka_dhaxal Xayawaan {\n    hawl sameeQayl() {\n        qor("Miyaaw")\n    }\n}',
      },
      liis: {
        description: "Liis - Waxay sheegaysaa liis walxaha ah.",
        example:
          'liis lambarrada = [1, 2, 3, 4, 5]\nliis magacyada = ["Cali", "Cumar", "Xasan"]',
        usage:
          "Waxaa loo isticmaalaa in lagu abuuro oo lagu maareeyo urur walxaha ah.",
      },
      nafta: {
        description: "Nafta - Waxay tixraaceysaa shayga hadda jira.",
        example:
          'fasalka Qof {\n    door magac = ""\n    hawl magacdhig(magaccusub) {\n        nafta.magac = magaccusub\n    }\n}',
        usage:
          "Waxay u dhigantaa 'this' luuqadaha kale, waxay tixraaceysaa shayga hadda jira.",
      },
      walax: {
        description: "walax - Waxay sheegaysaa doorsoome shay ah.",
        example: 'walax qof = {\n    magac: "Cali",\n    da: 30\n}',
        usage:
          "Waxaa loo isticmaalaa in lagu abuuro oo lagu shaqeeyo sheyo Soplang gudaheeda.",
      },
      kudar: {
        description: "Kudar - Waxay kudartaa qiimayaal.",
        example: "door wadarta = kudar(5, 3)",
        usage: "Nooc shaqo ah oo lagu daro.",
      },
      kadhaaf: {
        description: "Kadhaaf - Waxay ka dhaafaysaa qiimayaal.",
        example: "door farqiga = kadhaaf(10, 5)",
        usage: "Nooc shaqo ah oo lagu kala jaro.",
      },
      kukobci: {
        description: "Kukobci - Waxay isku dhufataa qiimayaal.",
        example: "door isudhufasho = kukobci(4, 6)",
        usage: "Nooc shaqo ah oo lagu kobciyo.",
      },
      uqeybi: {
        description: "Uqeybi - Waxay u qaybisaa qiimayaal.",
        example: "door qaybinta = uqeybi(20, 4)",
        usage: "Nooc shaqo ah oo lagu qeybiyo.",
      },
      run: {
        description: "Run - Waa qiime sheegaya run.",
        example: "door runbaa = run",
        usage: "Waxaa loo isticmaalaa marka la sheegayo qiime runa ah.",
      },
      been: {
        description: "Been - Waa qiime sheegaya been.",
        example: "door beenbaa = been",
        usage: "Waxaa loo isticmaalaa marka la sheegayo qiime been ah.",
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
          `#### Tusaale:\n\`\`\`soplang\n${keywordInfo.example}\n\`\`\`\n\n`
        );

        // Add usage information
        if (keywordInfo.usage) {
          markdown.appendMarkdown(`**Xasuusin:** ${keywordInfo.usage}\n`);
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
