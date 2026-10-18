# Implementation handoff

The client is TypeScript and the bundled server is Rust. The server uses the
vendored, source-pinned Soplang 3 frontend with no runtime/backend dependency.
The compiler checkout has the same new analysis, source-piece, and symbol-index
APIs. Current language assets come from one catalog. Unsafe formatter and
heuristic provider code have been removed.

The plan's eight stages are represented in the implementation: activation and
defaults; language coverage; compiler tasks; read-only analysis and LSP lifecycle;
semantic providers; navigation and conservative refactoring; indentation-only
source-preserving formatting; tests and release packaging. Full release
acceptance remains pending the unrun native platform and environment matrix.

See [VERIFICATION.md](VERIFICATION.md) for test evidence and
[SUPPORT.md](SUPPORT.md) for limits. The Linux x64 artifact is
`artifacts/soplang-linux-x64.vsix`, with a SHA-256 sidecar. The compiler,
clang, rustc, and complete matching Soplang runtime libraries are execution and
build prerequisites. No source debugger is included.

At the initial implementation handoff, no Git mutations had been performed.
The follow-up commit request authorizes the logical commits below without
co-author trailers. `EXTENSION_PLAN.md` remains untouched and untracked. Compiler release changes appeared and were
committed concurrently outside this task; they were left intact. Review the
working trees and index before staging. The extension's frontend remains pinned
to the audited 3.0.0 revision, independently of subsequent compiler releases.

The commands below stage only this implementation, arranged as logical commits.
These blocks document the staging groups and commit messages used for the
follow-up commit request.

```sh
(
set -e
cd /home/sharafdin/Documents/Goobo-Labs/soplang
if ! git diff --cached --quiet; then
    printf '%s\n' 'The index already contains staged changes. Review and finish that work before using this commit block.'
    exit 1
fi
git add -- src/lib.rs src/frontend/mod.rs src/frontend/parser.rs src/frontend/trivia.rs src/analysis.rs src/analysis/index.rs tests/analysis_services.rs
git commit -F - <<'EOF_COMMIT'
Expose read-only analysis services for editor integrations

Add bounded source analysis with unsaved import overlays and file semantics.
Expose partial editor parsing, lossless source pieces, source symbol identities,
and rename binding checks without involving code generation or execution.
EOF_COMMIT
)
```

```sh
(
set -e
cd /home/sharafdin/Documents/Goobo-Labs/vsCodeLanguageSupport
if ! git diff --cached --quiet; then
    printf '%s\n' 'The index already contains staged changes. Review and finish that work before using this commit block.'
    exit 1
fi
git add -- language/catalog.json scripts/generate.cjs dictionaries/soplang.txt grammar.ebnf keywords.md language-configuration.json snippets/soplang.json syntaxes/soplang.tmLanguage.json
git commit -F - <<'EOF_COMMIT'
Align language assets with the implemented Soplang 3 syntax and APIs

Generate highlighting, spelling terms, and reference help from a reviewed
catalog. Replace obsolete snippets with canonical examples while preserving
supported compatibility spellings and receiver-specific return contracts.
EOF_COMMIT
)
```

```sh
(
set -e
cd /home/sharafdin/Documents/Goobo-Labs/vsCodeLanguageSupport
if ! git diff --cached --quiet; then
    printf '%s\n' 'The index already contains staged changes. Review and finish that work before using this commit block.'
    exit 1
fi
git add -- server vendor/soplang-frontend scripts/build-server.cjs licenses docs/THIRD_PARTY_NOTICES.md
git commit -F - <<'EOF_COMMIT'
Add a bundled Rust language server backed by the pinned compiler frontend

Analyze unsaved sources and imports without executing programs. Add semantic
editing providers, symbol-based navigation and conservative rename, lossless
indentation formatting, cancellation, stale-result rejection, and bounded
workspace indexing. Include the shared frontend source and dependency licenses.
EOF_COMMIT
)
```

```sh
(
set -e
cd /home/sharafdin/Documents/Goobo-Labs/vsCodeLanguageSupport
if ! git diff --cached --quiet; then
    printf '%s\n' 'The index already contains staged changes. Review and finish that work before using this commit block.'
    exit 1
fi
git add -- .gitignore .vscodeignore package.json package-lock.json tsconfig.json src/extension.ts src/process.ts src/extension.js src/diagnostics.js src/formatter.js src/hoverProvider.js src/signatureHelp.js src/autoComplate/autoComplete.js scripts/build.cjs scripts/clean.cjs scripts/check-assets.cjs scripts/verify-package.cjs
git add -f -- out/extension.js
git commit -F - <<'EOF_COMMIT'
Replace legacy providers with a typed client and real compiler tasks

Use one generated client entry and manage the native server lifecycle.
Add executable discovery and process tasks for selected-file Run, Build,
interactive REPL, and Stop. Respect saves, resource settings, and Workspace
Trust. Remove global spelling changes and forced format-on-save defaults.
EOF_COMMIT
)
```

```sh
(
set -e
cd /home/sharafdin/Documents/Goobo-Labs/vsCodeLanguageSupport
if ! git diff --cached --quiet; then
    printf '%s\n' 'The index already contains staged changes. Review and finish that work before using this commit block.'
    exit 1
fi
git add -- .github/workflows/verify.yml tests/catalog.test.cjs tests/contracts.test.cjs tests/lifecycle.test.cjs tests/lsp.cjs tests/lsp.test.cjs tests/parity.test.cjs tests/performance.cjs tests/process.test.cjs tests/semantics.test.cjs tests/run-host.cjs tests/host/index.cjs tests/test-diagnostics.js tests/test-formatter.js
git commit -F - <<'EOF_COMMIT'
Verify compiler parity and installed extension behavior

Add assertions for language assets, callable contracts, semantic providers,
Unicode positions, import overlays, rename safety, formatting preservation,
and performance. Install the actual VSIX in isolated Extension Hosts and add
native build and editor-version CI matrices.
EOF_COMMIT
)
```

```sh
(
set -e
cd /home/sharafdin/Documents/Goobo-Labs/vsCodeLanguageSupport
if ! git diff --cached --quiet; then
    printf '%s\n' 'The index already contains staged changes. Review and finish that work before using this commit block.'
    exit 1
fi
git add -- README.md CHANGELOG.md docs/DEVELOPMENT.md docs/SUPPORT.md docs/VERIFICATION.md docs/HANDOFF.md
git commit -F - <<'EOF_COMMIT'
Document Soplang 3 setup, verification results, and release limits

Describe compiler and native-build prerequisites, supported editor workflows,
verified Linux package behavior, and the remaining platform and environment
checks. Retain version 1.0.0 as the next extension release candidate.
EOF_COMMIT
)
```
