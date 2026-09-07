import data from './knowledge-data.json';
import {products,type Language,type Product} from './catalog';
export type KnowledgeCategory='types'|'ingredients'|'techniques'|'history';
export type Article={id:string;category:KnowledgeCategory;title:Record<Language,string>;body:Record<Language,string[]>;sources:string[];related:string[];steps:Record<Language,string[]>};
export const articles=data.articles as Article[];
export const sources=data.sources;
export const reviewed=data.reviewed;
export const categoryLabels:Record<KnowledgeCategory,Record<Language,string>>={types:{de:'Sushi-Arten',uk:'Види суші'},ingredients:{de:'Zutaten',uk:'Інгредієнти'},techniques:{de:'Zubereitung',uk:'Приготування'},history:{de:'Geschichte',uk:'Історія'}};
// Only explicit menu ingredients are mapped. No ingredients inferred from photos or trade names.
const ingredientRules:[string,RegExp][]=[['sushi-reis',/Reis/],['nori',/Nori/],['lachs',/Lachs/],['unagi',/Aal/],['garnele',/garnele/i],['surimi',/Surimi/],['krabbe',/Schneekrabbe|Krabbenfleisch|Lachs-Krabben/],['masago',/Masago/],['takuan',/Takuan/],['gurke',/Gurke/],['avocado',/Avocado/],['frischkaese',/Philadelphia-Frischkäse/],['cheddar',/Cheddar|Hartkäse/],['sesam',/Sesam/],['saucen',/Sauce|Mayonnaise/],['roestzwiebeln',/Röstzwiebeln/]];
export function productIngredients(p:Product){return p.category==='sets'?[]:ingredientRules.filter(([,test])=>test.test(p.description.de)).map(([id])=>articles.find(a=>a.id===id)!);}
export function productTopics(p:Product){const ids=p.category==='sets'?['moderne-rollen','geschichte']:p.category==='maki'?['hosomaki','rollen','gegart-oder-roh']:p.id.startsWith('futomaki')?['futomaki','rollen','gegart-oder-roh']:['moderne-rollen','gegart-oder-roh'];return ids.map(id=>articles.find(a=>a.id===id)!);}
export const setComponents:Record<string,string[]>={mix:['maki-cucumber'],'salmon-hit':['cheese-salmon','cheese-shrimp'],bonsai:['bonito','kurimi','kabia'],dragons:[],'maki-set':['maki-sake','maki-avocado','maki-spicy','maki-unagi','maki-cucumber'],premium:[]};
export function relatedProducts(id:string){return products.filter(p=>productIngredients(p).some(a=>a.id===id)||productTopics(p).some(a=>a.id===id));}
export function searchArticles(query:string,category:string='all'){const terms=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);return articles.filter(a=>(category==='all'||a.category===category)&&terms.every(term=>[a.title.de,a.title.uk,...a.body.de,...a.body.uk,...a.steps.de,...a.steps.uk,a.id].join(' ').toLocaleLowerCase().includes(term)));}
