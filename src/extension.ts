import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
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

  // Register folding range provider for better integration
  const svelteFoldingProvider = vscode.languages.registerFoldingRangeProvider(
    [
      { language: "svelte" },
      { language: "javascript" },
      { language: "typescript" },
    ],
    new SvelteFoldingRangeProvider()
  );

  context.subscriptions.push(disposable, svelteFoldingProvider);
}

export class SvelteFoldingRangeProvider implements vscode.FoldingRangeProvider {
  provideFoldingRanges(
    document: vscode.TextDocument,
    context: vscode.FoldingContext,
    token: vscode.CancellationToken
  ): vscode.FoldingRange[] {
    const result: vscode.FoldingRange[] = [];
    const lines = document.getText().split("\n");

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

    const htmlFoldables = [
      "<form",
      "<navbar",
      "<footer",
      "<section",

      // Svelte-specific elements
      "<style",

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
    };

    let braceBalance = 0;
    let blockStart = -1;

    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip comment lines
      if (line.startsWith("//") || line.startsWith("<!--")) {
        continue;
      }

      // Check for Svelte runes
      if (isSvelteRune(line)) {
        // For runes, find the end by matching braces
        const startLine = i;
        braceBalance =
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
          blockStart = i;

          // Find the end of the block
          braceBalance =
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

      // Check for HTML/Svelte blocks
      for (const prefix of htmlFoldables) {
        if (line.startsWith(prefix)) {
          // For HTML/Svelte blocks, look for matching end tag
          if (endMarkers[prefix]) {
            blockStack.push({ startLine: i, type: prefix });
          }
          break;
        }
      }

      // Check if this line closes any open block
      for (const [prefix, endPattern] of Object.entries(endMarkers)) {
        if (endPattern.test(line) && blockStack.length > 0) {
          // Find the matching opening tag
          for (let j = blockStack.length - 1; j >= 0; j--) {
            if (blockStack[j].type === prefix) {
              result.push(new vscode.FoldingRange(blockStack[j].startLine, i));
              blockStack.splice(j, 1);
              break;
            }
          }
        }
      }
    }

    return result;
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
