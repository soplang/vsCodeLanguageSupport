import * as vscode from 'vscode';
import * as path from 'node:path';
import * as fs from 'node:fs';
import {LanguageClient, LanguageClientOptions, ServerOptions} from 'vscode-languageclient/node';
import {compilerVersion, resolveCompiler, taskArgs} from './process';

let client: LanguageClient | undefined;
const running = new Set<vscode.TaskExecution>();
let watcher: vscode.FileSystemWatcher | undefined;
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    const log = vscode.window.createOutputChannel('Soplang');
    const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 20);
    status.text = 'Soplang 3'; status.command = 'soplang.compilerStatus';
    const visibility = () => vscode.window.activeTextEditor?.document.languageId === 'soplang' ? status.show() : status.hide();
    context.subscriptions.push(log, status, vscode.window.onDidChangeActiveTextEditor(visibility)); visibility();
    async function startServer(): Promise<void> {
        watcher?.dispose(); watcher = undefined;
        if (client) { const old = client; client = undefined; await old.stop(); }
        const custom = vscode.workspace.isTrusted ? vscode.workspace.getConfiguration('soplang').get<string>('serverPath', '') : '';
        const platform = `${process.platform}-${process.arch}`;
        const command = custom || context.asAbsolutePath(`bin/${platform}/soplang-lsp${process.platform === 'win32' ? '.exe' : ''}`);
        if (!fs.existsSync(command)) {
            log.appendLine(`Native analysis unavailable: ${command}. Syntax highlighting and snippets remain available.`);
            status.tooltip = 'Native server unavailable on this host'; return;
        }
        watcher = vscode.workspace.createFileSystemWatcher('**/*.{sop,so}');
        context.subscriptions.push(watcher);
        const server: ServerOptions = {command, args:[], options:{env:{...process.env, RUST_BACKTRACE:'1'}}};
        const options: LanguageClientOptions = {
            documentSelector:[{scheme:'file', language:'soplang'}, {scheme:'untitled', language:'soplang'}],
            synchronize:{configurationSection:'soplang', fileEvents:watcher},
            outputChannel:log, initializationOptions:{trusted:vscode.workspace.isTrusted},
            markdown:{isTrusted:false, supportHtml:false}
        };
        client = new LanguageClient('soplang', 'Soplang 3', server, options);
        await client.start();
        await sendConfiguration();
        status.tooltip = 'Soplang 3 frontend analysis';
    }
    async function sendConfiguration(): Promise<void> {
        if (!client?.isRunning()) return;
        const resources = [...(vscode.workspace.workspaceFolders || []).map(f => f.uri), ...vscode.workspace.textDocuments.filter(d => d.languageId === 'soplang').map(d => d.uri)];
        await client.sendNotification('workspace/didChangeConfiguration', {settings:{soplang:vscode.workspace.getConfiguration('soplang')}});
        await client.sendNotification('soplang/documentConfiguration', {resources:resources.map(uri => {
            const config = vscode.workspace.getConfiguration('soplang', uri);
            return {uri:uri.toString(), strict:config.get<boolean>('strict', false), enableDiagnostics:config.get<boolean>('enableDiagnostics', true)};
        })});
    }
    const guarded = (fn: (...args: any[]) => Promise<unknown>) => async (...args: any[]) => {
        try { return await fn(...args); } catch (error) { const message = error instanceof Error ? error.message : String(error); log.appendLine(message); await vscode.window.showErrorMessage(message); }
    };
    async function execute(mode: 'run'|'build'|'repl', selected?: vscode.Uri): Promise<void> {
        if (!vscode.workspace.isTrusted) throw new Error('Trust this workspace before running the compiler.');
        let uri = selected || vscode.window.activeTextEditor?.document.uri;
        let file: string | undefined;
        if (mode !== 'repl') {
            if (!uri) throw new Error('Select a Soplang source file first.');
            let document = await vscode.workspace.openTextDocument(uri);
            if (document.isUntitled) {
                const saved = await vscode.workspace.saveAs(uri);
                if (!saved) return;
                uri = saved;
                document = await vscode.workspace.openTextDocument(saved);
            }
            if (uri.scheme !== 'file') throw new Error('Compiler tasks require a source file on the extension host filesystem.');
            if (document.isDirty && !(await document.save())) throw new Error('Save failed. The compiler was not started.');
            file = uri.fsPath;
        }
        const folder = uri ? vscode.workspace.getWorkspaceFolder(uri) : vscode.workspace.workspaceFolders?.[0];
        const base = folder?.uri.fsPath || (file ? path.dirname(file) : process.cwd());
        const config = vscode.workspace.getConfiguration('soplang', uri);
        const cwd = path.resolve(base, config.get<string>('workingDirectory', '') || '.');
        const executable = resolveCompiler(config.get<string>('compilerPath', 'soplang'), cwd, context.asAbsolutePath('soplang'));
        const version = await compilerVersion(executable, cwd);
        log.appendLine(`Compiler ${version}: ${executable}`);
        const args = taskArgs(mode, file, config.get<boolean>('strict', false), config.get<string>('build.output', ''), config.get<number>('build.optimization', 2));
        const task = new vscode.Task({type:'soplang', mode, file}, folder || vscode.TaskScope.Global, mode === 'repl' ? 'REPL' : `${mode}: ${path.basename(file!)}`, 'Soplang', new vscode.ProcessExecution(executable, args, {cwd}), ['$soplang']);
        task.presentationOptions = {reveal:vscode.TaskRevealKind.Always, panel:vscode.TaskPanelKind.Dedicated, focus:true, clear:false};
        running.add(await vscode.tasks.executeTask(task));
    }
    for (const [id, mode] of [['runFile','run'], ['buildFile','build'], ['openRepl','repl']] as const) {
        context.subscriptions.push(vscode.commands.registerCommand(`soplang.${id}`, guarded((uri?: vscode.Uri) => execute(mode, uri))));
    }
    context.subscriptions.push(
        vscode.tasks.onDidEndTask(event => running.delete(event.execution)),
        vscode.commands.registerCommand('soplang.stop', () => { for (const execution of running) execution.terminate(); }),
        vscode.commands.registerCommand('soplang.formatDocument', () => vscode.commands.executeCommand('editor.action.formatDocument')),
        vscode.commands.registerCommand('soplang.restartServer', guarded(startServer)),
        vscode.commands.registerCommand('soplang.compilerStatus', guarded(async () => {
            if (!vscode.workspace.isTrusted) throw new Error('Compiler discovery requires Workspace Trust. Bundled analysis is available in restricted mode.');
            const uri = vscode.window.activeTextEditor?.document.uri;
            const cwd = (uri && vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath) || process.cwd();
            const executable = resolveCompiler(vscode.workspace.getConfiguration('soplang', uri).get<string>('compilerPath', 'soplang'), cwd, context.asAbsolutePath('soplang'));
            await vscode.window.showInformationMessage(`Soplang ${await compilerVersion(executable, cwd)}: ${executable}`);
        })),
        vscode.workspace.onDidGrantWorkspaceTrust(guarded(startServer)),
        vscode.workspace.onDidChangeConfiguration(event => { if (event.affectsConfiguration('soplang')) void guarded(sendConfiguration)(); }),
        vscode.workspace.onDidOpenTextDocument(document => { if (document.languageId === 'soplang') void guarded(sendConfiguration)(); }),
        vscode.workspace.onDidChangeWorkspaceFolders(() => { void guarded(sendConfiguration)(); }),
        {dispose:() => { for (const execution of running) execution.terminate(); }}
    );
    await guarded(startServer)();
}
export async function deactivate(): Promise<void> { watcher?.dispose(); watcher = undefined; await client?.stop(); client = undefined; }
