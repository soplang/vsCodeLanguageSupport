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
        usage: "Bandhig doorsoome nooc kasta leh (tiro, bandhigaal, run_mise_been).",
      },
      hawl: {
        description: "Hawlgal Caddeyn - Wuxuu qeexayaa shaqo cusub.",
        example: 'hawl salaam(magac) {\n    bandhig("Salaan, " + magac)\n}',
        usage: 'Si aad u isticmaasho: salaam("Sharafdin")',
      },
      bandhig: {
        description: "Daabacaad - Wuxuu daabacayaa qoraal.",
        example: 'bandhig("Salaam, Adduunka!")\bandhig("Qiimaha: " + x)',
        usage: "Waxay daabici kartaa qoraal, doorsoome, ama xisaab.",
      },
      akhri: {
        description: "Gelinta - Wuxuu akhriyaa wixii isticmaaluhu geliyo.",
        example: 'door magac = akhri("Fadlan gali magacaaga: ")',
        usage: "Wuxuu kaydiyaa qiimaha la geliyo.",
      },
      celi: {
        description: "Soo Celin - Waxay soo celisaa qiime ka yimid shaqo.",
        example: "hawl isuDar(a, b) {\n    celi a + b\n}",
        usage: "Waxaa loo isticmaalaa in lagu soo celiyo qiimayaal.",
      },

      // Control flow
      haddii: {
        description: "Hadday suurtogal tahay - Wuxuu hubiyaa shuruud.",
        example: 'haddii (x > 5) {\n    bandhig("X waa weyn yahay")\n}',
        usage: "Waxay fulisaa koodka haddii shuruuddu run tahay.",
      },
      haddii_kale: {
        description:
          "Haddii kale - Shuruud kale kadib marka shuruuddii hore been noqoto.",
        example:
          'haddii (x > 10) {\n    bandhig("X aad bay u weyn tahay")\n} haddii_kale (x > 5) {\n    bandhig("X waa dhex dhexaad")\n}',
        usage: "Waxaa loo isticmaalaa shuruudo badan oo isku xiga.",
      },
      haddii_kalena: {
        description:
          "Haddii kalena - Waxa la isticmaalaa markaad hubto in shuruudaha kale been yihiin.",
        example:
          'haddii (x > 5) {\n    bandhig("X waa weyn yahay")\n} haddii_kalena {\n    bandhig("X waa yar yahay")\n}',
        usage: "Waxaa la fuliyaa marka shuruudaha kale oo dhan been yihiin.",
      },

      // Loops
      kuceli: {
        description:
          "Soo celcelis - Waxay soo celcelisaa tallaabooyin gaar ah marto inta u dhaxeysa laba qiimo.",
        example: 'kuceli i min 1 ilaa 5 {\n    bandhig("Tirinta: " + i)\n}',
        usage: "Waxay soo celcelisaa billow ilaa dhammaad.",
      },
      intay: {
        description:
          "Inta ay - Waxay soo celcelisaa ilaa shuruuddu been noqoto.",
        example: "door i = 0\nintay (i < 5) {\n    bandhig(i)\n    i = i + 1\n}",
        usage: "Waxay sii wadataa xisaabinta ilaa shuruuddu been noqoto.",
      },
      jooji: {
        description: "Jooji - Waxay ka baxdaa xisaabinta hadda socota.",
        example:
          "kuceli i min 1 ilaa 10 {\n    haddii (i == 5) {\n        jooji\n    }\n    bandhig(i)\n}",
        usage: "Isla markiiba waxay ka baxdaa xisaabinta.",
      },
      soco: {
        description: "Sii wad - Waxay u gudbaa xisaabinta soo socota.",
        example:
          "kuceli i min 1 ilaa 5 {\n    haddii (i == 3) {\n        soco\n    }\n    bandhig(i) // Waxay ka booddaa daabacaadda 3\n}",
        usage: "Waxay ka booddaa inta hadda ka hartay ee xisaabinta.",
      },

      // Data types
      tiro: {
        description: "Tiro - Waxay sheegaysaa doorsoome tiro ah.",
        example: "tiro x = 10\ntiro y = 3.14",
        usage: "Waxaa loo isticmaalaa labadaba tirada iyo jajabka tobanle.",
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
        description: "Isku day - Waxaa loo isticmaalaa maaraynta cilladaha.",
        example:
          'isku_day {\n    // Koodka laga yaabo inuu cillad keeno\n} qabo (khalad) {\n    bandhig("Khalad: " + khalad)\n}',
        usage: "Waxay qabtaa oo maareysaa cilladaha marka la isticmaalayo.",
      },
      qabo: {
        description: "Qabo - Waxay maareysaa cilladaha ka yimaada isku day.",
        example:
          'isku_day {\n    // Koodka laga yaabo inuu cillad keeno\n} qabo (khalad) {\n    bandhig("Khalad: " + khalad)\n}',
        usage: "Waxaa la isticmaalaa isku_day si loo maareeyo cilladaha.",
      },

      // Additional keywords
      ilaa: {
        description:
          "Ilaa (Ilaa) - Waxaa loo isticmaalaa kuceli si loo sheego halka loogu talagalay.",
        example: "kuceli i min 1 ilaa 5 {\n    bandhig(i)\n}",
        usage: "Waxay qeexaysaa qiimaha dhamaadka ee xisaabinta.",
      },
      keeno: {
        description: "Keeno - Waxay soo dejisaa qaybo dibadda ah.",
        example: 'keeno "module"\nkeeno "path"',
        usage:
          "Waxaa loo isticmaalaa in lagu soo jiido code dibadeed iyo maktabado.",
      },
      siidaayo: {
        description:
          "Siidaayo - Waxay sii daayaa code si loogu isticmaalo qaybaha kale.",
        example: "siidaayo hawl kuDar(a, b) {\n    celi a + b\n}",
        usage:
          "Waxay ka dhigaysaa shaqooyin, doorsoome, ama fasal inay u furan yihiin qaybaha kale.",
      },
      fasalka: {
        description: "Fasalka - Waxay abuuraysaa fasal cusub.",
        example:
          'fasalka Xayawaan {\n    hawl sameeQayl() {\n        bandhig("Cod")\n    }\n}',
        usage: "Waxaa loo isticmaalaa barnaamij ka kooban waxyaabo.",
      },
      ka_dhaxal: {
        description: "Ka_dhaxal - Waxay ballaarisaa fasal.",
        example:
          'fasalka Bisad ka_dhaxal Xayawaan {\n    hawl sameeQayl() {\n        bandhig("Miyaaw")\n    }\n}',
        usage:
          "Waxaa loo isticmaalaa in laga dhaxlo sifooyinka iyo hab-dhaqanka fasalka waalidka ah.",
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
