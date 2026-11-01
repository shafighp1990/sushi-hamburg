// Wrangler Pages requires a standard config filename. Stage the dedicated
// review configuration without replacing the main project's configuration.
import { cp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { validateReviewTarget } from './provision-review.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = join(root, '.wrangler/review-release');
const config = JSON.parse(await readFile(join(root, 'wrangler.review.json'), 'utf8'));
validateReviewTarget(config, 'ea414759-dd33-4cef-9ba7-f32063b8638a');
await mkdir(target, { recursive: true });
// A previous local browser check may have supplied localhost-only bindings.
await rm(join(target, '.dev.vars'), { force: true });
for (const directory of ['functions', 'server', 'lib', 'db']) {
  await rm(join(target, directory), { recursive: true, force: true });
  await cp(join(root, directory), join(target, directory), { recursive: true });
}
for (const file of ['package.json', 'tsconfig.json']) {
  await cp(join(root, file), join(target, file));
}
for (const [name, source] of [['node_modules', '../../node_modules'], ['public', '../../dist/client']]) {
  await rm(join(target, name), { recursive: true, force: true });
  await symlink(source, join(target, name), 'dir');
}
config.pages_build_output_dir = './public';
config.d1_databases[0].migrations_dir = '../../drizzle';
await writeFile(join(target, 'wrangler.json'), JSON.stringify(config, null, 2) + '\n');
console.log('Prepared isolated review deployment in .wrangler/review-release. No deployment or database change was made.');
