const { build } = require("esbuild");
const { copy } = require("esbuild-plugin-copy");

const watch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ["./src/extension.ts"],
  bundle: true,
  outfile: "out/extension.js",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  sourcemap: true,
  minify: process.argv.includes("--minify"),
  watch: watch && {
    onRebuild(error) {
      if (error) {
        console.error("esbuild: build failed:", error);
      } else {
        console.log("esbuild: build succeeded");
      }
    },
  },
};

build(options).catch((err) => {
  process.stderr.write(err.stderr);
  process.exit(1);
});

if (watch) {
  console.log("esbuild: watching for changes...");
}
