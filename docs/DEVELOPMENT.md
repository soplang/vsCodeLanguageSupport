# Development

Use Node.js 22 or later and Rust 1.94 or later. The generated JavaScript entry
is built from `src/extension.ts`; legacy JavaScript providers are removed.
`package-lock.json` and `server/Cargo.lock` lock dependency resolution.

```sh
npm ci
npm run generate
npm run check
npm run build
cargo test --locked --manifest-path server/Cargo.toml
cargo build --locked --manifest-path server/Cargo.toml
npm test
npm run build:server
mkdir -p artifacts
npm run package -- --target linux-x64 --out artifacts/soplang-linux-x64.vsix
npm run verify:package -- artifacts/soplang-linux-x64.vsix
SOPLANG_VSIX=artifacts/soplang-linux-x64.vsix npm run test:host
```

Set `SOPLANG_COMPILER` to a real compiler executable to enable snippet and
compiler execution checks. No tests substitute the root mock executable.
`VSCODE_EXECUTABLE` uses an existing editor; otherwise `VSCODE_VERSION` selects
an editor download (`stable` by default, `1.95.0` for the minimum).
Extension Host tests install the exact VSIX into isolated temporary extension
and profile directories. The development extension is a separate empty test
driver, so the installed package supplies all Soplang registrations.
`SOPLANG_RESTRICTED=1` runs an additional Restricted Mode case without the
standard test runner's automatic trust-disabling flag.
Linux GUI tests need a display, or `xvfb-run -a` in CI.

`VSCE_TARGET` selects the package target and `CARGO_BUILD_TARGET` selects the Rust
target for native builds. Build on each target host. Do not put one host's native
binary in another host's package. The artifact contains a single bundled JS
entry, grammar, snippets, dictionary, native server, images, and licenses.

The `Verify extension` Actions workflow builds all six native targets and tests
each installed VSIX in the minimum and current stable editor, including
Restricted Mode. After all native and compiler parity jobs pass, the
`release-bundle` job verifies each package's target and native architecture,
checks its checksum and version, and uploads `soplang-platform-release`.
That artifact contains the six VSIX files, checksums, provenance, upload
instructions, and a ZIP containing the complete set. Upload the individual
VSIX files to the same Marketplace extension version. The ZIP is for download
and storage, not Marketplace upload. No publisher credential is needed to build
or download these artifacts.

The vendored frontend contains upstream lexer/parser/AST/import/semantic/error
sources, plus `analysis.rs`, `analysis/index.rs`, partial-parser support, and a
backend-free crate wrapper. The same editor APIs live in the compiler checkout.
Refresh the upstream pin and catalog together, inspect the source diff, and run
the compiler's own tests before accepting a frontend update. No generated files
contain checkout-specific runtime dependencies.

Before release, require: initial analysis under 250 ms for 100 declarations,
under 1500 ms for 2000 declarations, warm requests under 100 ms for those files,
and no continued memory growth over repeated replacements after warm-up.
The debounce target is 120 ms. Performance checks are in tests/performance.cjs.
