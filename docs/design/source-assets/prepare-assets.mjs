/**
 * Extract editable SVG artwork from StaySpot's existing React implementation.
 * Run from the repository root after npm ci. This does not modify app components.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const project = path.resolve(".");
const require = createRequire(path.join(project, "package.json"));
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const icons = require("lucide-react");
const esbuild = require("esbuild");
const output = path.join(project, "docs/design/source-assets");
const temporaryModule = path.join(output, "house-render.mjs");

// JSX needs a temporary Node-compatible module before server-side rendering.
await esbuild.build({
  entryPoints: [
    path.join(project, "members/member1/web/components/HouseArt.jsx"),
  ],
  outfile: temporaryModule,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
});

try {
  const { HouseArt } = await import(pathToFileURL(temporaryModule));
  const assets = { icons: {}, house: [] };
  const names = [
    "Home", "LayoutGrid", "CalendarPlus", "ReceiptText",
    "ChartNoAxesCombined", "MapPin", "Star", "ArrowUpRight", "ArrowRight",
    "Search", "ChevronDown", "ChevronLeft", "ChevronRight", "Check", "X",
    "RefreshCw", "Wallet", "Leaf", "Plus", "CircleCheck", "Clock3",
  ];

  // Lucide's source paths remain vectors in SVG and Excalidraw exports.
  for (const name of names) {
    assets.icons[name] = renderToStaticMarkup(
      React.createElement(icons[name], { size: 24, color: "#244c38" }),
    );
  }

  // Preserve all four palettes used by the existing HouseArt component.
  for (let variant = 0; variant < 4; variant += 1) {
    let vector = renderToStaticMarkup(
      React.createElement(HouseArt, { variant }),
    );
    vector = vector.replace(
      "<svg ",
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="210" ',
    );
    assets.house.push(vector);
  }

  await fs.writeFile(
    path.join(output, "source-assets.json"),
    JSON.stringify(assets, null, 2),
  );
  console.log("Extracted 21 source icons and four HouseArt palettes.");
} finally {
  // Clean up only the temporary module created by this extractor.
  await fs.unlink(temporaryModule);
}
