import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import * as TidyFold from "../extension";
import { ExtensionContext } from "vscode";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Test activation of extension", () => {
    const context = {
      subscriptions: [],
    } as unknown as ExtensionContext;

    TidyFold.activate(context);

    // Check if the disposable command has been registered
    const disposableExists = context.subscriptions.some((sub) => sub.dispose);
    assert.strictEqual(disposableExists, true);
  });

  test("Test findClosingBracket function", () => {
    const lines = ["function test() {", "  // Some code here", "}"];

    const startIndex = 0;
    const closingBracketPosition = TidyFold.findClosingBracket(
      lines,
      startIndex
    );
    const expectedPosition = new vscode.Position(2, lines[2].length);

    assert.deepStrictEqual(closingBracketPosition, expectedPosition);
  });
});
