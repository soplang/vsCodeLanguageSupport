const fs=require('fs');
const catalog=JSON.parse(fs.readFileSync('language/catalog.json','utf8'));
const names=receiver=>[...new Set(catalog.entries.filter(e=>e.receiver===receiver).flatMap(e=>[e.name,...e.aliases]))].sort();
const word='[\\p{L}\\p{N}_]';
const match=values=>`(?<!${word})(?:${values.join('|')})(?!${word})`;
const keywords=names('keyword').filter(n=>!['kale','tijaabi','ilaa'].includes(n));
const grammar={name:'Soplang',scopeName:'source.soplang',patterns:[
 {name:'comment.line.double-slash.soplang',begin:'//',end:'$'},
 {name:'comment.block.soplang',begin:'/\\*',end:'\\*/'},
 ...['"',"'"].map(q=>({name:'string.quoted.soplang',begin:q,end:q})),
 {name:'entity.name.function.soplang',match:`(?<=hawl)\\s+[\\p{L}_][\\p{L}\\p{N}_]*`},
 {name:'entity.name.type.class.soplang',match:`(?<=qaab)\\s+[\\p{L}_][\\p{L}\\p{N}_]*`},
 {name:'support.function.method.soplang',match:`(?<=\\.)\\s*(?:${[...new Set(['teed','walax','qoraal'].flatMap(names))].join('|')})(?!${word})`},
 {name:'keyword.control.soplang',match:match(keywords)},
 {name:'keyword.control.contextual.soplang',match:`${match(['tijaabi'])}(?=\\s*\\{)|${match(['kale'])}(?=\\s*\\{|\\s*\\([^{}]*\\)\\s*\\{)|${match(['ilaa'])}`},
 {name:'constant.language.soplang',match:match(['run','been','maran','null'])},
 {name:'support.function.soplang',match:match(names('global'))},
 {name:'constant.numeric.soplang',match:'(?<![\\p{L}\\p{N}_])\\d+(?:\\.\\d+)?'},
 {name:'keyword.operator.soplang',match:'==|!=|>=|<=|&&|\\|\\||[+*/%!=<>-]'},
 {name:'variable.other.soplang',match:'[\\p{L}_][\\p{L}\\p{N}_]*'}]};
fs.writeFileSync('syntaxes/soplang.tmLanguage.json',JSON.stringify(grammar,null,2)+'\n');
fs.writeFileSync('dictionaries/soplang.txt',[...new Set(catalog.entries.flatMap(e=>[e.name,...e.aliases]).concat(['run','been','maran','null','dhis','dhaw']))].sort().join('\n')+'\n');
let reference='# Soplang 3 editor reference\n\nGenerated from language/catalog.json. Compiler revision: e72c6668276fa801691ddb1c753ebbe2f73a417c.\n\n';
for(const e of catalog.entries){reference+=`- \`${e.receiver==='global'||e.receiver==='keyword'?'':e.receiver+'.'}${e.name}${e.receiver==='keyword'?'':'('+e.parameters.join(', ')+')'}\`${e.returns?' → '+e.returns:''}: ${e.documentation}${e.aliases.length?' Supported aliases: '+e.aliases.map(a=>'`'+a+'`').join(', ')+'.':''}\n`;}
fs.writeFileSync('keywords.md',reference);
