# Verification record

Date: 2026-10-18. All results below concern the local working trees and the
Linux x64 package produced from them. No package was published.

- Clean `npm ci`: passed; 173 audited dependencies, zero known vulnerabilities.
- TypeScript strict checks and Rust Clippy with warnings denied: passed.
- Node assertion suite: 28 tests passed, no skips with the real compiler set.
  It covers generated assets, TextMate scopes for 121 catalog names, 17 snippet
  expansions, all 97 catalog callables and aliases, diagnostics parity, UTF-16,
  CRLF, emoji, combining marks, overlays, provider behavior, strict mode,
  cancellation, stale versions, limits, closures, inheritance, contextual names,
  rename capture checks, and formatting preservation.
- Rust server unit tests: 5 passed.
- Compiler 3.0.0: 106 tests passed, including four new editor API regression
  tests for overlays, file semantics, lossless source pieces, and rename.
  Concurrent compiler release work advanced the checkout to 3.0.1 at `1d24f87`;
  its 116 tests also passed with these APIs, and all 28 extension assertions
  passed against the rebuilt 3.0.1 compiler. That concurrent release work was
  preserved. The bundled analysis frontend remains pinned to 3.0.0.
- Actual JIT and LLVM executables produce equal output before and after
  formatting. Compiler tests use source files, because its `-c` branch executes
  source even when `--hir` is also supplied.
- Release-server performance on this Linux host: 100 declarations analyzed in
  2.2 ms; 2000 in 114.0 ms. Warm hover averages were 0.2 and 0.6 ms. Across 24
  repeated replacements, RSS growth was 0.0 and 17.9 MiB, within the 32 MiB
  growth threshold. These measurements exclude the 120 ms edit debounce.
- The exact VSIX is inspected for its entry point, server, grammar, snippets,
  dictionary, licenses, documentation, and absence of the mock compiler and
  development sources. A SHA-256 sidecar accompanies the artifact.
- Installed-package Extension Host tests passed on Linux x64 with VS Code
  1.95.0 and the installed 1.136.1 editor. They use isolated profiles and test
  activation, providers, diagnostics, formatting, unchanged source/settings on
  opening, restart, real selected-file Run with path metacharacters, Build,
  interactive REPL, Stop, and multi-root strict-mode settings.
- A separate actual Restricted Mode Extension Host test passed: bundled editing
  tools remain available and execution starts no task. The test runner launches
  this case directly because test-electron normally disables Workspace Trust.

The native CI matrix is authored for Linux, macOS, and Windows, both x64 and
arm64, with minimum and stable editor tests. Those remote jobs have not been
run in this session. Windows/macOS/arm64 packages, current stable downloaded
from Microsoft, remote hosts, upgrade from the
Marketplace version, and interactive save-cancellation UI are unverified here.
The installed 1.136.1 build is recorded by version, without asserting it is the
current public stable release.

Some language features remain intentionally conservative: diagnostics follow
compiler frontend coverage and report its first error; dynamic member rename
is declined; formatting changes indentation only; workspace indexing is bounded.
See SUPPORT.md for the full capability boundary. These limits and the unrun
platform matrix mean the complete release acceptance matrix is not yet signed
off.

Marketplace metadata queried with `vsce show soplang.soplang --json` reports
0.2.0 as the latest published version. The existing 1.0.0 manifest is retained
as the next extension release candidate, independently of Soplang 3.0.0.
