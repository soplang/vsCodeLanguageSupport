const {test} = require('node:test');
const assert = require('node:assert/strict');
const {verifyNative} = require('../scripts/verify-package.cjs');

test('package verification rejects a native server labeled for a different platform or architecture', () => {
    const elf = Buffer.alloc(64);
    Buffer.from([0x7f, 0x45, 0x4c, 0x46, 2, 1]).copy(elf);
    elf.writeUInt16LE(62, 18);
    verifyNative(elf, 'linux-x64');
    assert.throws(() => verifyNative(elf, 'linux-arm64'));
    assert.throws(() => verifyNative(elf, 'darwin-x64'));
    const pe = Buffer.alloc(128);
    pe.write('MZ'); pe.writeUInt32LE(64, 60); pe.write('PE\0\0', 64); pe.writeUInt16LE(0xaa64, 68);
    verifyNative(pe, 'win32-arm64');
    assert.throws(() => verifyNative(pe, 'win32-x64'));
    pe.writeUInt32LE(0xffffffff, 60);
    assert.throws(() => verifyNative(pe, 'win32-arm64'));
    const macho = Buffer.alloc(8);
    macho.writeUInt32LE(0xfeedfacf); macho.writeUInt32LE(0x0100000c, 4);
    verifyNative(macho, 'darwin-arm64');
    assert.throws(() => verifyNative(macho, 'darwin-x64'));
    assert.throws(() => verifyNative(Buffer.alloc(0), 'linux-x64'));
});
