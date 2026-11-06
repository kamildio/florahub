import test from 'node:test';
import assert from 'node:assert/strict';
import {searchCatalog} from '../lib/maxiflora/catalog-search.mjs';
import {seed,snapshot} from '../lib/maxiflora/engine.mjs';
const now=Date.now(),publicRows=()=>snapshot(seed(now),null,'buyer',now).products;
const search=(rows,params={})=>searchCatalog(rows,new URLSearchParams({city:'Шымкент',...params}));
test('server search retains other eligible sellers for the matched flower and compares unit prices',()=>{
 const p=publicRows()[0],offers=[{...p,id:1,baseId:'rose',name:'Роза',supplier:'А',price:5000,pack:25},{...p,id:2,baseId:'rose',name:'Роза',supplier:'Б',price:5000,pack:20},{...p,id:3,baseId:'other',name:'Зелень',supplier:'В'}];
 const result=search(offers,{q:'А'});assert.equal(result.total,1);assert.equal(result.rows[0].offers.length,2);assert.equal(result.rows[0].minPrice,200);
});
test('server pages remain stable with ties, clamp removed last page and respect city and publication projection',()=>{
 const p=publicRows()[0],rows=Array.from({length:55},(_,i)=>({...p,id:i+1,baseId:String(i+1),name:'Роза',city:i===54?'Алматы':'Шымкент'}));
 const a=search(rows,{page:'1'}),b=search(rows,{page:'2'}),c=search(rows,{page:'999'});assert.equal(a.total,54);assert.equal(a.rows.length,24);assert.equal(b.rows.length,24);assert.equal(c.page,3);assert.equal(c.rows.length,6);assert.equal(new Set([...a.rows,...b.rows,...c.rows].map(r=>r.id)).size,54);
 const state=seed(now);state.products[0].published=false;assert.ok(!search(snapshot(state,null,'buyer',now).products).rows.some(r=>r.offers.some(p=>p.id===1)));
});
test('server sorting uses sellable per-piece prices and filters transit, stem length and category',()=>{
 const p=publicRows()[0],rows=[{...p,id:1,baseId:'a',price:100,available:0},{...p,id:2,baseId:'b',price:10000},{...p,id:3,baseId:'c',price:5000}];
 assert.deepEqual(search(rows,{sort:'priceDesc'}).rows.map(r=>r.id),['b','c','a']);assert.equal(search(rows,{transit:'true'}).total,0);assert.equal(search(rows,{height:'999'}).total,0);assert.equal(search(rows,{category:'несуществующая'}).total,0);
});
test('unbounded or malformed pagination and query values are rejected',()=>{
 for(const params of [{page:'0'},{page:'-1'},{limit:'100000'},{q:'x'.repeat(161)},{sort:'random'},{height:'NaN'},{transit:'yes'}])assert.throws(()=>search([],params),e=>e.status===400);
});
