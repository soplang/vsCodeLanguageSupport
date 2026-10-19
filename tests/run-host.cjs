const {runTests, downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath} = require('@vscode/test-electron');
const {execFile, execFileSync, spawn} = require('child_process');
const exec = require('util').promisify(execFile);
const fs = require('fs');
const path = require('path');
const os = require('os');

(async () => {
    const vsix = path.resolve(process.env.SOPLANG_VSIX || 'artifacts/soplang-linux-x64.vsix');
    if (!fs.existsSync(vsix)) throw Error('Package the VSIX before running installed extension tests.');
    let executable = process.env.VSCODE_EXECUTABLE || await downloadAndUnzipVSCode(process.env.VSCODE_VERSION || 'stable');
    if (process.platform === 'darwin' && !fs.existsSync(executable)) {
        // Recent editors renamed Electron to the CFBundleExecutable value.
        // Older editors still use Electron, which test-electron already resolves.
        const contents = path.dirname(path.dirname(executable));
        const name = execFileSync('/usr/bin/plutil', [
            '-extract', 'CFBundleExecutable', 'raw', '-o', '-', path.join(contents, 'Info.plist')
        ], {encoding:'utf8'}).trim();
        if (!name || path.basename(name) !== name) throw Error('Invalid editor bundle executable');
        executable = path.join(contents, 'MacOS', name);
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'soplang-host-'));
    const extensions = path.join(dir, 'extensions');
    const user = path.join(dir, 'user');
    const workspace = path.join(dir, 'workspace');
    const driver = path.join(dir, 'driver');
    const second = path.join(dir, 'second');
    for (const folder of [extensions, user, workspace, driver, second]) fs.mkdirSync(folder, {recursive:true});
    fs.mkdirSync(path.join(user, 'User'), {recursive:true});
    fs.writeFileSync(path.join(user, 'User', 'settings.json'), JSON.stringify({
        'security.workspace.trust.enabled':true,
        'security.workspace.trust.startupPrompt':'never'
    }));
    const workspaceFile = path.join(dir, 'test.code-workspace');
    fs.writeFileSync(workspaceFile, JSON.stringify({folders:[{path:workspace}, {path:second}], settings:{}}));
    fs.writeFileSync(path.join(driver, 'package.json'), JSON.stringify({
        name:'soplang-test-driver', publisher:'soplang-tests', version:'0.0.1', engines:{vscode:'^1.95.0'}
    }));
    const [cli, ...args] = resolveCliArgsFromVSCodeExecutablePath(executable);
    const windows = process.platform === 'win32';
    const cliExecutable = windows ? executable : cli;
    const cliArgs = windows ? [path.join(path.dirname(executable), 'resources', 'app', 'out', 'cli.js')] : [];
    await exec(cliExecutable, [...cliArgs, ...args, '--user-data-dir', user, '--extensions-dir', extensions, '--install-extension', vsix, '--force'], {
        env:{...process.env, ELECTRON_RUN_AS_NODE:'1'}, timeout:60000
    });
    const options = {
        vscodeExecutablePath:executable,
        extensionDevelopmentPath:driver,
        extensionTestsPath:path.resolve('tests/host/index.cjs'),
        extensionTestsEnv:{SOPLANG_COMPILER:process.env.SOPLANG_COMPILER, SOPLANG_RESTRICTED:process.env.SOPLANG_RESTRICTED},
        launchArgs:[workspaceFile, '--user-data-dir', user, '--extensions-dir', extensions,
            '--no-sandbox', '--disable-gpu', '--skip-welcome', '--skip-release-notes', '--disable-updates']
    };
    try {
        if (process.env.SOPLANG_RESTRICTED) {
            // test-electron always appends --disable-workspace-trust. Launch
            // directly for this case so Restricted Mode is actually exercised.
            await new Promise((resolve, reject) => {
                const child = spawn(executable, [...options.launchArgs,
                    `--extensionDevelopmentPath=${driver}`, `--extensionTestsPath=${options.extensionTestsPath}`], {
                    stdio:'inherit', env:{...process.env, ...options.extensionTestsEnv}
                });
                child.once('error', reject);
                child.once('exit', code => code === 0 ? resolve() : reject(Error(`Restricted Extension Host exited ${code}`)));
            });
        } else {
            await runTests(options);
        }
    } finally {
        if (!process.env.KEEP_HOST_PROFILE) fs.rmSync(dir, {recursive:true, force:true});
        else console.log(`Profile retained: ${dir}`);
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
