// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "tidyfold.minimizeExpandedRegions",
    async () => {
      const editor = vscode.window.activeTextEditor;

      if (editor) {
        const document = editor.document;
        const text = document.getText();
        const lines = text.split("\n");
        const linesToFold: number[] = getFoldableLines(lines);

        for (const line of linesToFold) {
          editor.selections = [new vscode.Selection(line, 0, line, 0)];

          // fold the current selection
          await vscode.commands.executeCommand("editor.fold");

          // // highlight the current selection (add decoration)
          //   editor.setDecorations(
          //     vscode.window.createTextEditorDecorationType({
          //       backgroundColor: "rgba(255, 255, 0, 0.3)",
          //       isWholeLine: true,
          //     }),
          //     [new vscode.Range(line, 0, line, lines[line].length)]
          //   );
        }

        // scroll to the top of the document
        await vscode.commands.executeCommand("cursorTop");
      }
    }
  );

  context.subscriptions.push(disposable);
}

// Returns the line numbers of the foldable lines
function getFoldableLines(lines: string[]): number[] {
  const foldableLines: number[] = [];
  const jsFoldables = [
    "function",
    "class",
    "const",
    "$effect",
    "type",
    "export",
    "for",
    "if",
  ];
  const htmlFoldables = ["<div", "<form", "{#snippet"];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    for (const foldable of jsFoldables) {
      if (
        line.startsWith("//") &&
        i + 1 < lines.length &&
        lines[i + 1].trim().startsWith(foldable)
      ) {
        foldableLines.push(i + 1);
      }
    }

    for (const foldable of htmlFoldables) {
      if (
        line.startsWith("<!--") &&
        i + 1 < lines.length &&
        lines[i + 1].trim().startsWith(foldable)
      ) {
        foldableLines.push(i + 1);
      }
    }
  }

  return foldableLines;
}

// This method is called when your extension is deactivated
export function deactivate() {}
