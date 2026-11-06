import mysql from 'mysql2/promise';
import {DomainError} from '../lib/maxiflora/engine.mjs';
import {initializeAccountEmails} from './account-schema.mjs';

export function databaseConfig(source=process.env){
 for(const name of ['MYSQL_HOST','MYSQL_DATABASE','MYSQL_USER','MYSQL_PASSWORD'])if(!source[name])throw new Error(`Missing server setting: ${name}`);
 return {host:source.MYSQL_HOST,port:Number(source.MYSQL_PORT||3306),database:source.MYSQL_DATABASE,user:source.MYSQL_USER,password:source.MYSQL_PASSWORD,charset:'utf8mb4',connectionLimit:5,supportBigNumbers:true,bigNumberStrings:false,multipleStatements:false};
}

export function translateSQL(sql){
 if(sql.startsWith('INSERT INTO login_attempts '))return 'INSERT INTO login_attempts (`key`,`count`,`reset`) VALUES (?,1,?) ON DUPLICATE KEY UPDATE `count`=IF(`reset`<=?,1,`count`+1), `reset`=IF(`reset`<=?,VALUES(`reset`),`reset`)';
 return sql.replace(/^INSERT OR IGNORE INTO /,'INSERT IGNORE INTO ').replace(/\bkey\b/g,'`key`');
}

export function createDatabase(pool,emailReady){
 const database={prepare(sql){return {bind(...values){return statement(values)},...statement([])};
  function statement(values){
   async function execute(){try{return (await pool.execute(translateSQL(sql),values))[0]}catch(e){if(e.code==='ER_DUP_ENTRY')throw new Error('UNIQUE constraint failed');throw e;}}
   return {async first(){const rows=await execute();return rows[0]||null},async all(){return {results:await execute()}},async run(){const result=await execute();return {meta:{changes:result.affectedRows}}}};
  }
 }};
 if(emailReady)database.accountEmailReady=emailReady;
 if(pool.getConnection)database.commitWorkspaceState=async({id,revision,state,profiles})=>{
  const connection=await pool.getConnection();
  try{
   await connection.beginTransaction();
   const [changed]=await connection.execute('UPDATE workspaces SET state=?,revision=revision+1 WHERE id=? AND revision=?',[state,id,revision]);
   if(changed.affectedRows!==1){await connection.rollback();return {meta:{changes:0}};}
   const ready=!emailReady||await emailReady();
   for(const profile of profiles){
    if(ready){const email=typeof profile.email==='string'?profile.email.trim().toLowerCase():'';await connection.execute('UPDATE accounts SET profile=?,email=? WHERE id=?',[JSON.stringify(profile),email||null,profile.id]);}
    else await connection.execute('UPDATE accounts SET profile=? WHERE id=?',[JSON.stringify(profile),profile.id]);
   }
   await connection.commit();return {meta:{changes:1}};
  }catch(e){await connection.rollback();if(e.code==='ER_DUP_ENTRY')throw new DomainError('Не удалось сохранить этот email. Используйте другой контакт или обратитесь в поддержку.',409);throw e}finally{connection.release()}
 };
 return database;
}

let pool;
let initialization,emailStatus={ready:false};
async function readyPool(){
 pool??=mysql.createPool(databaseConfig());
 initialization??=initializeAccountEmails(pool).then(result=>{emailStatus=result}).catch(e=>{emailStatus={ready:false,issue:/^[A-Z0-9_]+$/.test(e.code||'')?e.code:'EMAIL_SCHEMA_UNAVAILABLE'};console.error('MaXiFlora email index: '+emailStatus.issue)});
 await initialization;return pool;
}
export function accountEmailStatus(){return {...emailStatus};}
export function nodeDatabase(){return createDatabase({async execute(...args){return (await readyPool()).execute(...args)},async getConnection(){return (await readyPool()).getConnection()}},async()=>{await readyPool();return emailStatus.ready});}

export const schema=[
 'CREATE TABLE IF NOT EXISTS accounts (id VARCHAR(200) COLLATE utf8mb4_bin PRIMARY KEY,phone VARCHAR(32) COLLATE utf8mb4_bin NOT NULL UNIQUE,email VARCHAR(254) COLLATE utf8mb4_bin NULL UNIQUE,password TEXT NOT NULL,profile LONGTEXT NOT NULL) ENGINE=InnoDB',
 'CREATE TABLE IF NOT EXISTS workspaces (id VARCHAR(200) COLLATE utf8mb4_bin PRIMARY KEY,revision BIGINT NOT NULL DEFAULT 0,state LONGTEXT NOT NULL) ENGINE=InnoDB',
 'CREATE TABLE IF NOT EXISTS sessions (token VARCHAR(64) COLLATE utf8mb4_bin PRIMARY KEY,account VARCHAR(200) COLLATE utf8mb4_bin NOT NULL,workspace VARCHAR(200) COLLATE utf8mb4_bin NOT NULL,expires BIGINT NOT NULL,INDEX sessions_account (account),INDEX sessions_expiry (expires)) ENGINE=InnoDB',
 'CREATE TABLE IF NOT EXISTS login_attempts (`key` VARCHAR(200) COLLATE utf8mb4_bin PRIMARY KEY,`count` INT NOT NULL DEFAULT 0,`reset` BIGINT NOT NULL) ENGINE=InnoDB'
];
