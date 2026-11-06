import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base=process.env.MAXIFLORA_TEST_URL||'http://127.0.0.1:5174';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('Synthetic tests require localhost');
const headers={'Content-Type':'application/json',Origin:base,'x-maxiflora-test-workspace':'catalog-'+randomUUID()};
async function call(path,expected=200,cookie='',body){const response=await fetch(base+'/api/platform/'+path,{headers:{...headers,...(cookie?{Cookie:cookie}:{})},...(body?{method:'POST',body:JSON.stringify(body)}:{})});const data=await response.json();assert.equal(response.status,expected,JSON.stringify(data));assert.equal(response.headers.get('cache-control'),'no-store');return {data,cookie:response.headers.get('set-cookie')?.split(';')[0]}}
const result=(await call('catalog?city='+encodeURIComponent('Шымкент'))).data;assert.ok(result.total>0);assert.equal(result.limit,24);assert.equal(result.page,1);
for(const row of result.rows)for(const p of row.offers)for(const field of ['total','reserved','movements','phone','email'])assert.equal(p[field],undefined);
assert.equal((await call('catalog?city='+encodeURIComponent('Астана'))).data.total,0);
assert.equal((await call('catalog?city='+encodeURIComponent('Шымкент')+'&q='+encodeURIComponent('несуществующее'))).data.total,0);
await call('catalog?limit=100000',400);await call('catalog?page=-1',400);
assert.equal((await call('state?catalog=remote')).data.products.length,0);
const supplier=(await call('demo',200,'',{role:'supplier'})).cookie;assert.ok((await call('state?mode=supplier&catalog=remote',200,supplier)).data.products.length>0);
console.log('Catalog API: 7 checks passed.');
