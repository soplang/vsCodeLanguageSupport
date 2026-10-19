# Changelog

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
