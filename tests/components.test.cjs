const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const root = path.resolve(__dirname, "..");
const cache = new Map();
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file);
  const m = { exports: {} };
  cache.set(file, m.exports);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const localRequire = (name) => {
    if (!name.startsWith(".") && !name.startsWith("@/")) return require(name);
    const candidate = name.startsWith("@/")
      ? path.join(root, name.slice(2))
      : path.resolve(path.dirname(file), name);
    if (candidate.endsWith(".json")) return JSON.parse(fs.readFileSync(candidate, "utf8"));
    const resolved = [
      candidate + ".tsx",
      candidate + ".ts",
      path.join(candidate, "index.ts"),
    ].find(fs.existsSync);
    if (!resolved) throw new Error("Missing component import: " + name);
    return load(resolved);
  };
  vm.runInThisContext("(function(require,module,exports){" + code + "\n})", {
    filename: file,
  })(localRequire, m, m.exports);
  cache.set(file, m.exports);
  return m.exports;
}
const component = (name) =>
  load("components/primitives/" + name + "/" + name + ".tsx")[name];
const render = (name, props) =>
  renderToStaticMarkup(React.createElement(component(name), props));
void test("busy action is disabled and announces activity; ordinary native form buttons retain browser submit behavior", () => {
  const busy = render("Button", { busy: true, children: "Save" });
  assert.match(busy, /disabled=""/);
  assert.match(busy, /aria-busy="true"/);
  const ordinary = render("Button", { children: "Submit" });
  assert.doesNotMatch(ordinary, /disabled|aria-busy/);
  assert.doesNotMatch(ordinary, /type="button"/);
});
void test("field error is associated with input while preserving caller descriptions and native validation", () => {
  const html = render("TextField", {
    id: "email",
    name: "email",
    label: "Email",
    required: true,
    type: "email",
    error: "Invalid email",
    helperText: "Hidden helper",
    "aria-describedby": "policy",
  });
  assert.match(html, /<label for="email">Email<\/label>/);
  assert.match(html, /aria-describedby="policy email-error"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /id="email-error"/);
  assert.match(html, /role="alert"/);
  assert.doesNotMatch(html, /Hidden helper/);
  assert.match(html, /required=""/);
});
void test("blank errors show helper text without marking a field invalid", () => {
  const html = render("TextField", {
    id: "name",
    label: "Name",
    error: "  ",
    helperText: "Public name",
  });
  assert.match(html, /Public name/);
  assert.doesNotMatch(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby="name-hint"/);
});
void test("text and headings preserve semantic tags and escape user content", () => {
  assert.equal(
    render("Text", { as: "span", children: "<script>alert(1)</script>" }),
    "<span>&lt;script&gt;alert(1)&lt;/script&gt;</span>",
  );
  assert.equal(
    render("Heading", { as: "h1", children: "Title" }),
    "<h1>Title</h1>",
  );
});
void test("textarea retains form fields, disabled state, limits, direction and initial content", () => {
  const html = render("Textarea", {
    name: "message",
    rows: 4,
    maxLength: 280,
    disabled: true,
    dir: "rtl",
    defaultValue: "سلام",
  });
  assert.match(html, /name="message"/);
  assert.match(html, /rows="4"/);
  assert.match(html, /maxLength="280"/i);
  assert.match(html, /disabled=""/);
  assert.match(html, /dir="rtl"/);
  assert.match(html, />سلام<\/textarea>/);
});
void test("messages and toasts distinguish urgent errors from polite success and hide absent messages", () => {
  assert.match(
    render("FieldMessage", { tone: "error", children: "Failed" }),
    /role="alert"/,
  );
  assert.match(
    render("Toast", { tone: "success", children: "Saved" }),
    /role="status"/,
  );
  assert.equal(render("FieldMessage", { children: "" }), "");
});
void test("server-rendered shop pages start in the request language", () => {
  const { ShopProvider, useShop } = load("components/shop-context/shop-context.tsx");
  function LocaleProbe() {
    const { lang } = useShop();
    return React.createElement("div", { lang }, lang);
  }
  for (const language of ["de", "en", "fa", "uk"]) {
    const html = renderToStaticMarkup(React.createElement(ShopProvider, { initialLanguage: language }, React.createElement(LocaleProbe)));
    assert.equal(html, `<div lang="${language}">${language}</div>`);
  }
});
