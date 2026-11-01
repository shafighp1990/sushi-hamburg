const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm'),
  ts = require('typescript'),
  { DatabaseSync } = require('node:sqlite');
const cache = new Map();
function load(file) {
  file = path.resolve(__dirname, '..', file);
  if (cache.has(file)) return cache.get(file);
  const m = { exports: {} };
  cache.set(file, m.exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', {
    filename: file,
  })(
    (p) =>
      !p.startsWith('.') && !p.startsWith('/')
        ? require(p)
        : p.endsWith('.json')
          ? JSON.parse(fs.readFileSync(path.resolve(path.dirname(file), p)))
          : load(path.resolve(path.dirname(file), p + '.ts')),
    m,
    m.exports,
  );
  cache.set(file, m.exports);
  return m.exports;
}
function database() {
  const sql = new DatabaseSync(':memory:');
  for (const file of fs
    .readdirSync(path.resolve(__dirname, '../drizzle'))
    .filter((f) => f.endsWith('.sql'))
    .sort())
    sql.exec(
      fs.readFileSync(path.resolve(__dirname, '../drizzle', file), 'utf8'),
    );
  return {
    sql,
    prepare(query) {
      const statement = sql.prepare(query);
      let args = [];
      return {
        bind(...values) {
          args = values;
          return this;
        },
        async first() {
          return statement.get(...args) || null;
        },
        async run() {
          return statement.run(...args);
        },
        async all() {
          return { results: statement.all(...args) };
        },
      };
    },
    async batch(statements) {
      sql.exec('BEGIN');
      try {
        const result = await Promise.all(statements.map((s) => s.run()));
        sql.exec('COMMIT');
        return result;
      } catch (e) {
        sql.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
module.exports = { load, database };
