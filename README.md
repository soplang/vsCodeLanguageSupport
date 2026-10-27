# Soplang for Visual Studio Code

Editor tools for Soplang 3.6. `.sop` is recommended;
`.so` remains associated for existing source files. Change the language mode
when opening a binary shared library with that extension.

In a trusted workspace, the extension uses an installed Soplang 3.6 compiler's
`lsp` command for current language and `schema.sop` analysis. If that compiler
is unavailable, its bundled 3.0 frontend remains available for older source.
Analysis uses unsaved buffers and imports without running source code.

Available tools include syntax highlighting, canonical snippets, compiler
frontend diagnostics, visible-symbol and typed-receiver completion, English
hover documentation, signature help, definitions, references, symbols,
highlights, conservative rename, folding, selection ranges, import links,
semantic highlighting, and indentation formatting.

Run, Build, Open REPL, Stop, Compiler Status, and Restart Language Server are
available in the command palette. Run also works from Explorer and the editor
context menu. `Ctrl+Shift+R` (`Cmd+Shift+R` on macOS) runs the selected file.
Compiler tasks have interactive terminals and use executable/argument arrays.

Install a real Soplang 3.6 compiler on the extension host for current analysis
and execution. Set
`soplang.compilerPath` to its executable path if it is absent from `PATH`.
The extension does not install a compiler. Official 3.6 packages include the
LLVM generator, linker, and matching runtime needed to build standalone programs;
they do not need separate Rust or Clang installations. A source debugger
requires compiler debug information and a debug adapter; neither is included.

```json
{
  "soplang.compilerPath": "soplang",
  "soplang.enableDiagnostics": true,
  "soplang.strict": false,
  "soplang.build.optimization": 2,
  "soplang.build.output": "",
  "soplang.workingDirectory": ""
}
```

The default working directory is the selected file's workspace folder, or its
source directory outside a workspace. Relative configuration paths use that
working directory. Save cancellation or failure prevents execution. Workspace
Trust is required for compiler tasks and custom server executables. Bundled
analysis works in restricted mode, with disk imports restricted to workspace
roots. Execution and analysis run on the workspace extension host, including
SSH, WSL, and containers when Soplang is installed there.

No settings are changed when the extension activates. Formatting on save is
opt-in. With Soplang 3.6 installed, formatting follows the compiler's language
server. The bundled fallback formatter changes leading indentation only and
preserves strings, comments, operators, and EOLs.

Code Spell Checker is optional. The contributed `soplang` dictionary can be
enabled through its language settings; no global spelling settings are changed.

See [the support matrix](docs/SUPPORT.md) for verification status and limits,
[the 3.6 language reference](https://github.com/soplang/soplang/tree/v3.6.0/docs/language)
for current signatures and contracts, and
[development instructions](docs/DEVELOPMENT.md) for builds and tests.
