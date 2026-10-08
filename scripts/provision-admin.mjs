// Run by the site owner against the chosen database; there is no public role-claim endpoint.
import {writeFile,mkdir} from 'node:fs/promises';
const email=process.argv[2];if(!email||!/^\S+@\S+\.\S+$/.test(email)||email.includes("'"))throw Error('Usage: node scripts/provision-admin.mjs owner@example.com');
await mkdir('.wrangler',{recursive:true});await writeFile('.wrangler/provision-owner.sql',`INSERT OR IGNORE INTO staff(user_id,created_at) SELECT id,${Date.now()} FROM user WHERE email='${email.toLowerCase()}';\n`);
console.log('Prepared .wrangler/provision-owner.sql. Confirm that this registered account belongs to the owner, then apply through an authenticated database administrator. No account was promoted by this script.');
