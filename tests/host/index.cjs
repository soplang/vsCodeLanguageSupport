const vscode=require('vscode');const assert=require('assert/strict');const fs=require('fs');const path=require('path');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(label,probe,ready)=>{let last;for(let i=0;i<100;i++){last=await probe();if(ready(last))return last;await sleep(100);}throw Error(`${label} did not become ready: ${JSON.stringify(last)}`);};
exports.run=async()=>{
 const ext=vscode.extensions.getExtension('soplang.soplang');assert(ext,'Installed extension was not found');assert(!ext.extensionPath.includes('vsCodeLanguageSupport'),'Test must load the installed VSIX');
 const before=vscode.workspace.getConfiguration().get('cSpell.enabled');
 const root=vscode.workspace.workspaceFolders[0].uri.fsPath;const file=path.join(root,'host.sop');const source='teed items=[1,2]\nhawl add(abn a, abn b): abn { celi a+b }\nqor(items.hore())';fs.writeFileSync(file,source);let doc=await vscode.workspace.openTextDocument(file);await vscode.window.showTextDocument(doc);
 await waitFor('Hover provider',()=>vscode.commands.executeCommand('vscode.executeHoverProvider',doc.uri,new vscode.Position(2,12)),result=>result?.length);
 assert(ext.isActive,'Opening a Soplang file did not activate the installed extension');
 const completions=await waitFor('Completion provider',()=>vscode.commands.executeCommand('vscode.executeCompletionItemProvider',doc.uri,new vscode.Position(2,12)),result=>result?.items?.some(item=>item.label==='geli'));assert(completions.items.some(item=>item.label==='geli'));
 const definitions=await waitFor('Definition provider',()=>vscode.commands.executeCommand('vscode.executeDefinitionProvider',doc.uri,new vscode.Position(2,6)),result=>result?.length);assert.equal(definitions[0].range.start.line,0);
 const signatures=await waitFor('Signature help',()=>vscode.commands.executeCommand('vscode.executeSignatureHelpProvider',doc.uri,new vscode.Position(2,15)),result=>result?.signatures?.length);assert(signatures.signatures.length);
 let symbols;try{symbols=await waitFor('Document symbols',()=>vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider',doc.uri),result=>result?.some(symbol=>symbol.name==='add'));}catch(error){const workspace=await vscode.commands.executeCommand('vscode.executeWorkspaceSymbolProvider','add');throw Error(`${error.message}; workspace symbols: ${JSON.stringify(workspace)}; diagnostics: ${JSON.stringify(vscode.languages.getDiagnostics(doc.uri))}`);}assert(symbols.some(symbol=>symbol.name==='add'));
 const rename=await waitFor('Rename provider',()=>vscode.commands.executeCommand('vscode.executeDocumentRenameProvider',doc.uri,new vscode.Position(0,7),'numbers'),result=>result?.entries().length);assert(rename.entries().length);
 const edit=new vscode.WorkspaceEdit();edit.replace(doc.uri,new vscode.Range(0,0,doc.lineCount,0),'missing = 1');await vscode.workspace.applyEdit(edit);
 for(let i=0;i<100&&!vscode.languages.getDiagnostics(doc.uri).length;i++)await sleep(50);assert.equal(vscode.languages.getDiagnostics(doc.uri)[0].code,'E021');
 const restore=new vscode.WorkspaceEdit();restore.replace(doc.uri,new vscode.Range(0,0,doc.lineCount,0),'haddii (1 == 1) {\nqoraal text="a+b"\nqor(text)\n}\n');await vscode.workspace.applyEdit(restore);
 const formatting=await waitFor('Formatter',()=>vscode.commands.executeCommand('vscode.executeFormatDocumentProvider',doc.uri,{tabSize:2,insertSpaces:true}),result=>result?.length);assert(formatting.length);const apply=new vscode.WorkspaceEdit();apply.set(doc.uri,formatting);await vscode.workspace.applyEdit(apply);assert(doc.getText().includes('"a+b"'));assert(doc.getText().includes('1 == 1'));
 assert.equal(vscode.workspace.getConfiguration().get('cSpell.enabled'),before);assert(doc.isDirty);assert.equal(fs.readFileSync(file,'utf8'),source,'Opening or analyzing a file wrote to disk');
 const second=vscode.workspace.workspaceFolders[1];assert(second,'Multi-root workspace missing');
 const secondFile=vscode.Uri.joinPath(second.uri,'strict.sop');fs.writeFileSync(secondFile.fsPath,'door local=1');await vscode.workspace.getConfiguration('soplang',second.uri).update('strict',true,vscode.ConfigurationTarget.WorkspaceFolder);const secondDoc=await vscode.workspace.openTextDocument(secondFile);for(let i=0;i<100&&!vscode.languages.getDiagnostics(secondFile).length;i++)await sleep(50);assert.equal(vscode.languages.getDiagnostics(secondFile)[0].code,'E022');assert(!vscode.languages.getDiagnostics(doc.uri).some(d=>d.code==='E022'));
 if(process.env.SOPLANG_RESTRICTED){assert.equal(vscode.workspace.isTrusted,false);let tasks=0;const listener=vscode.tasks.onDidStartTask(()=>tasks++);void vscode.commands.executeCommand('soplang.runFile',doc.uri);await sleep(400);assert.equal(tasks,0);listener.dispose();await vscode.commands.executeCommand('notifications.clearAll');}
 if(process.env.SOPLANG_COMPILER&&!process.env.SOPLANG_RESTRICTED){
  await vscode.workspace.getConfiguration('soplang').update('compilerPath',process.env.SOPLANG_COMPILER,vscode.ConfigurationTarget.Workspace);
  const schemaFile=path.join(root,'schema.sop');fs.writeFileSync(schemaFile,'jadwal qof { aqoonsi abn furaha }');
  const schemaDoc=await vscode.workspace.openTextDocument(schemaFile);assert.equal(schemaDoc.languageId,'soplang-schema');
  const schemaHover=await waitFor('3.6 schema hover',()=>vscode.commands.executeCommand('vscode.executeHoverProvider',schemaDoc.uri,new vscode.Position(0,2)),result=>result?.length);
  assert(schemaHover.length);
  const selected=path.join(root,process.platform==='win32'?"Élan 'selected' & file.sop":"Élan 'selected'; $(literal) & file.sop");fs.writeFileSync(selected,'qor("selected")');
  let started;const begin=vscode.tasks.onDidStartTask(e=>{if(e.execution.task.source==='Soplang')started=e.execution;});
  const finished=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Compiler task did not finish')),30000);const listener=vscode.tasks.onDidEndTaskProcess(e=>{if(e.execution.task.source==='Soplang'){clearTimeout(timer);listener.dispose();resolve(e.exitCode);}});});
  await vscode.commands.executeCommand('soplang.runFile',vscode.Uri.file(selected));assert.equal(await finished,0);begin.dispose();assert(started.task.execution instanceof vscode.ProcessExecution);assert.equal(started.task.execution.args.at(-1),selected);
  async function task(command,selected,interact){
   let execution;const start=vscode.tasks.onDidStartTask(e=>{if(e.execution.task.source==='Soplang')execution=e.execution;});
   const finish=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(`Timeout ${command}`)),60000);const end=vscode.tasks.onDidEndTaskProcess(e=>{if(e.execution.task.source==='Soplang'){clearTimeout(timer);end.dispose();resolve(e.exitCode);}});});
   await vscode.commands.executeCommand(command,selected);for(let i=0;i<50&&!execution;i++)await sleep(20);assert(execution);start.dispose();if(interact)await interact(execution);return finish;
  }
  await vscode.workspace.getConfiguration('soplang').update('build.output',path.join(root,'built-program'),vscode.ConfigurationTarget.Workspace);
  assert.equal(await task('soplang.buildFile',vscode.Uri.file(selected)),0);assert(fs.existsSync(path.join(root,'built-program')));
  await task('soplang.openRepl',undefined,async execution=>{await sleep(300);const terminal=vscode.window.terminals.find(t=>t.name.includes('REPL'));assert(terminal);terminal.sendText('qor("interactive")');terminal.sendText('/exit');});
  fs.writeFileSync(selected,'intay (run) {}');await task('soplang.runFile',vscode.Uri.file(selected),async()=>{await sleep(250);await vscode.commands.executeCommand('soplang.stop');});
 }
 await vscode.commands.executeCommand('soplang.restartServer');await vscode.commands.executeCommand('soplang.stop');
 console.log('Installed VSIX Extension Host assertions passed.');
};
