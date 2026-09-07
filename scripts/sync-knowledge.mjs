import {copyFileSync,mkdirSync} from 'node:fs';
mkdirSync('public/data',{recursive:true});
copyFileSync('lib/knowledge-data.json','public/data/sushi-knowledge.json');
