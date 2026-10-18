import {execFile} from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export function compilerVersion(executable: string, cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
        execFile(executable, ['--version'], {cwd, timeout:5000, maxBuffer:64 * 1024, windowsHide:true}, (error, stdout, stderr) => {
            if (error) { reject(new Error(`Cannot run ${executable}: ${error.message}`)); return; }
            const version = /\bsoplang\s+(3\.\d+\.\d+)\b/i.exec(stdout + stderr)?.[1];
            if (!version) { reject(new Error('The selected executable is not a supported Soplang 3 compiler.')); return; }
            resolve(version);
        });
    });
}
export function resolveCompiler(configured: string, cwd: string, mockPath: string): string {
    const candidates = path.isAbsolute(configured) || configured.includes('/') || configured.includes('\\')
        ? [path.resolve(cwd, configured)]
        : (process.env.PATH || '').split(path.delimiter).flatMap(dir => process.platform === 'win32'
            ? ['.exe', '.com', ''].map(ext => path.join(dir, configured + ext)) : [path.join(dir, configured)]);
    const candidate = candidates.find(file => { try { fs.accessSync(file, fs.constants.X_OK); return fs.statSync(file).isFile(); } catch { return false; } });
    if (!candidate) throw new Error(`Soplang compiler not found: ${configured}. Set soplang.compilerPath to the real compiler executable.`);
    if (fs.realpathSync(candidate) === path.resolve(mockPath)) throw new Error('The repository mock is not a Soplang compiler. Select the real Soplang 3 executable.');
    return candidate;
}
export function taskArgs(mode: 'run'|'build'|'repl', file: string|undefined, strict: boolean, output: string, optimization: number): string[] {
    const args = ['--no-color', ...(strict ? ['--strict'] : [])];
    if (mode === 'build') args.push('--build', '--quiet', '--opt-level', String(optimization), ...(output ? ['-o', output] : []));
    if (file) args.push('--', file);
    return args;
}
