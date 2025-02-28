"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
const vscode = __importStar(require("vscode"));
const TidyFold = __importStar(require("../extension"));
suite("Extension Test Suite", () => {
    vscode.window.showInformationMessage("Start all tests.");
    test("Test activation of extension", () => {
        const context = {
            subscriptions: [],
        };
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
//# sourceMappingURL=extension.test.js.map