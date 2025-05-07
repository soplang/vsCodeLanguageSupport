# Soplang for VS Code

![Soplang Logo](images/soplang-icon.png)

VS Code language support for [Soplang](https://github.com/soplang/soplang), a programming language designed for Somali speakers.

## Features

This extension provides comprehensive language support for Soplang in Visual Studio Code:

- **Syntax Highlighting**: Full syntax highlighting for Soplang keywords, strings, comments, and operators
- **Code Execution**: Run Soplang files directly from VS Code
- **Formatting**: Automatic code formatting for Soplang files
- **Hover Information**: Documentation for Soplang keywords when hovering
- **Spell Checking**: Integration with Code Spell Checker for Soplang keywords
- **Snippets**: Common code snippets for faster development
- **Error Detection**: (Optional) Diagnostics for common syntax errors

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Soplang"
4. Click Install

## Running Soplang Files

You can run Soplang files (`.sop` or `.so` extensions) in multiple ways:

- **Context Menu**: Right-click on a file and select "Run Soplang File"
- **Keyboard Shortcut**: Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
- **Command Palette**: Press `Ctrl+Shift+P` and type "Run Soplang File"
- **Editor Title**: Click the Soplang icon in the top-right of the editor

The file will be automatically saved before running.

## Configuration

This extension provides several configuration options:

### Error Detection

By default, error detection is disabled. To enable it:

1. Open Settings (`Ctrl+,`)
2. Search for "soplang"
3. Check the "Enable Diagnostics" option

```json
"soplang.enableDiagnostics": true
```

### Formatting

Automatic formatting on save is enabled by default for Soplang files. You can disable it in the settings:

```json
"[soplang]": {
  "editor.formatOnSave": false
}
```

## Language Features

### Syntax Highlighting

All Soplang keywords are properly highlighted:

- `door` - Variable declaration
- `howl` - Function declaration
- `bandhig` - Print statement
- `akhri` - Read input
- `haddii`, `haddii_kale`, `haddii_kalena` - Conditionals
- `ku_celi`, `intay` - Loops
- ...and many more

### Hover Documentation

Hover over any Soplang keyword to see documentation, examples, and usage tips.

### Code Snippets

Type these prefixes and press Tab to use code snippets:

- `door` - Variable declaration
- `howl` - Function declaration
- `if` - If statement
- `for` - For loop
- `while` - While loop

## Requirements

- Visual Studio Code v1.95.0 or higher
- The [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension (automatically installed)

## Troubleshooting

### Soplang files not running

Make sure the `soplang` command is available in your PATH. If not, you can install it by following the instructions at [Soplang GitHub repository](https://github.com/soplang/soplang).

### Syntax highlighting not working

If syntax highlighting is not working, try:

1. Reload VS Code window (Ctrl+Shift+P > "Reload Window")
2. Ensure the file has `.sop` or `.so` extension

## Contributing

The source code for this extension is available on [GitHub](https://github.com/soplang/vsCodeLanguageSupport). Contributions are welcome!

## License

This extension is licensed under the [MIT License](LICENSE).  