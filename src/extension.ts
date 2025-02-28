import * as vscode from "vscode";
import { DecorationProvider } from "./decoration-provider";
import { FoldingManager } from "./folding-manager";
import { registerUnfoldCommand } from "./unfold-command";

export function activate(context: vscode.ExtensionContext) {
  console.log("TidyFold extension activated");

  // Create a debug output channel in the activation function
  const debugChannel = vscode.window.createOutputChannel("TidyFold Debug");
  context.subscriptions.push(debugChannel);

  // Create the decoration provider for highlighting foldable blocks
  const decorationProvider = new DecorationProvider(debugChannel);
  context.subscriptions.push(decorationProvider);

  // Register the manual command with improved implementation
  const disposable = vscode.commands.registerCommand(
    "tidyfold.minimizeExpandedRegions",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        // Use VS Code's built-in folding commands to fold all regions
        await vscode.commands.executeCommand("editor.foldAll");
        await vscode.commands.executeCommand("cursorTop");
      }
    }
  );

  // Register the unfold command from a separate file
  const unfoldCommand = registerUnfoldCommand(context);

  // Create and register our folding manager
  const foldingManager = new FoldingManager(debugChannel);
  context.subscriptions.push(foldingManager);

  // Register a debug command to show what would be folded
  const debugCommand = vscode.commands.registerCommand(
    "tidyfold.debugFolding",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const document = editor.document;
        // Pass the debug channel to the provider constructor
        const provider = new SvelteFoldingRangeProvider(debugChannel);
        const ranges = provider.provideFoldingRanges(
          document,
          {} as vscode.FoldingContext,
          {} as vscode.CancellationToken
        );

        // Get the actual lines that would be folded
        const foldedLines = ranges.map((range) => {
          const startLine = document.lineAt(range.start).text.trim();
          const endLine = document.lineAt(range.end).text.trim();
          return `Lines ${range.start}-${range.end}: "${startLine}" to "${endLine}"`;
        });

        vscode.window.showInformationMessage(
          `Found ${ranges.length} folding regions`
        );

        // Use the existing debug channel instead of creating a new one
        debugChannel.clear();
        debugChannel.appendLine(
          `TidyFold would fold ${ranges.length} regions in this file:`
        );
        foldedLines.forEach((line) => debugChannel.appendLine(line));
        debugChannel.show();
      }
    }
  );

  // Add command to show debug logs
  const showLogsCommand = vscode.commands.registerCommand(
    "tidyfold.showLogs",
    () => {
      debugChannel.show(true); // true brings the channel into focus
    }
  );

  // Add command to toggle highlighting of foldable blocks
  const toggleHighlightCommand = vscode.commands.registerCommand(
    "tidyfold.toggleHighlightBlocks",
    () => {
      decorationProvider.toggleHighlighting();
    }
  );

  // Add command to refresh highlights
  const refreshHighlightCommand = vscode.commands.registerCommand(
    "tidyfold.refreshHighlights",
    () => {
      decorationProvider.updateDecorations();
    }
  );

  // Add commands to subscriptions
  context.subscriptions.push(
    disposable,
    debugCommand,
    showLogsCommand,
    toggleHighlightCommand,
    refreshHighlightCommand
  );

  // Initial update of decorations if enabled
  decorationProvider.updateDecorations();
}

export class SvelteFoldingRangeProvider implements vscode.FoldingRangeProvider {
  private debugChannel: vscode.OutputChannel;

  constructor(debugChannel: vscode.OutputChannel) {
    this.debugChannel = debugChannel;
  }

