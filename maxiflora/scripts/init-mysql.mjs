import mysql from 'mysql2/promise';
import {databaseConfig,schema} from '../server/mysql-store.mjs';
const connection=await mysql.createConnection(databaseConfig());
try{for(const sql of schema)await connection.execute(sql);console.log('Database tables are ready. Existing records were preserved.')}finally{await connection.end()}
