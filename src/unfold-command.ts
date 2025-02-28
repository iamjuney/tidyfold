import * as vscode from "vscode";

// A simple standalone command to test registration
export function registerUnfoldCommand(context: vscode.ExtensionContext) {
  console.log("Registering unfold command");

  const unfoldCommand = vscode.commands.registerCommand(
    "tidyfold.unfoldEverything",
    async () => {
      console.log("Executing unfoldEverything command");
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await vscode.commands.executeCommand("editor.unfoldAll");
        vscode.window.showInformationMessage("All regions unfolded");
      } else {
        vscode.window.showWarningMessage("No active editor found");
      }
    }
  );

  context.subscriptions.push(unfoldCommand);
  return unfoldCommand;
}
