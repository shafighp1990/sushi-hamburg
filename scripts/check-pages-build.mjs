import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const essentialRoutes = [
  '/',
  '/menu',
  '/account',
  '/admin',
  '/admin/login',
  '/checkout',
  '/order',
];
const localOrigin = 'https://static-build.invalid';

function isFile(file) {
  return existsSync(file) && statSync(file).isFile();
}

function attributes(tag) {
  const values = new Map();
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))
    values.set(
      match[1].toLowerCase(),
      (match[2] ?? match[3]).replaceAll('&amp;', '&'),
    );
  return values;
}

export function checkPagesBuild(directory = resolve(project, 'dist/client')) {
  const root = resolve(directory);
  const failures = [];
  const assets = new Set();
  const stylesheets = new Set();
  let pages = 0;

  function asset(reference, page, stylesheet = false) {
    if (!reference || /^(?:data:|blob:|#)/i.test(reference)) return;
    let url;
    try {
      url = new URL(reference, localOrigin + page);
    } catch {
      failures.push(`${page}: invalid asset URL ${reference}`);
      return;
    }
    if (url.origin !== localOrigin || url.pathname.startsWith('/api/')) return;
    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(root, '.' + pathname);
    if (!isFile(file))
      failures.push(`${page}: missing linked asset ${pathname}`);
    else {
      assets.add(pathname);
      if (stylesheet) stylesheets.add(pathname);
    }
  }

  for (const route of essentialRoutes) {
    const candidates =
      route === '/'
        ? ['index.html']
        : [route.slice(1) + '.html', route.slice(1) + '/index.html'];
    const file = candidates
      .map((candidate) => resolve(root, candidate))
      .find(isFile);
    if (!file) {
      failures.push(
        `${route}: missing exported HTML (${candidates.join(' or ')})`,
      );
      continue;
    }
    const html = readFileSync(file, 'utf8');
    if (
      !/<!doctype html/i.test(html) ||
      !/<body\b/i.test(html) ||
      /<title>\s*404\s*:/i.test(html)
    )
      failures.push(
        `${route}: exported HTML is empty, incomplete or a 404 page`,
      );
    let scripts = 0;
    let css = 0;
    for (const match of html.matchAll(/<(script|link|img|source)\b[^>]*>/gi)) {
      const tag = match[1].toLowerCase(),
        attrs = attributes(match[0]);
      if (tag === 'script' && attrs.has('src')) {
        scripts++;
        asset(attrs.get('src'), route);
      }
      if (
        tag === 'link' &&
        /^(?:stylesheet|preload|modulepreload|icon|apple-touch-icon)$/.test(
          attrs.get('rel') || '',
        )
      ) {
        const stylesheet = attrs.get('rel') === 'stylesheet';
        if (stylesheet) css++;
        asset(attrs.get('href'), route, stylesheet);
      }
      if (tag === 'img' || tag === 'source') {
        asset(attrs.get('src'), route);
        for (const source of (attrs.get('srcset') || '').split(','))
          asset(source.trim().split(/\s+/)[0], route);
      }
    }
    if (!scripts || !css)
      failures.push(
        `${route}: missing linked application scripts or stylesheet`,
      );
    pages++;
  }
  // CSS can reference fonts/images which are absent even when every HTML link exists.
  for (const stylesheet of stylesheets) {
    const css = readFileSync(resolve(root, '.' + stylesheet), 'utf8');
    for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g))
      asset(match[1].trim(), stylesheet);
  }
  try {
    const routes = JSON.parse(
      readFileSync(resolve(root, '_routes.json'), 'utf8'),
    );
    if (
      routes.version !== 1 ||
      !Array.isArray(routes.include) ||
      !routes.include.includes('/api/*') ||
      !Array.isArray(routes.exclude)
    )
      failures.push(
        '_routes.json: expected version 1 and an explicit /api/* function include',
      );
    else if (
      routes.exclude.some((pattern) => {
        if (typeof pattern !== 'string') return true;
        const prefix = pattern.split('*')[0];
        return prefix.startsWith('/api/') || '/api/'.startsWith(prefix);
      })
    )
      failures.push(
        '_routes.json: API requests are excluded from the Pages function',
      );
  } catch {
    failures.push('_routes.json: missing or invalid routing configuration');
  }
  if (failures.length)
    throw new Error('Pages export is incomplete:\n- ' + failures.join('\n- '));
  return { pages, assets: assets.size };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const result = checkPagesBuild();
    console.log(
      `Pages export verified: ${result.pages} essential routes, ${result.assets} linked assets, and API routing.`,
    );
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : 'Pages export verification failed',
    );
    process.exitCode = 1;
  }
}
