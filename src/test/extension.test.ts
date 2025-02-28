import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { ExtensionContext } from "vscode";
import * as TidyFold from "../extension";

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

    // Verify that we have two subscriptions (command and folding provider)
    assert.strictEqual(context.subscriptions.length, 2);
  });

  test("Test command registration", () => {
    return vscode.commands.getCommands(true).then((commands) => {
      assert.ok(commands.includes("tidyfold.minimizeExpandedRegions"));
    });
  });

  test("Test command execution", async () => {
    // This is a simple smoke test that the command executes without error
    await vscode.commands.executeCommand("tidyfold.minimizeExpandedRegions");
    // If no error is thrown, the test passes
    assert.ok(true);
  });
});
