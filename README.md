# Soplang for Visual Studio Code

Editor tools for the implemented Soplang 3 language. `.sop` is recommended;
`.so` remains associated for existing source files. Change the language mode
when opening a binary shared library with that extension.

The extension bundles a native Rust analysis server with a pinned compiler
frontend. Analysis uses unsaved buffers and imports without running source,
reading interactive input, compiling native code, or invoking LLVM.

Available tools include syntax highlighting, canonical snippets, compiler
frontend diagnostics, visible-symbol and typed-receiver completion, English
hover documentation, signature help, definitions, references, symbols,
highlights, conservative rename, folding, selection ranges, import links,
semantic highlighting, and indentation formatting.

Run, Build, Open REPL, Stop, Compiler Status, and Restart Language Server are
available in the command palette. Run also works from Explorer and the editor
context menu. `Ctrl+Shift+R` (`Cmd+Shift+R` on macOS) runs the selected file.
Compiler tasks have interactive terminals and use executable/argument arrays.

Install a real Soplang 3 compiler on the extension host for execution. Set
`soplang.compilerPath` to its executable path if it is absent from `PATH`.
The extension does not install a compiler. Standalone builds also need the
compiler's clang, rustc, and matching Soplang runtime libraries. A source debugger
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
SSH, WSL, and containers when a matching native server is present.

No settings are changed when the extension activates. Formatting on save is
opt-in. The formatter changes leading indentation only, preserves strings,
comments, operators and EOLs, and returns no edits for malformed source. Range
formatting touches only indentation wholly inside the selected range.

Code Spell Checker is optional. The contributed `soplang` dictionary can be
enabled through its language settings; no global spelling settings are changed.

See [the support matrix](docs/SUPPORT.md) for verification status and limits,
[the language catalog](keywords.md) for signatures and contracts, and
[development instructions](docs/DEVELOPMENT.md) for builds and tests.
