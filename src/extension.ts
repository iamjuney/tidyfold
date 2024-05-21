// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "extension.minimizeExpandFunctions",
    () => {
      const editor = vscode.window.activeTextEditor;

      if (editor) {
        const document = editor.document;
        const text = document.getText();
        const lines = text.split("\n");
        const rangesToFold: vscode.Range[] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          // Example rule: Check for comments above function definitions
          if (
            line.startsWith("//") &&
            i + 1 < lines.length &&
            lines[i + 1].trim().startsWith("function")
          ) {
            const start = new vscode.Position(i + 1, 0);
            const end = findClosingBracket(lines, i + 2);
            rangesToFold.push(new vscode.Range(start, end));
          }

          // Example rule: Check for function definitions
          if (line.startsWith("function")) {
            const start = new vscode.Position(i, 0);
            const end = findClosingBracket(lines, i + 1);
            rangesToFold.push(new vscode.Range(start, end));
          }

          // Example rule: Check for html comments
          if (line.startsWith("<!--")) {
            const start = new vscode.Position(i, 0);
            const end = new vscode.Position(i + 1, 0);
            rangesToFold.push(new vscode.Range(start, end));
          }
        }

        editor.setDecorations(
          vscode.window.createTextEditorDecorationType({
            isWholeLine: true,
            backgroundColor: "rgba(0, 255, 0, 0.3)", // Example decoration
          }),
          rangesToFold
        );

        vscode.commands.executeCommand("editor.fold", rangesToFold);
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function findClosingBracket(
  lines: string[],
  startIndex: number
): vscode.Position {
  for (let j = startIndex; j < lines.length; j++) {
    if (lines[j].trim().startsWith("}")) {
      return new vscode.Position(j, lines[j].length);
    }
  }
  return new vscode.Position(startIndex, 0);
}

// This method is called when your extension is deactivated
export function deactivate() {}
