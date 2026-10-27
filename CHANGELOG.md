# Changelog

## 1.1.0 (unreleased)

- Use the installed Soplang 3.6 language server for current source and schema analysis.
- Add `schema.sop` highlighting and snippets and update the Soplang grammar.
- Keep bundled 3.0 analysis as a fallback when the compiler is unavailable.
- Open native definitions from the compiler's read-only source provider.
- Launch the REPL explicitly with `isdhexgal` and document toolchain-free builds.

## 1.0.0 (2026-10-19)

- Replace duplicate client implementations with one generated TypeScript entry.
- Add a bundled Rust language server using the pinned Soplang 3 frontend.
- Replace heuristic diagnostics and obsolete language tables with compiler
  analysis, current syntax, canonical snippets, and a reviewed API catalog.
- Add semantic editor providers and conservative symbol-based rename.
- Replace text-rewriting formatting with source-preserving indentation edits.
- Add real compiler discovery and process tasks for Run, Build, REPL, and Stop.
- Remove forced format-on-save and global spell-check changes.
- Add package inspection, provider tests, native CI, and installed VSIX tests.
