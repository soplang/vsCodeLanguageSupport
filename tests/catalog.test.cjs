const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');const {execFile}=require('child_process');const exec=require('util').promisify(execFile);const {Registry}=require('vscode-textmate');const onig=require('vscode-oniguruma');
test('generated language assets match the catalog',async()=>{const files=['syntaxes/soplang.tmLanguage.json','dictionaries/soplang.txt','keywords.md'];const before=files.map(f=>fs.readFileSync(f,'utf8'));await exec(process.execPath,['scripts/generate.cjs']);assert.deepEqual(files.map(f=>fs.readFileSync(f,'utf8')),before);const catalog=require('../language/catalog.json');const seen=new Set();for(const e of catalog.entries){for(const name of [e.name,...e.aliases]){const key=e.receiver+':'+name;assert(!seen.has(key),key);seen.add(key);assert(!['liis','isku_day','ka_keen','fasalka','ka_dhaxal','throw','async','http'].includes(name));}}});
test('3.6 grammar highlights language and schema syntax',async()=>{
  await onig.loadWASM(fs.readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm')).buffer);
  const registry=new Registry({onigLib:Promise.resolve({createOnigScanner:p=>new onig.OnigScanner(p),createOnigString:s=>new onig.OnigString(s)}),loadGrammar:async scope=>require(scope==='source.soplang-schema'?'../syntaxes/schema.tmLanguage.json':'../syntaxes/soplang.tmLanguage.json')});
  const code=await registry.loadGrammar('source.soplang');
  for(const [source,word,scope] of [
    ['tuur qalad("x")','tuur','keyword.control'],
    ['dhammee {','dhammee','keyword.control'],
    ['door n = 3','door','keyword.control'],
    ['door n = 3','3','constant.numeric'],
    ['f"Salaan {magac}"','Salaan','string.quoted'],
  ]){
    const at=source.indexOf(word);const token=code.tokenizeLine(source).tokens.find(t=>t.startIndex<=at&&t.endIndex>at);
    assert(token.scopes.some(s=>s.startsWith(scope)),`${source}: ${token.scopes}`);
  }
  const schema=await registry.loadGrammar('source.soplang-schema');
  const source='jadwal qof { aqoonsi abn furaha }';
  for(const [word,scope] of [['jadwal','keyword.declaration'],['abn','storage.type'],['furaha','storage.modifier']]){
    const at=source.indexOf(word);const token=schema.tokenizeLine(source).tokens.find(t=>t.startIndex<=at&&t.endIndex>at);
    assert(token.scopes.some(s=>s.startsWith(scope)),`${source}: ${token.scopes}`);
  }
  registry.dispose();
});
function expand(body){const values=new Map();return body.join('\n').replace(/\$\{(\d+):([^}]*)\}|\$\{(\d+)\}|\$(\d+)/g,(_,index,value,reference,bare)=>{if(index){values.set(index,value);return value;}return values.get(reference||bare)||'';});}
test('canonical snippet expansions pass the real compiler frontend', {skip:!process.env.SOPLANG_COMPILER},async()=>{const os=require('os');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'soplang-snippets-'));try{for(const [name,snippet]of Object.entries(require('../snippets/soplang.json'))){let source=expand(snippet.body);if(['Inheritance','Construction','Class annotation'].includes(name))source='qaab Parent { hawl greet(): qoraal { celi "hi" } }\nqaab Person { hawl dhis(qoraal name) { nafta.name=name } }\n'+source;if(name==='Import')fs.writeFileSync(path.join(dir,'library.sop'),'hawl library(): abn { celi 1 }');const file=path.join(dir,name+'.sop');fs.writeFileSync(file,source);try{await exec(process.env.SOPLANG_COMPILER,['--no-color','--hir','--',file],{timeout:10000,stdio:'pipe'});}catch(error){assert.fail(`${name}: ${error.stderr}\n${source}`);}}}finally{fs.rmSync(dir,{recursive:true,force:true});}});
