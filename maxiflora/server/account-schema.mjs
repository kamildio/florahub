// Additive migration. No accounts are removed or merged; duplicate contacts stop
// new signup/profile-email edits until an operator resolves them.
export async function initializeAccountEmails(pool){
 const [[column]]=await pool.execute("SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='accounts' AND COLUMN_NAME='email'");
 if(!Number(column.n)){try{await pool.execute('ALTER TABLE accounts ADD COLUMN email VARCHAR(254) COLLATE utf8mb4_bin NULL')}catch(e){if(e.code!=='ER_DUP_FIELDNAME')throw e;}}
 const [[index]]=await pool.execute("SELECT COUNT(*) AS n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='accounts' AND COLUMN_NAME='email' AND NON_UNIQUE=0");
 if(!Number(index.n)){try{await pool.execute('CREATE UNIQUE INDEX accounts_email_unique ON accounts (email)')}catch(e){if(e.code!=='ER_DUP_KEYNAME')throw e;}}
 const connection=await pool.getConnection();
 try{
  await connection.beginTransaction();
  // Lock in the same order as normal state commits: workspace, then accounts.
  const [spaces]=await connection.execute('SELECT state FROM workspaces WHERE id=? FOR UPDATE',['live']);
  const profiles=spaces.length?JSON.parse(spaces[0].state).profiles||{}:{};
  const [accounts]=await connection.execute('SELECT id,profile FROM accounts FOR UPDATE');
  const used=new Set();
  for(const row of accounts){
   const profile=profiles[row.id]||JSON.parse(row.profile),email=typeof profile.email==='string'?profile.email.trim().toLowerCase():'';
   if(!email)continue;
   if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Object.assign(new Error('Account email needs review'),{code:'ACCOUNT_EMAIL_INVALID'});
   if(used.has(email))throw Object.assign(new Error('Account email conflict'),{code:'ACCOUNT_EMAIL_CONFLICT'});used.add(email);
   await connection.execute('UPDATE accounts SET email=?,profile=? WHERE id=?',[email,JSON.stringify(profile),row.id]);
  }
  await connection.commit();return {ready:true};
 }catch(e){await connection.rollback();throw e}finally{connection.release()}
}
