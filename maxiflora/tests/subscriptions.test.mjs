import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,apply,processTimers,snapshot} from '../lib/maxiflora/engine.mjs';
import {renewStockPublication} from '../lib/maxiflora/offer-publication.mjs';
import {launchPolicy} from '../lib/maxiflora/launch-policy.mjs';
import {campaignView,addAlmatyMonths,enrollNewAccount,subscriptionView,subscriptionAction,ensureTariffHistory,tariffHistoryPage} from '../lib/maxiflora/subscriptions.mjs';
const time=s=>Date.parse(s+'+05:00'),start=time('2026-10-21T00:00:00'),end=time('2026-11-21T00:00:00');
const fresh=()=>({id:'new-user',companyType:'IP',supplier:false,approved:false,complete:true,name:'Test',city:'Шымкент',plan:null});
test('campaign is one month, exact Almaty midnight boundaries and inclusive last registration date',()=>{
 assert.equal(campaignView(start-1).status,'scheduled');assert.equal(campaignView(start).status,'active');assert.equal(campaignView(end-1).status,'active');assert.equal(campaignView(end).status,'ended');
 assert.equal(campaignView(start).lastRegistrationDate,'2026-11-20');assert.equal(campaignView(start).endsAt,end);
 for(const months of [1,2,3])assert.equal(campaignView(start,{...launchPolicy,durationMonths:months}).endsAt,addAlmatyMonths(start,months));
 for(const months of [0,4,'1',null])assert.throws(()=>campaignView(start,{...launchPolicy,durationMonths:months}),/configuration/);
 assert.throws(()=>campaignView(start,{...launchPolicy,startDate:'2026-02-30'}),/date/);
});
test('trial is a calendar month from signup time, including month end and leap years',()=>{
 assert.equal(addAlmatyMonths(time('2026-01-31T23:59:00'),1),time('2026-02-28T23:59:00'));
 assert.equal(addAlmatyMonths(time('2028-01-31T10:15:22'),1),time('2028-02-29T10:15:22'));
 const u=fresh(),registered=end-1;enrollNewAccount(u,registered);assert.equal(u.plan,'MAX');assert.equal(u.planUntil,addAlmatyMonths(registered,1));assert.ok(u.planUntil>end);assert.equal(u.approved,false);
});
test('only new eligible accounts receive a grant and re-enrollment cannot renew it',()=>{
 for(const now of [start-1,end]){const u=fresh();enrollNewAccount(u,now);assert.equal(u.launchTrial,undefined);assert.equal(u.plan,null);}
 const u=fresh();enrollNewAccount(u,start);const grant=structuredClone(u.launchTrial);enrollNewAccount(u,start+86400000);assert.deepEqual(u.launchTrial,grant);
 const old={...fresh(),registeredAt:start-100};enrollNewAccount(old,start);assert.equal(old.launchTrial,undefined);
 const legacy=seed(start).profiles['demo-supplier'];subscriptionView(legacy,start);assert.equal(legacy.launchTrial,undefined);assert.equal(legacy.plan,'MAX');
});
test('role switching preserves the same original grant and never approves supplier',()=>{
 const s=seed(start),u=fresh();enrollNewAccount(u,start);s.profiles[u.id]=u;const until=u.planUntil;
 apply(s,u,{action:'supplier-enable'},start+1000);assert.equal(u.supplier,true);assert.equal(u.plan,'MAX');assert.equal(u.planUntil,until);assert.equal(u.approved,false);
 apply(s,u,{action:'supplier-enable'},until+1000);assert.equal(u.planUntil,until);assert.equal(subscriptionView(u,until).subscription.activePlan,null);
});
test('preference never activates payment or changes entitlement and same plan is stable',()=>{
 const s=seed(start),u=fresh();enrollNewAccount(u,start);const before=structuredClone(u.launchTrial),until=u.planUntil;
 for(const plan of ['Business','MAX','Start']){assert.equal(subscriptionAction(s,u,{action:'tariff-preference',plan,preferenceVersion:u.tariffVersion||0},start+5).activated,false);assert.equal(u.plan,'MAX');assert.equal(u.planUntil,until);assert.deepEqual(u.launchTrial,before);}
 subscriptionAction(s,u,{action:'tariff-preference',plan:'Start',preferenceVersion:u.tariffVersion},start+20);assert.equal(u.tariffPreference.selectedAt,start+5);
 assert.throws(()=>subscriptionAction(s,null,{action:'tariff-preference',plan:'MAX'},start),e=>e.status===401);
 for(const plan of ['',null,{},'Free'])assert.throws(()=>subscriptionAction(s,u,{action:'tariff-preference',plan},start));
});
test('campaign ending or later policy changes never shorten an issued grant',()=>{
 const u=fresh();enrollNewAccount(u,end-1);const until=u.planUntil;
 assert.equal(subscriptionView(u,end+1).subscription.trial.status,'active');assert.equal(u.planUntil,until);
 enrollNewAccount(u,end+1,{...launchPolicy,revision:2,startDate:'2026-10-22'});assert.equal(u.planUntil,until);
});
test('exact trial expiry blocks new sales but preserves reserve, history and existing order fulfillment',()=>{
 const registered=start+1000,s=seed(registered),seller=s.profiles['demo-supplier'],buyer=s.profiles['demo-buyer'];
 delete seller.registeredAt;enrollNewAccount(seller,registered);seller.approved=true;renewStockPublication(s,seller,s.products[0],7,true,seller.planUntil-1000);
 const checkout=()=>apply(s,buyer,{action:'checkout',items:[{pid:1,qty:25,price:7000,pack:25}]},seller.planUntil-1);
 const id=checkout().results[0].orderId,o=s.orders.find(x=>x.id===id),until=seller.planUntil;
 assert.equal(subscriptionView(seller,until-1).subscription.trial.status,'active');assert.equal(subscriptionView(seller,until).subscription.trial.status,'expired');
 const blocked=apply(s,buyer,{action:'checkout',items:[{pid:1,qty:25,price:7000,pack:25}]},until);assert.match(blocked.results[0].error,/недоступны/);assert.equal(s.products[0].reserved,25);
 apply(s,seller,{action:'ready',id,version:o.version},until);apply(s,seller,{action:'issue',id,version:o.version},until+1);assert.equal(o.status,'done');assert.equal(s.products[0].reserved,0);
});
test('MAX trial retains supplier approval requirement and allows full assortment',()=>{
 const s=seed(start),seller=s.profiles['demo-supplier'];enrollNewAccount(seller,start);seller.approved=false;
 assert.match(apply(s,s.profiles['demo-buyer'],{action:'checkout',items:[{pid:1,qty:25,price:7000,pack:25}]},start+1).results[0].error,/недоступны/);
 seller.approved=true;const p=s.products.find(p=>p.transit);p.published=false;assert.equal(apply(s,seller,{action:'publish',id:p.id},start+1).published,true);
 s.products=Array.from({length:10},(_,i)=>({...s.products[0],id:i+1,transit:false,published:true}));s.products.push({...s.products[0],id:11,published:false});apply(s,seller,{action:'publish',id:11,confirmFresh:true},start+1);assert.equal(s.products.at(-1).published,true);
});
test('expiry reminders are recipient-only, deduplicated and preserve domain state',()=>{
 const s=seed(start),u=fresh();s.products=[];enrollNewAccount(u,start);s.profiles[u.id]=u;const before=structuredClone({orders:s.orders,products:s.products,movements:s.movements});
 processTimers(s,u.planUntil-3*86400000-1);assert.equal(s.notifications.length,0);
 processTimers(s,u.planUntil-3*86400000);processTimers(s,u.planUntil-1000);assert.equal(s.notifications.length,1);
 processTimers(s,u.planUntil);processTimers(s,u.planUntil+1000);assert.equal(s.notifications.length,2);assert.ok(s.notifications.every(n=>n.users.length===1&&n.users[0]===u.id&&n.target==='tariffs'));
 assert.deepEqual({orders:s.orders,products:s.products,movements:s.movements},before);assert.equal(u.plan,'MAX');assert.equal(subscriptionView(null,start).subscription,null);
});
test('legacy preference migrates once, keeps original time and records no invented price or trial',()=>{
 const u={...fresh(),tariffPreference:{plan:'MAX',selectedAt:start-5000}};ensureTariffHistory(u);
 assert.equal(u.tariffVersion,1);assert.equal(u.tariffPreference.selectedAt,start-5000);assert.equal(u.tariffPreference.price,null);assert.equal(u.tariffHistory[0].legacy,true);assert.equal(u.launchTrial,undefined);
 const before=structuredClone(u);ensureTariffHistory(u);assert.deepEqual(u,before);
});
test('stale, missing and malformed preference revisions never overwrite newer choices',()=>{
 const s=seed(start),u=fresh(),choose=(plan,preferenceVersion)=>subscriptionAction(s,u,{action:'tariff-preference',plan,preferenceVersion},start);
 choose('Business',0);const saved=structuredClone(u);
 for(const version of [undefined,0,'1',NaN,-1])assert.throws(()=>choose('MAX',version),e=>e.status===409);
 assert.deepEqual(u,saved);choose('Business',1);assert.deepEqual(u,saved);choose('MAX',1);assert.equal(u.tariffVersion,2);assert.equal(u.tariffHistory[0].plan,'Business');assert.equal(u.tariffHistory[1].price,44990);
});
test('clearing requires the exact current selection and version, keeps history and existing entitlements',()=>{
 const s=seed(start),u=fresh();enrollNewAccount(u,start);s.profiles[u.id]=u;
 const untouched=structuredClone({orders:s.orders,products:s.products,movements:s.movements,trial:u.launchTrial,plan:u.plan,until:u.planUntil});
 subscriptionAction(s,u,{action:'tariff-preference',plan:'MAX',preferenceVersion:0,price:1,planUntil:4102444800000},start);
 const id=u.tariffPreference.id;
 for(const b of [{selectionId:'foreign',preferenceVersion:1},{selectionId:id,preferenceVersion:0}])assert.throws(()=>subscriptionAction(s,u,{action:'tariff-preference-clear',...b},start),e=>e.status===409);
 subscriptionAction(s,u,{action:'tariff-preference-clear',selectionId:id,preferenceVersion:1},start+1);
 assert.equal(u.tariffPreference,null);assert.equal(u.tariffVersion,2);assert.equal(u.tariffHistory[0].price,44990);assert.equal(u.tariffHistory[1].type,'cleared');assert.equal(u.tariffHistory[1].selectionId,id);
 assert.deepEqual({orders:s.orders,products:s.products,movements:s.movements,trial:u.launchTrial,plan:u.plan,until:u.planUntil},untouched);
 assert.throws(()=>subscriptionAction(s,u,{action:'tariff-preference-clear',selectionId:id,preferenceVersion:2},start),e=>e.status===409);
});
test('history pages are bounded, newest first, with stable non-overlapping sequence cursors',()=>{
 const s=seed(start),u=fresh();for(let i=0;i<45;i++)subscriptionAction(s,u,{action:'tariff-preference',plan:i%2?'MAX':'Start',preferenceVersion:i},start+i);
 const first=tariffHistoryPage(u),second=tariffHistoryPage(u,first.nextBefore),third=tariffHistoryPage(u,second.nextBefore);
 assert.equal(first.items.length,20);assert.equal(second.items.length,20);assert.equal(third.items.length,5);assert.equal(third.nextBefore,null);assert.equal(first.total,45);
 assert.deepEqual([...first.items,...second.items,...third.items].map(x=>x.sequence),Array.from({length:45},(_,i)=>45-i));
 for(const cursor of [0,-1,1.5,'2',Infinity])assert.throws(()=>tariffHistoryPage(u,cursor),e=>e.status===400);
 assert.throws(()=>tariffHistoryPage(null),e=>e.status===401);
});
test('history is absent from raw profile response and never exposed to other accounts or guests',()=>{
 const s=seed(start),u=s.profiles['demo-buyer'],other=s.profiles['demo-supplier'];subscriptionAction(s,u,{action:'tariff-preference',plan:'Start',preferenceVersion:0},start);
 assert.equal(snapshot(s,u).profile.tariffHistory,undefined);assert.equal(subscriptionView(u,start).subscription.history.items.length,1);
 assert.equal(subscriptionView(other,start).subscription.history.items.length,0);assert.equal(subscriptionView(null,start).subscription,null);
});
test('role changes and repeated choice after expiry cannot activate a paid plan or renew trial',()=>{
 const s=seed(start),u=fresh();enrollNewAccount(u,start);s.profiles[u.id]=u;const until=u.planUntil;
 subscriptionAction(s,u,{action:'tariff-preference',plan:'MAX',preferenceVersion:0},until+1);apply(s,u,{action:'supplier-enable'},until+1);
 assert.equal(u.plan,'MAX');assert.equal(u.planUntil,until);assert.equal(subscriptionView(u,until+1).subscription.activePlan,null);
 assert.throws(()=>subscriptionAction(s,u,{action:'tariff-activate',plan:'MAX',preferenceVersion:1},until),e=>e.status===403);
});
