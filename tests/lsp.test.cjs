const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const os=require('os');const path=require('path');const {pathToFileURL}=require('url');const {Lsp,params,apply}=require('./lsp.cjs');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'soplang-lsp-'));
test('compiler-backed LSP, editor providers, imports, and lifecycle',async t=>{
 const lsp=new Lsp();t.after(async()=>{await lsp.close();fs.rmSync(tmp,{recursive:true,force:true});});const init=await lsp.initialize(tmp);assert.equal(init.capabilities.positionEncoding,'utf-16');
 let count=0;async function open(text,name){const uri=pathToFileURL(path.join(tmp,name||`${count++}.sop`)).href;lsp.open(uri,text);assert.deepEqual(await lsp.diagnostics(uri,1),[]);return uri;}
 for(const source of ['teed xs = [1, 2]\nqor(xs.hore())','hawl add(abn x, abn y): abn { celi x+y }\nqor(add(1,2))','qaab Qof { hawl dhis(qoraal n) { nafta.n=n } }\ndoor q= cusub Qof("A")','tijaabi { qor(1 / 0) } qabo(e) { qor(e) }','kuceli(i 0 ilaa 2) { qor(i) }','qoraal x = "C:\\work"\nqor(x)'])await open(source);
 await t.test('strict compiler mode, errors, UTF-16 and stale versions',async()=>{
  const text='qoraal x = "😀"\r\n\tmissing = 1';const uri=pathToFileURL(path.join(tmp,'bad.sop')).href;lsp.open(uri,text);const diagnostics=await lsp.diagnostics(uri,1);assert.equal(diagnostics[0].code,'E021');assert.equal(diagnostics[0].range.start.line,1);assert.equal(diagnostics[0].range.start.character,1);
  const emoji='qor("😀") unknown = 1';lsp.change(uri,emoji,2);const unicode=await lsp.diagnostics(uri,2);assert.equal(unicode[0].range.start.character,10);
  lsp.change(uri,'abn x=1',3);assert.deepEqual(await lsp.diagnostics(uri,3),[]);lsp.change(uri,'unknown = 1',2);await new Promise(r=>setTimeout(r,180));assert.equal(lsp.messages.findLast(m=>m.params?.uri===uri).params.version,3);
  lsp.send('workspace/didChangeConfiguration',{settings:{soplang:{strict:true}}});lsp.change(uri,'door x=1',4);assert.equal((await lsp.diagnostics(uri,4))[0].code,'E022');lsp.send('workspace/didChangeConfiguration',{settings:{soplang:{strict:false}}});lsp.change(uri,'abn x=1',5);assert.deepEqual(await lsp.diagnostics(uri,5),[]);
 });
 await t.test('visible symbols, receiver methods, hover and shadowing',async()=>{
  const source='teed items=[1,2]\nhawl f(abn x): abn { celi x }\nqor(items.hore())';const uri=await open(source);
  const completion=await lsp.request('textDocument/completion',params(uri,source,'hore',2));const labels=completion.items.map(i=>i.label);assert(labels.includes('geli'));assert(labels.includes('ururi'));assert(!labels.includes('weynee'));
  const hover=await lsp.request('textDocument/hover',params(uri,source,'hore',1));assert.match(hover.contents.value,/First item or maran/);
  const definition=await lsp.request('textDocument/definition',params(uri,source,'items.hore',2));assert.equal(definition[0].range.start.line,0);
  const comment='door real=1\n// real.';const c=await open(comment);assert.deepEqual(await lsp.request('textDocument/completion',params(c,comment,'real.',5)),[]);
  const dynamic='door x=gelin()\nqor(x)';const d=await open(dynamic);lsp.change(d,dynamic+'\nx.',2);const result=await lsp.request('textDocument/completion',{textDocument:{uri:d},position:{line:2,character:2}});assert.equal(result.items.length,0);
 });
 await t.test('nested multiline signatures and zero arguments',async()=>{
  const source='hawl add(abn a, abn b): abn { celi a+b }\nqor(add(1,\n add(2, 3)))';const uri=await open(source);const sig=await lsp.request('textDocument/signatureHelp',params(uri,source,'add(2, 3)',7));assert.match(sig.signatures[0].label,/add\(abn a, abn b\)/);assert.equal(sig.activeParameter,1);
  const zero='hawl empty() { celi 1 }\nqor(empty())';const z=await open(zero);const zs=await lsp.request('textDocument/signatureHelp',params(z,zero,'empty())',6));assert.deepEqual(zs.signatures[0].parameters,[]);
 });
 await t.test('rename distinguishes shadowed variables and rejects collisions',async()=>{
  const source='abn value=1\nhawl f(abn value): abn { celi value }\nqor(value)';const uri=await open(source);const references=await lsp.request('textDocument/references',{...params(uri,source,'value=1',2),context:{includeDeclaration:true}});assert.equal(references.length,2);
  const rename=await lsp.request('textDocument/rename',{...params(uri,source,'value=1',2),newName:'number'});const edits=rename.documentChanges.find(c=>c.textDocument.uri===uri);assert.equal(edits.textDocument.version,1);assert.equal(edits.edits.length,2);assert.match(apply(source,edits.edits),/hawl f\(abn value\): abn \{ celi value \}/);
  await assert.rejects(lsp.request('textDocument/rename',{...params(uri,source,'value=1',2),newName:'hawl'}));await assert.rejects(lsp.request('textDocument/rename',{...params(uri,source,'value=1',2),newName:'nooc'}));
 });
 await t.test('unsaved imports and multi-file identities without executing imported input',async()=>{
  const lib='hawl twice(abn x): abn { celi x*2 }\nqor(gelin())';const libUri=await open(lib,'library.sop');const main='keen "library.sop"\nqor(twice(2))';const mainUri=await open(main,'main.sop');assert(!fs.existsSync(path.join(tmp,'library.sop')));
  const definitions=await lsp.request('textDocument/definition',params(mainUri,main,'twice',2));assert.equal(definitions[0].uri,libUri);
  const rename=await lsp.request('textDocument/rename',{...params(mainUri,main,'twice',2),newName:'double'});assert(rename.documentChanges.some(c=>c.textDocument.uri===mainUri));assert(rename.documentChanges.some(c=>c.textDocument.uri===libUri));
  lsp.change(libUri,'hawl twice(abn x): abn { missing = 1 celi x }',2);assert.equal((await lsp.diagnostics(libUri,2))[0].code,'E021');lsp.change(libUri,lib,3);assert.deepEqual(await lsp.diagnostics(libUri,3),[]);
 });
 await t.test('source-preserving document and range formatting',async()=>{
  const source='qoraal url = "https://example.com/a"\r\nhaddii (1 == 1) {\r\nqoraal x = "a+b" // keep a+b\r\nqor(x != "C:\\work")\r\n}\r\n';const uri=await open(source);const options={tabSize:2,insertSpaces:true};const edits=await lsp.request('textDocument/formatting',{textDocument:{uri},options});const formatted=apply(source,edits);assert.match(formatted,/  qoraal x = "a\+b" \/\/ keep a\+b/);assert(formatted.includes('https://example.com/a'));assert(formatted.includes('1 == 1'));assert.equal(formatted.split('\r\n').length,source.split('\r\n').length);
  lsp.change(uri,formatted,2);const again=await lsp.request('textDocument/formatting',{textDocument:{uri},options});assert.deepEqual(again,[]);
  lsp.change(uri,source,3);const range={start:{line:2,character:0},end:{line:3,character:0}};const partial=await lsp.request('textDocument/rangeFormatting',{textDocument:{uri},range,options});assert(partial.every(e=>e.range.start.line===2));assert.equal(apply(source,partial).split('\r\n')[3],source.split('\r\n')[3]);
  lsp.change(uri,'haddii (',4);assert.deepEqual(await lsp.request('textDocument/formatting',{textDocument:{uri},options}),[]);
 });
 await t.test('symbols, links, folding, selection, semantic tokens and untitled buffers',async()=>{
  const source='hawl salaan(qoraal name): qoraal {\n celi name\n}\nqor(salaan("A"))';const uri=await open(source);assert((await lsp.request('textDocument/documentSymbol',{textDocument:{uri}})).some(s=>s.name==='salaan'));assert((await lsp.request('textDocument/foldingRange',{textDocument:{uri}})).length);assert((await lsp.request('textDocument/semanticTokens/full',{textDocument:{uri}})).data.length);assert((await lsp.request('textDocument/selectionRange',{textDocument:{uri},positions:[{line:1,character:7}]}))[0].parent);
  const untitled='untitled:Untitled-1';lsp.open(untitled,'teed items=[1]\nqor(items.hore())');assert.deepEqual(await lsp.diagnostics(untitled,1),[]);
 });
 await t.test('import paths complete inside unfinished strings and nested directories',async()=>{
  fs.mkdirSync(path.join(tmp,'nested'),{recursive:true});fs.writeFileSync(path.join(tmp,'nested','library.sop'),'qor(1)');
  const source='keen "nested/li';const uri=pathToFileURL(path.join(tmp,'import-incomplete.sop')).href;lsp.open(uri,source);
  const items=await lsp.request('textDocument/completion',{textDocument:{uri},position:{line:0,character:source.length}});assert(items.some(i=>i.label==='library.sop'));
 });
 await t.test('rapid edits publish only the final document version and disable clears diagnostics',async()=>{
  const uri=await open('qor(1)');for(let version=2;version<=40;version++)lsp.change(uri,version===40?'qor(1)':'missing = 1',version);assert.deepEqual(await lsp.diagnostics(uri,40),[]);const published=lsp.messages.filter(m=>m.method==='textDocument/publishDiagnostics'&&m.params.uri===uri&&m.params.version>1);assert(published.every(m=>m.params.version===40));
  lsp.change(uri,'missing = 1',41);assert((await lsp.diagnostics(uri,41)).length);const disabled=lsp.messages.length;lsp.send('workspace/didChangeConfiguration',{settings:{soplang:{enableDiagnostics:false}}});assert.deepEqual(await lsp.diagnostics(uri,41,ds=>ds.length===0,disabled),[]);
 });
});