  provideFoldingRanges(
    document: vscode.TextDocument,
    _context: vscode.FoldingContext,
    _token: vscode.CancellationToken
  ): vscode.FoldingRange[] {
    // Check if our custom folding is enabled
    const config = vscode.workspace.getConfiguration("tidyfold");
    const customFoldingEnabled = config.get("enableCustomFolding", true);

    // New configuration option to control parent block folding
    const foldParentBlocks = config.get("foldParentBlocks", false);

    if (!customFoldingEnabled) {
      this.debugChannel.appendLine(
        "Custom folding disabled - returning empty ranges"
      );
      return [];
    }

    const result: vscode.FoldingRange[] = [];
    const lines = document.getText().split("\n");

    // Get excluded elements from configuration
    const excludedElementsFromConfig = config.get<string[]>(
      "excludedFoldingElements",
      []
    );

    // Add the < prefix to each element for matching
    const excludedElements = excludedElementsFromConfig.map((e) => `<${e}`);

    // Always exclude div and script tags unless explicitly enabled via foldParentBlocks
    if (!foldParentBlocks) {
      if (!excludedElements.includes("<div")) {
        excludedElements.push("<div");
      }
      if (!excludedElements.includes("<script")) {
        excludedElements.push("<script");
      }
    }

    this.debugChannel.appendLine(
      `------- Analyzing document: ${document.fileName} -------`
    );
    this.debugChannel.appendLine(`Total lines: ${lines.length}`);
    this.debugChannel.appendLine(
      `Excluded elements: ${excludedElements.join(", ")}`
    );
    this.debugChannel.appendLine(
      `Fold parent blocks (div/script): ${foldParentBlocks}`
    );

    // Patterns to match
    const jsFoldables = [
      // Original entries
      "function",
      "class",
      "const",
      "import",
      "onMount",
      "type",
      "export",
      "for",
      "if",

      // Svelte 5 runes
      "$state",
      "$effect",
      "$derived",
      "$props",
      "$bindable",
      "$inspect",
      "$host",
    ];

    // Only include specific HTML elements we want to fold
    const htmlFoldables = [
      // Structural HTML elements we want to fold
      "<form",
      "<navbar",
      "<footer",
      "<section",
      "<header",
      "<article",
      "<aside",
      "<main",

      // Svelte template syntax
      "{#snippet",
      "{#if",
      "{#each",
      "{#key",
      "{#await",
      "{@render",
      "{@html",
      "{@const",
      "{@debug",
    ];

    // Add div and script to htmlFoldables only if foldParentBlocks is true
    if (foldParentBlocks) {
      htmlFoldables.push("<div", "<script");
      this.debugChannel.appendLine("Parent blocks (div/script) will be folded");
    }

    // Log the patterns we're using
    this.debugChannel.appendLine(`JS patterns: ${jsFoldables.join(", ")}`);
    this.debugChannel.appendLine(`HTML patterns: ${htmlFoldables.join(", ")}`);

    // Stack to keep track of open blocks
    const blockStack: { startLine: number; type: string }[] = [];
    const endMarkers: Record<string, RegExp> = {
      "{#if": /{\/(if)}/i,
      "{#each": /{\/(each)}/i,
      "{#await": /{\/(await)}/i,
      "{#key": /{\/(key)}/i,
      "{#snippet": /{\/(snippet)}/i,
      "<style": /<\/style>/i,
      "<form": /<\/form>/i,
      "<navbar": /<\/navbar>/i,
      "<footer": /<\/footer>/i,
      "<section": /<\/section>/i,
      "<header": /<\/header>/i,
      "<article": /<\/article>/i,
      "<aside": /<\/aside>/i,
      "<main": /<\/main>/i,
    };

    // Add div and script to endMarkers only if foldParentBlocks is true
    if (foldParentBlocks) {
      endMarkers["<div"] = /<\/div>/i;
      endMarkers["<script"] = /<\/script>/i;
    }

    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Debug every 20th line to avoid excessive output
      if (i % 20 === 0 || line.includes("<div") || line.includes("<script")) {
        this.debugChannel.appendLine(
          `Line ${i}: ${line.substring(0, 50)}${line.length > 50 ? "..." : ""}`
        );
      }

      // Skip comment lines
      if (line.startsWith("//") || line.startsWith("<!--")) {
        if (line.includes("<div") || line.includes("<script")) {
          this.debugChannel.appendLine(`  Skipping as comment: ${line}`);
        }
        continue;
      }

      // Check if this line contains any excluded elements before any other processing
      if (this.isExcludedElement(line, excludedElements)) {
        this.debugChannel.appendLine(`  EXCLUDED: Line ${i}: ${line}`);
        continue;
      }

      // Check for Svelte runes
      if (isSvelteRune(line)) {
        // For runes, find the end by matching braces
        const startLine = i;
        let braceBalance =
          countOccurrences(line, "(") - countOccurrences(line, ")");

        if (braceBalance > 0) {
          // If there are unmatched opening braces, look for closing line
          let j = i + 1;
          while (j < lines.length && braceBalance > 0) {
            const nextLine = lines[j].trim();
            braceBalance += countOccurrences(nextLine, "(");
            braceBalance -= countOccurrences(nextLine, ")");
            j++;
          }

          if (braceBalance === 0) {
            // We found matching braces - create a folding range
            result.push(new vscode.FoldingRange(startLine, j - 1));
          }
        }
      }

      // Check for JS/TS blocks
      for (const prefix of jsFoldables) {
        if (
          line.startsWith(prefix) &&
          !(prefix === "const" && line.includes("="))
        ) {
          this.debugChannel.appendLine(
            `  Found JS block at line ${i}: ${prefix}`
          );
          const blockStart = i;

          // Find the end of the block
          let braceBalance =
            countOccurrences(line, "{") - countOccurrences(line, "}");

          if (braceBalance > 0) {
            let j = i + 1;
            while (j < lines.length && braceBalance > 0) {
              const nextLine = lines[j].trim();
              braceBalance += countOccurrences(nextLine, "{");
              braceBalance -= countOccurrences(nextLine, "}");
              j++;
            }

            if (braceBalance === 0) {
              result.push(new vscode.FoldingRange(blockStart, j - 1));
            }
          }
          break;
        }
      }

      // Check for HTML/Svelte blocks with improved handling
      for (const prefix of htmlFoldables) {
        // More specific check: ensure it's an opening tag not just a substring match
        if (
          line.startsWith(prefix) &&
          (line[prefix.length] === " " ||
            line[prefix.length] === ">" ||
            line[prefix.length] === "/" ||
            line[prefix.length] === "s")
        ) {
          // Double-check for excluded elements again
          if (this.isExcludedElement(line, excludedElements)) {
            this.debugChannel.appendLine(
              `  EXCLUDED at HTML check: Line ${i}: ${line}`
            );
            continue;
          }

          this.debugChannel.appendLine(
            `  Found HTML/Svelte block at line ${i}: ${prefix}`
          );

          // For HTML/Svelte blocks, look for matching end tag
          if (endMarkers[prefix]) {
            blockStack.push({ startLine: i, type: prefix });
            this.debugChannel.appendLine(
              `  Added to block stack: ${prefix}, stack size: ${blockStack.length}`
            );
          }
          break;
        }
      }

      // Check if this line closes any open block
      for (const [prefix, endPattern] of Object.entries(endMarkers)) {
        if (endPattern.test(line) && blockStack.length > 0) {
          this.debugChannel.appendLine(
            `  Found closing pattern for: ${prefix}`
          );

          // Find the matching opening tag
          for (let j = blockStack.length - 1; j >= 0; j--) {
            if (blockStack[j].type === prefix) {
              this.debugChannel.appendLine(
                `  Creating fold: ${blockStack[j].startLine}-${i}`
              );
              result.push(new vscode.FoldingRange(blockStack[j].startLine, i));
              blockStack.splice(j, 1);
              break;
            }
          }
        }
      }
    }

