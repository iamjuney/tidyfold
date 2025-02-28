import * as assert from "assert";
import * as vscode from "vscode";
import { SvelteFoldingRangeProvider } from "../extension";

suite("SvelteFoldingRangeProvider Test Suite", () => {
  let provider: SvelteFoldingRangeProvider;

  setup(() => {
    provider = new SvelteFoldingRangeProvider();
  });

  test("Provides folding ranges for JS function blocks", () => {
    const document = createMockDocument(`
function test() {
  const x = 1;
  const y = 2;
  return x + y;
}
    `);

    const ranges = provider.provideFoldingRanges(
      document,
      {} as vscode.FoldingContext,
      {} as vscode.CancellationToken
    );

    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].start, 1);
    assert.strictEqual(ranges[0].end, 5);
  });

  test("Provides folding ranges for Svelte runes", () => {
    const document = createMockDocument(`
const Component = () => {
  $effect(() => {
    console.log('Side effect runs');
    console.log('Another log');
  });
  
  $state(() => {
    let count = 0;
  });
}
    `);

    const ranges = provider.provideFoldingRanges(
      document,
      {} as vscode.FoldingContext,
      {} as vscode.CancellationToken
    );

    // Should find two ranges: one for $effect and one for $state
    assert.strictEqual(ranges.length, 2);
  });

  test("Provides folding ranges for Svelte template constructs", () => {
    const document = createMockDocument(`
<div>
  {#if condition}
    <p>Conditional content</p>
  {/if}
  
  {#each items as item}
    <li>{item}</li>
  {/each}
</div>
    `);

    const ranges = provider.provideFoldingRanges(
      document,
      {} as vscode.FoldingContext,
      {} as vscode.CancellationToken
    );

    // Should find two ranges: one for #if block and one for #each block
    assert.strictEqual(ranges.length, 2);
  });

  test("Provides folding ranges for HTML elements", () => {
    const document = createMockDocument(`
<section>
  <h1>Title</h1>
  <p>Content</p>
</section>

<footer>
  <p>Footer content</p>
</footer>
    `);

    const ranges = provider.provideFoldingRanges(
      document,
      {} as vscode.FoldingContext,
      {} as vscode.CancellationToken
    );

    // Should find two ranges: one for section and one for footer
    assert.strictEqual(ranges.length, 2);
  });

  test("Skips comments", () => {
    const document = createMockDocument(`
// This is a comment
function test() {
  // Another comment
  const x = 1;
}
<!-- HTML comment -->
<section>
  Content
</section>
    `);

    const ranges = provider.provideFoldingRanges(
      document,
      {} as vscode.FoldingContext,
      {} as vscode.CancellationToken
    );

    // Should find two ranges: one for function and one for section
    assert.strictEqual(ranges.length, 2);
  });

  // Helper function to create a mock TextDocument
  function createMockDocument(content: string): vscode.TextDocument {
    return {
      getText: () => content,
      // Mock other necessary TextDocument properties/methods
      lineAt: (line: number) => {
        const lines = content.split("\n");
        return {
          text: lines[line],
          isEmptyOrWhitespace: lines[line].trim().length === 0,
        };
      },
      lineCount: content.split("\n").length,
    } as any;
  }
});
