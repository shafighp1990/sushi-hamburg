const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const failures = [];
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
    );
}
for (const file of walk(path.join(root, "components")).filter(
  (f) =>
    f.endsWith(".tsx") &&
    !f.includes(path.sep + "primitives" + path.sep) &&
    !f.includes(path.sep + "ui" + path.sep) &&
    !f.endsWith(".stories.tsx"),
)) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source);
      if (
        [
          "button",
          "input",
          "textarea",
          "select",
          "label",
          "p",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
        ].includes(tag)
      )
        failures.push(
          path.relative(root, file) + ": use the shared " + tag + " primitive",
        );
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
for (const entry of fs
  .readdirSync(path.join(root, "components/primitives"), {
    withFileTypes: true,
  })
  .filter((e) => e.isDirectory())) {
  for (const suffix of [".tsx", ".types.ts", ".stories.tsx"])
    if (
      !fs.existsSync(
        path.join(
          root,
          "components/primitives",
          entry.name,
          entry.name + suffix,
        ),
      )
    )
      failures.push(entry.name + suffix + " is missing");
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else console.log("Component architecture checks passed.");
