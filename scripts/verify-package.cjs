const {execFile} = require('child_process');
const exec = require('util').promisify(execFile);
const fs = require('fs');
const path = require('path');
const {createHash} = require('crypto');

const targets = ['linux-x64', 'linux-arm64', 'darwin-x64', 'darwin-arm64', 'win32-x64', 'win32-arm64'];

function verifyNative(binary, target) {
    const [platform, arch] = target.split('-');
    let valid = false;
    if (binary.length >= 64 && platform === 'linux') {
        valid = binary.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])) &&
            binary[4] === 2 && binary[5] === 1 && binary.readUInt16LE(18) === (arch === 'x64' ? 62 : 183);
    } else if (binary.length >= 64 && platform === 'win32' && binary.toString('ascii', 0, 2) === 'MZ') {
        const offset = binary.readUInt32LE(60);
        valid = offset <= binary.length - 6 && binary.toString('ascii', offset, offset + 4) === 'PE\0\0' &&
            binary.readUInt16LE(offset + 4) === (arch === 'x64' ? 0x8664 : 0xaa64);
    } else if (binary.length >= 8 && platform === 'darwin') {
        valid = binary.readUInt32LE(0) === 0xfeedfacf &&
            binary.readUInt32LE(4) === (arch === 'x64' ? 0x01000007 : 0x0100000c);
    }
    if (!targets.includes(target) || !valid) throw Error(`Native server does not match ${target}`);
}

async function verifyPackage(file, expectedTarget) {
    const {stdout} = await exec('unzip', ['-Z1', file]);
    const files = stdout.trim().split(/\r?\n/);
    for (const needed of ['extension/package.json', 'extension/out/extension.js',
        'extension/syntaxes/soplang.tmLanguage.json', 'extension/snippets/soplang.json',
        'extension/dictionaries/soplang.txt', 'extension/vendor/soplang-frontend/LICENSE']) {
        if (!files.includes(needed)) throw Error(`Missing packaged asset ${needed}`);
    }
    for (const name of files) {
        if (/^(extension\/)?(soplang$|src\/|tests\/|node_modules\/|EXTENSION_PLAN)/.test(name)) {
            throw Error(`Unwanted packaged file ${name}`);
        }
    }
    const {stdout:xml} = await exec('unzip', ['-p', file, 'extension.vsixmanifest']);
    const identity = /<Identity\s[^>]*\/>/.exec(xml)?.[0] || '';
    const target = /TargetPlatform="([^"]+)"/.exec(identity)?.[1];
    if (!targets.includes(target)) throw Error(`Missing or unsupported package target: ${target}`);
    if (expectedTarget && target !== expectedTarget) throw Error(`Expected ${expectedTarget}, found ${target}`);
    const servers = files.filter(name => /^extension\/bin\/[^/]+\/soplang-lsp(?:\.exe)?$/.test(name));
    const server = `extension/bin/${target}/soplang-lsp${target.startsWith('win32') ? '.exe' : ''}`;
    if (servers.length !== 1 || servers[0] !== server) throw Error(`Expected one bundled server for ${target}`);
    const {stdout:binary} = await exec('unzip', ['-p', file, server], {encoding:'buffer', maxBuffer:32 * 1024 * 1024});
    verifyNative(binary, target);
    const {stdout:manifest} = await exec('unzip', ['-p', file, 'extension/package.json']);
    const pkg = JSON.parse(manifest);
    if (pkg.main !== './out/extension.js') throw Error('Unexpected packaged entry');
    if (!identity.includes(`Version="${pkg.version}"`) || !identity.includes(`Publisher="${pkg.publisher}"`)) {
        throw Error('Package identity does not match its manifest');
    }
    const sha256 = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    fs.writeFileSync(file + '.sha256', `${sha256}  ${path.basename(file)}\n`);
    console.log(`Verified ${files.length} archive entries in ${file}; target ${target}; SHA-256 ${sha256}`);
    return {target, version:pkg.version, publisher:pkg.publisher, name:pkg.name, sha256};
}

module.exports = {targets, verifyNative, verifyPackage};
if (require.main === module) {
    verifyPackage(process.argv[2] || `artifacts/soplang-${process.platform}-${process.arch}.vsix`, process.env.VSCE_TARGET)
        .catch(error => {console.error(error); process.exitCode = 1;});
}
