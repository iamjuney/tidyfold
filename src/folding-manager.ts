import * as vscode from "vscode";
import { SvelteFoldingRangeProvider } from "./extension";

export class FoldingManager implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private foldingProviders: vscode.Disposable[] = [];
  private debugChannel: vscode.OutputChannel;
  private showDebugLogs: boolean = false;

  constructor(debugChannel: vscode.OutputChannel) {
    this.debugChannel = debugChannel;

    // Get initial debug log setting
    this.updateDebugSetting();

    // Register event handlers
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument(this.handleDocumentOpen, this),
      vscode.workspace.onDidChangeConfiguration(this.handleConfigChange, this)
    );

    // Process any already open documents
    vscode.workspace.textDocuments.forEach(this.handleDocumentOpen, this);
  }

  private updateDebugSetting() {
    const config = vscode.workspace.getConfiguration("tidyfold");
    this.showDebugLogs = config.get("showDebugLogs", false);
    this.log(`Debug logging is ${this.showDebugLogs ? "enabled" : "disabled"}`);
  }

  private log(message: string) {
    if (this.showDebugLogs) {
      this.debugChannel.appendLine(
        `[${new Date().toLocaleTimeString()}] ${message}`
      );
    }
  }

  private handleConfigChange(event: vscode.ConfigurationChangeEvent) {
    if (event.affectsConfiguration("tidyfold")) {
      this.log("Configuration changed, updating settings");
      this.updateDebugSetting();

      // Re-register providers in case configuration affects them
      this.disposeProviders();
      vscode.workspace.textDocuments.forEach(this.handleDocumentOpen, this);
    }
  }

  private handleDocumentOpen(document: vscode.TextDocument) {
    // Check if the document is a Svelte file
    if (document.languageId === "svelte") {
      this.log(`Processing Svelte file: ${document.fileName}`);
      this.registerFoldingProvider();
    }
  }

  private registerFoldingProvider() {
    const config = vscode.workspace.getConfiguration("tidyfold");
    const enabled = config.get("enableCustomFolding", true);

    if (enabled) {
      this.log("Registering custom folding provider");
      // Register our custom provider
      const provider = new SvelteFoldingRangeProvider(this.debugChannel);
      const svelteSelector = { language: "svelte", scheme: "*" };

      this.foldingProviders.push(
        vscode.languages.registerFoldingRangeProvider(svelteSelector, provider)
      );
    } else {
      this.log("Custom folding is disabled in settings");
    }
  }

  private disposeProviders() {
    this.log("Disposing existing folding providers");
    this.foldingProviders.forEach((d) => d.dispose());
    this.foldingProviders = [];
  }

  dispose() {
    this.log("Disposing FoldingManager");
    this.disposeProviders();
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
