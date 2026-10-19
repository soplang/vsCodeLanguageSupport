const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {createHash} = require('crypto');
const {targets, verifyPackage} = require('./verify-package.cjs');

(async () => {
    const input = path.resolve(process.argv[2] || 'artifacts/targets');
    const output = path.resolve(process.argv[3] || 'artifacts/release');
    const pkg = require('../package.json');
    const packages = [];
    fs.mkdirSync(output, {recursive:true});
    for (const target of targets) {
        const filename = `soplang-${target}.vsix`;
        const file = path.join(input, filename);
        const expectedHash = fs.readFileSync(file + '.sha256', 'utf8').trim().split(/\s+/)[0];
        const result = await verifyPackage(file, target);
        if (result.sha256 !== expectedHash) throw Error(`Downloaded checksum mismatch: ${filename}`);
        if (result.version !== pkg.version || result.publisher !== pkg.publisher || result.name !== pkg.name) {
            throw Error(`Release identity mismatch: ${filename}`);
        }
        fs.copyFileSync(file, path.join(output, filename));
        packages.push({filename, ...result});
    }
    const metadata = {
        extension:`${pkg.publisher}.${pkg.name}`, version:pkg.version,
        commit:process.env.GITHUB_SHA || null,
        workflow:process.env.GITHUB_RUN_ID ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : null,
        packages
    };
    fs.writeFileSync(path.join(output, 'release.json'), JSON.stringify(metadata, null, 2) + '\n');
    fs.writeFileSync(path.join(output, 'SHA256SUMS'), packages.map(p => `${p.sha256}  ${p.filename}\n`).join(''));
    fs.writeFileSync(path.join(output, 'UPLOAD.txt'), [
        `Soplang extension ${pkg.version}`,
        '',
        'Upload the six .vsix files to the same Soplang Marketplace extension listing.',
        'Each VSIX has a different platform target and the same extension version.',
        'VS Code selects the matching package automatically.',
        'The ZIP is a download bundle. Do not upload the ZIP to Marketplace.',
        '',
        'Editing tools bundle their native language server; users do not need Rust.',
        'Run, Build, and REPL require a separately installed Soplang 3 compiler.',
        'Native editing tests run on all six targets. Real compiler execution is checked on Linux x64.',
        '',
        metadata.workflow || '',
        ''
    ].join('\n'));
    const archive = path.join(output, `soplang-${pkg.version}-platforms.zip`);
    fs.rmSync(archive, {force:true});
    execFileSync('zip', ['-q', archive, ...packages.map(p => p.filename), 'SHA256SUMS', 'release.json', 'UPLOAD.txt'], {cwd:output, stdio:'inherit'});
    const hash = createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
    fs.writeFileSync(archive + '.sha256', `${hash}  ${path.basename(archive)}\n`);
    console.log(`Created ${archive} with ${packages.length} verified platform packages.`);
})().catch(error => {console.error(error); process.exitCode = 1;});
