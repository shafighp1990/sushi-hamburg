import copy from './commerce-copy.json';
import type { Language } from './catalog';
export function ct(lang: Language, key: keyof typeof copy) {
  return copy[key][lang];
}
