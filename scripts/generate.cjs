const fs = require('fs');
const catalog = JSON.parse(fs.readFileSync('language/catalog.json', 'utf8'));

// The TextMate grammar is copied from the Soplang 3.6 compiler extension.
// This catalog documents the bundled 3.0 analysis fallback.
const words = [...new Set(catalog.entries.flatMap(entry => [entry.name, ...entry.aliases]).concat(['run', 'been', 'maran', 'null', 'dhis', 'dhaw']))].sort();
fs.writeFileSync('dictionaries/soplang.txt', words.join('\n') + '\n');

let reference = '# Bundled Soplang 3.0 fallback reference\n\nGenerated from language/catalog.json. Compiler revision: e72c6668276fa801691ddb1c753ebbe2f73a417c.\n\n';
for (const entry of catalog.entries) {
    const receiver = entry.receiver === 'global' || entry.receiver === 'keyword' ? '' : `${entry.receiver}.`;
    const parameters = entry.receiver === 'keyword' ? '' : `(${entry.parameters.join(', ')})`;
    const returns = entry.returns ? ` → ${entry.returns}` : '';
    const aliases = entry.aliases.length ? ` Supported aliases: ${entry.aliases.map(alias => `\`${alias}\``).join(', ')}.` : '';
    reference += `- \`${receiver}${entry.name}${parameters}\`${returns}: ${entry.documentation}${aliases}\n`;
}
fs.writeFileSync('keywords.md', reference);
