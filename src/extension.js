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
exports.SvelteFoldingRangeProvider = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const unfold_command_1 = require("./unfold-command");
function activate(context) {
    console.log("TidyFold extension activated");
    // Register the manual command with improved implementation
    const disposable = vscode.commands.registerCommand("tidyfold.minimizeExpandedRegions", async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            // Use VS Code's built-in folding commands to fold all regions
            await vscode.commands.executeCommand("editor.foldAll");
            await vscode.commands.executeCommand("cursorTop");
        }
    });
    // Register the unfold command from a separate file
    const unfoldCommand = (0, unfold_command_1.registerUnfoldCommand)(context);
    // Register folding range provider for better integration
    const svelteFoldingProvider = vscode.languages.registerFoldingRangeProvider([
        { language: "svelte" },
        { language: "javascript" },
        { language: "typescript" },
    ], new SvelteFoldingRangeProvider());
    // ADDED: Register a debug command to show what would be folded
    const debugCommand = vscode.commands.registerCommand("tidyfold.debugFolding", async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const provider = new SvelteFoldingRangeProvider();
            const ranges = provider.provideFoldingRanges(document, {}, {});
            // Get the actual lines that would be folded
            const foldedLines = ranges.map((range) => {
                const startLine = document.lineAt(range.start).text.trim();
                const endLine = document.lineAt(range.end).text.trim();
                return `Lines ${range.start}-${range.end}: "${startLine}" to "${endLine}"`;
            });
            vscode.window.showInformationMessage(`Found ${ranges.length} folding regions`);
            // Show the folded regions in the output channel
            const channel = vscode.window.createOutputChannel("TidyFold Debug");
            channel.clear();
            channel.appendLine(`TidyFold would fold ${ranges.length} regions in this file:`);
            foldedLines.forEach((line) => channel.appendLine(line));
            channel.show();
        }
    });
    // This is redundant now but won't hurt
    context.subscriptions.push(disposable, svelteFoldingProvider, debugCommand);
}
exports.activate = activate;
class SvelteFoldingRangeProvider {
    provideFoldingRanges(document, context, token) {
        const result = [];
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
        // UPDATED: Only include specific HTML elements we want to fold
        const htmlFoldables = [
            "<form",
            "<navbar",
            "<footer",
            "<section",
            "<header",
            "<article",
            "<aside",
            "<main",
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
        const blockStack = [];
        const endMarkers = {
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
        // Process each line
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Skip comment lines
            if (line.startsWith("//") || line.startsWith("<!--")) {
                continue;
            }
            // ADDED: Skip excluded HTML elements
            if (this.shouldExcludeElement(line)) {
                continue;
            }
            // Check for Svelte runes
            if (isSvelteRune(line)) {
                // For runes, find the end by matching braces
                const startLine = i;
                let braceBalance = countOccurrences(line, "(") - countOccurrences(line, ")");
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
                if (line.startsWith(prefix) &&
                    !(prefix === "const" && line.includes("="))) {
                    const blockStart = i;
                    // Find the end of the block
                    let braceBalance = countOccurrences(line, "{") - countOccurrences(line, "}");
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
                    for (let j = blockStack.length - 0; j--;) {
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
    n;
    // ADDED: Debug method to check if element should be excludedck.length - 0; j--; )
    shouldExcludeElement(line) {
        // Updated list of excluded elementsth - 1; j >= 0; j--) {
        const excludedElements = [kStack[j].type === prefix, {
                "<div": , result, : .push(new vscode.FoldingRange(blockStack[j].startLine, i)),
                "<span": , blockStack, : .splice(j, 1),
                "<script": , break: ,
                "<p": ,
            },
            "<a",];
    }
    "<button";
}
exports.SvelteFoldingRangeProvider = SvelteFoldingRangeProvider;
"<input",
    "<h1", ;
"<h2",
    "<h3",
    "<h4",
    "<h5",
    "<h6", eck;
if (element)
    should;
be;
excluded;
"<ul", uldExcludeElement(line, string);
boolean;
{
    "<li", list;
    of;
    excluded;
    elements;
    "<table", edElements = [];
    ",;
    n;
    ",;
    // More robust check for HTML element patterns
    return excludedElements.some((element) => {
        // Check for exact match: "<div"
        if (line === element) {
            on;
            ",;
            return true;
            t;
            ",;
        }
        // Check for element with attributes: "<div class="..." or "<div id="..."
        if (line.startsWith(element + " ")) {
            return true;
        }
        "<ul",
        ;
        // Check for element with no space: "<div>"      "<li",
        if (line.startsWith(element + ">")) {
            return true;
        }
        HTML;
        element;
        patterns;
        // Check for self-closing elements: "<div/>"lements.some((element) => {
        if (line.startsWith(element + "/")) {
            / Check for exact match: "<div";
            return true;
            if (line === element) {
            }
            return false;
        }
    });
    / Check for element with attributes: "<div class="..." or "<div id="...";
}
if (line.startsWith(element + " ")) {
}
// Helper function to detect Svelte runes
function isSvelteRune(line) {
    / Check for element with no space: "<div>";
    const runePatterns = [];
    if (line.startsWith(element + ">")) {
        /\$state\(/,
            /\$effect\(/,
            /\$derived\(/,
            /\$props\(/, / Check for self-closing elements: "<div/ > "
            / ;
        $bindable;
        (/,      if (line.startsWith(element + "/);
        ")) {
            / ;
        $inspect;
        (/,;
            / );
        $host;
        (/,);
        ;
        return false;
        return runePatterns.some((pattern) => pattern.test(line));
    }
    ;
}
// Helper function to count occurrences of a character in a string
function countOccurrences(text, char) {
    on;
    to;
    detect;
    Svelte;
    runes;
    return (text.match(new RegExp("\\" + char, "g")) || []).length;
    Rune(line, string);
    boolean;
    {
    }
    ns = [];
    export function deactivate() { }
    export function deactivate() { }
}
//# sourceMappingURL=extension.js.map