// web/build.js
import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["web/component.tsx"],
  outfile: "web/dist/dailycard.js",
  platform: "browser",
  format: "esm",
  bundle: true,
  minify: true,
  sourcemap: false
});