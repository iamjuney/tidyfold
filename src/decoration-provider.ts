import * as vscode from "vscode";
import { SvelteFoldingRangeProvider } from "./extension";

export class DecorationProvider {
  private decorationType: vscode.TextEditorDecorationType;
  private isHighlightingEnabled: boolean = false;
  private disposables: vscode.Disposable[] = [];
  private debugChannel: vscode.OutputChannel;

  constructor(debugChannel: vscode.OutputChannel) {
    this.debugChannel = debugChannel;

    // Create decoration type with light border around foldable regions
    this.decorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: "rgba(100, 100, 250, 0.1)",
      border: "1px dashed rgba(100, 100, 250, 0.5)",
      isWholeLine: true,
    });

    // Listen for configuration changes
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration(this.handleConfigChange, this),
      vscode.window.onDidChangeActiveTextEditor(this.updateDecorations, this),
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (
          this.isHighlightingEnabled &&
          vscode.window.activeTextEditor &&
          event.document === vscode.window.activeTextEditor.document
        ) {
          this.updateDecorations();
        }
      })
    );

    // Load initial configuration
    this.loadConfiguration();
  }

  private loadConfiguration(): void {
    const config = vscode.workspace.getConfiguration("tidyfold");
    this.isHighlightingEnabled = config.get("highlightFoldableBlocks", false);
    this.log(
      `Highlighting is ${this.isHighlightingEnabled ? "enabled" : "disabled"}`
    );
  }

  private handleConfigChange(event: vscode.ConfigurationChangeEvent): void {
    if (event.affectsConfiguration("tidyfold.highlightFoldableBlocks")) {
      this.loadConfiguration();
      this.updateDecorations();
    }
  }

  public toggleHighlighting(): void {
    this.isHighlightingEnabled = !this.isHighlightingEnabled;

    // Save the setting
    vscode.workspace
      .getConfiguration("tidyfold")
      .update(
        "highlightFoldableBlocks",
        this.isHighlightingEnabled,
        vscode.ConfigurationTarget.Global
      );

    this.log(`Toggled highlighting to: ${this.isHighlightingEnabled}`);

    if (this.isHighlightingEnabled) {
      this.updateDecorations();
      vscode.window.showInformationMessage(
        "TidyFold: Foldable block highlighting enabled"
      );
    } else {
      this.clearDecorations();
      vscode.window.showInformationMessage(
        "TidyFold: Foldable block highlighting disabled"
      );
    }
  }

  public updateDecorations(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !this.isHighlightingEnabled) {
      return;
    }

    const document = editor.document;

    // Only apply to specific file types
    if (
      !["svelte", "html", "javascript", "typescript", "vue"].includes(
        document.languageId
      )
    ) {
      return;
    }

    const provider = new SvelteFoldingRangeProvider(this.debugChannel);
    const ranges = provider.provideFoldingRanges(
      document,
      {} as vscode.FoldingContext,
      {} as vscode.CancellationToken
    );

    const decorations: vscode.DecorationOptions[] = ranges.map((range) => {
      const startPos = new vscode.Position(range.start, 0);
      const endPos = new vscode.Position(
        range.end,
        document.lineAt(range.end).text.length
      );

      return {
        range: new vscode.Range(startPos, endPos),
        hoverMessage: `Foldable region lines ${range.start + 1}-${
          range.end + 1
        }`,
      };
    });

    editor.setDecorations(this.decorationType, decorations);
    this.log(
      `Applied ${decorations.length} decorations in ${document.fileName}`
    );
  }

  public clearDecorations(): void {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      editor.setDecorations(this.decorationType, []);
    }
  }

  private log(message: string): void {
    const config = vscode.workspace.getConfiguration("tidyfold");
    const showDebugLogs = config.get("showDebugLogs", false);

    if (showDebugLogs) {
      this.debugChannel.appendLine(`[DecorationProvider] ${message}`);
    }
  }

  public dispose(): void {
    this.clearDecorations();
    this.decorationType.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
