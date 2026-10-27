# Support and limits

With Soplang 3.6 or later installed, the extension uses the compiler's `lsp`
command for current diagnostics, completion, navigation, formatting, and
`schema.sop` support. Its native definitions open through the compiler's
read-only `soplang-stdlib` source provider. The bundled fallback analysis
frontend is Soplang 3.0.0 at compiler revision
`e72c6668276fa801691ddb1c753ebbe2f73a417c`. Its source and license are vendored,
with upstream file hashes and local editor changes recorded in
`vendor/soplang-frontend`. Packages never require a sibling checkout.

Native package targets are Linux x64/arm64, macOS x64/arm64, and Windows x64/arm64.
CI builds and tests each target on a matching operating system. Adding a CI
matrix is not evidence that its jobs have run. Actual verification from this
session is recorded in `docs/VERIFICATION.md`. Unsupported native hosts retain
TextMate highlighting and snippets. Browser-only VS Code has no native server
or compiler tasks. Virtual filesystem workspaces are unsupported.

The minimum declared VS Code version is 1.95.0. Basic grammar and snippets do
not need a compiler or network connection. Run/Build/REPL support real 3.x CLI
flags. The bundled fallback remains a 3.0 baseline; install Soplang 3.6 for
current language and schema analysis. `soplang.serverPath` explicitly selects
a bundled-compatible legacy analysis server and bypasses compiler discovery.

## Bundled fallback behavior

Diagnostics retain the compiler's first-error behavior and Somali messages.
Only lexer, parser, and semantic analyzer errors are reported. Failures that
remain runtime checks, including some undefined reads, dynamic dispatch, and
collection argument validation, are not invented as static errors. Diagnostics
can be disabled without disabling other editing tools. Strict mode uses file
semantics, never REPL redeclaration rules.

Completion and navigation use parsed declarations and lexical scopes.
Incomplete buffers retain complete statements and try delimiter recovery for
editor indexing; this does not alter compiler acceptance. Dynamic receivers,
computed callable targets, and inferred values after assignment can remain
unresolved. Member rename is declined because dynamic dispatch and property
aliasing prevent a complete reference proof. Rename requires error-free relevant
sources, checks collisions and captures, and returns versioned document edits.
Renaming to built-in or contextual syntax names is declined.
There are no speculative quick fixes or automatic alias migrations.

Workspace discovery is bounded to 128 source files, 8 directory levels, 8192
directory entries, and 8 MiB of source. Hidden folders, build output, dependency
folders, symlinks during workspace discovery, binary `.so` files, and oversized
files are skipped. Global rename is declined when discovery or snapshot limits
prevent a complete scan. Imports are limited to 128 files, 32 levels, and 8 MiB per
analysis. The default file limit is 1 MiB, configurable up to 4 MiB. The server
retains at most 32 MiB of source across analysis snapshots and 16 MiB across
open document text. The input queue holds at most eight messages. Navigation covers
indexed workspace files and imports; rename cannot claim completeness beyond
these limits. Large projects need a larger-project indexing design before
broad refactoring can be advertised.

Soplang 3.6 includes files, networking, tasks, packages, web, and data APIs.
Those APIs are analyzed by the installed compiler server; the fallback server
does not understand all new syntax or native APIs. Source debugging is a
separate project.
