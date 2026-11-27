const fs=require('fs'),vm=require('vm'),assert=require('assert');const data={};
const ctx={localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},Intl,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/points/src/points-engine.js','utf8'),ctx);
const p=ctx.Points;p.manual('QA',100,'新增','a','b');assert.equal(p.snapshot().pool,100);
p.manual('QA',-10,'扣除','a','b');assert.equal(p.snapshot().pool,90);
for(const [method,key] of [['酒店','booking'],['垫付还款','repay']]){p.transaction([{account:'QA',amount:-10,method,order:key}],key);assert.equal(p.snapshot().pool,90)}
assert.equal(p.snapshot().holding,70);assert.equal(p.transaction([{account:'QA',amount:-10,method:'酒店'}],'booking'),false);
assert.throws(()=>p.transaction([{account:'QA',amount:-1000,method:'酒店'}],'fail'));
p.correct(p.snapshot().batches[0].no,5,'更正','a','b');assert.equal(p.snapshot().pool,95);
const s=p.snapshot(Date.now()+100*86400000);assert.equal(s.holding,0);assert.equal(s.pool,170);
assert.equal(p.snapshot(Date.now()+101*86400000).pool,170);
assert.equal(s.flows.filter(f=>f.place==='积分池'&&f.type==='兑换'&&f.method!=='手动扣除').length,0);
console.log('PASS: 普通增减同向、兑换池不变、逾期回池、失败与重复无额外记账');
