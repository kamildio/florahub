import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {initializeAccountEmails} from '../server/account-schema.mjs';
function fixture(emails){
 const raw=new DatabaseSync(':memory:');raw.exec('CREATE TABLE accounts(id TEXT PRIMARY KEY,email TEXT UNIQUE,profile TEXT); CREATE TABLE workspaces(id TEXT PRIMARY KEY,state TEXT)');
 const profiles={};emails.forEach((email,i)=>{const p={id:String(i),email,name:'Original'};raw.prepare('INSERT INTO accounts VALUES (?,NULL,?)').run(p.id,JSON.stringify(p));profiles[p.id]={...p,name:'Latest workspace edit'};});raw.prepare('INSERT INTO workspaces VALUES (?,?)').run('live',JSON.stringify({profiles}));
 const connection={async beginTransaction(){raw.exec('BEGIN')},async commit(){raw.exec('COMMIT')},async rollback(){raw.exec('ROLLBACK')},release(){},async execute(sql,args){const q=raw.prepare(sql.replace(/ FOR UPDATE$/,''));return /^SELECT/.test(sql)?[q.all(...args||[])]:[{affectedRows:q.run(...args||[]).changes}]}},pool={getConnection:async()=>connection,execute:async()=>[[{n:1}]]};return {raw,pool};
}
test('email backfill uses latest workspace profile, normalizes contact and is repeatable',async()=>{const {raw,pool}=fixture([' A@Example.test ','b@example.test']);assert.deepEqual(await initializeAccountEmails(pool),{ready:true});assert.deepEqual(await initializeAccountEmails(pool),{ready:true});const row=raw.prepare('SELECT * FROM accounts WHERE id=?').get('0');assert.equal(row.email,'a@example.test');assert.equal(JSON.parse(row.profile).name,'Latest workspace edit');});
test('legacy duplicate emails stop migration without merging accounts or partial backfill',async()=>{const {raw,pool}=fixture(['a@example.test',' A@EXAMPLE.test ']);await assert.rejects(initializeAccountEmails(pool),e=>e.code==='ACCOUNT_EMAIL_CONFLICT');assert.equal(raw.prepare('SELECT count(*) AS n FROM accounts').get().n,2);assert.equal(raw.prepare('SELECT count(*) AS n FROM accounts WHERE email IS NOT NULL').get().n,0);assert.equal(JSON.parse(raw.prepare('SELECT profile FROM accounts WHERE id=?').get('0').profile).name,'Original');});