    this.debugChannel.appendLine(`Found ${result.length} folding regions`);
    return result;
  }

  // Use configuration-provided excluded elements list
  private isExcludedElement(line: string, excludedElements: string[]): boolean {
    for (const element of excludedElements) {
      // Try different patterns for matching elements
      if (
        line === element || // Exact match: "<div"
        line.startsWith(element + " ") || // With attributes: "<div class="..."
        line.startsWith(element + ">") || // No space: "<div>"
        line.startsWith(element + "/") || // Self-closing: "<div/"
        line.startsWith(element + "s") || // Plural form: "<divs"
        line.indexOf(element + " ") !== -1 || // Element appears in the middle of line
        line.indexOf(element + ">") !== -1 // Element with closing bracket appears in middle
      ) {
        if (element === "<div" || element === "<script") {
          this.debugChannel.appendLine(
            `  Excluded parent block "${element}" in: ${line}`
          );
        }
        return true;
      }
    }

    // For script tags specifically, try a more thorough check
    if (line.includes("<script") && !line.includes("</script")) {
      this.debugChannel.appendLine(
        `  Found script tag with alternate pattern: ${line}`
      );
      return true;
    }

    return false;
  }
}

// Helper function to detect Svelte runes
function isSvelteRune(line: string): boolean {
  const runePatterns = [
    /\$state\(/,
    /\$effect\(/,
    /\$derived\(/,
    /\$props\(/,
    /\$bindable\(/,
    /\$inspect\(/,
    /\$host\(/,
  ];

  return runePatterns.some((pattern) => pattern.test(line));
}

// Helper function to count occurrences of a character in a string
function countOccurrences(text: string, char: string): number {
  return (text.match(new RegExp("\\" + char, "g")) || []).length;
}

export function deactivate() {}
