import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "tidyfold.minimizeExpandedRegions",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const document = editor.document;
        const lines = document.getText().split("\n");
        const linesToFold = getFoldableLines(lines);

        for (const line of linesToFold) {
          editor.selections = [new vscode.Selection(line, 0, line, 0)];
          await vscode.commands.executeCommand("editor.fold");
        }

        await vscode.commands.executeCommand("cursorTop");
      }
    }
  );

  context.subscriptions.push(disposable);
}

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

  lines.forEach((line, i) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith("//") || trimmedLine.startsWith("<!--")) {
      const nextLine = lines[i + 1]?.trim();
      if (
        nextLine &&
        [...jsFoldables, ...htmlFoldables].some((foldable) =>
          nextLine.startsWith(foldable)
        )
      ) {
        foldableLines.push(i + 1);
      }
    }
  });

  return foldableLines;
}

export function deactivate() {}
