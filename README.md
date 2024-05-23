# TidyFold Extension for VS Code

## Overview

TidyFold is a Visual Studio Code extension designed to help you quickly minimize expanded regions in your code files. It targets specific foldable lines, such as functions, classes, and HTML elements, making it easier to navigate and manage large codebases.

## Features

- Automatically fold specified regions in your code.
- Targets JavaScript, TypeScript, and HTML foldable sections.
- Scrolls to the top of the document after folding.

## Installation

1. **Install from the VS Code Marketplace**:

   - Open Visual Studio Code.
   - Go to the Extensions view by clicking on the Extensions icon in the Activity Bar on the side of the window.
   - Search for "TidyFold" and click "Install".

2. **Install from a VSIX file**:
   - Download the `.vsix` file for TidyFold.
   - In Visual Studio Code, open the Extensions view.
   - Click on the three dots at the top-right corner and select "Install from VSIX...".
   - Choose the downloaded `.vsix` file to install the extension.

## Usage

1. Open any code file in Visual Studio Code.
2. Run the TidyFold command:
   - Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS).
   - Type and select `TidyFold: Minimize Expanded Regions`.

The extension will automatically fold the targeted regions and scroll to the top of the document.

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue on the [GitHub repository](https://github.com/your-repo/tidyfold).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

This extension leverages the VS Code API to provide folding functionality. Special thanks to the VS Code team for their extensive documentation and support.
