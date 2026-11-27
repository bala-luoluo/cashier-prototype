/* Local prototype ledger. Production requires server transactions and scheduled expiry. */
(function(root){
// Apply the user's revised warning setting once, including saved prototype settings.
if(!localStorage.getItem('points-warning-30-20261126')){const saved=JSON.parse(localStorage.getItem('points-clone-v1')||'null');if(saved?.settings){const before=(saved.settings.warnings||[7,3,1]).join(',');saved.settings.warnings=[30];saved.settingsLogs||=[];if(before!=='30')saved.settingsLogs.unshift({time:new Date().toLocaleString('sv-SE'),effective:new Date().toLocaleString('sv-SE'),type:'需求调整',account:'全部户口',field:'到期预警',before,after:'30',reason:'用户要求到期预警改为提前30天'});localStorage.setItem('points-clone-v1',JSON.stringify(saved))}localStorage.setItem('points-warning-30-20261126','1')}
const KEY='points-ledger-v3', round=n=>Math.round((n+Number.EPSILON)*10000)/10000;
const day=t=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
const config=()=>{const old=JSON.parse(localStorage.getItem('points-clone-v1')||'{}');return {days:90,repaymentDiscount:.6,threshold:.1,rates:{'港币(越)':1,'人民币':1,'美金(越)':1,'越南盾':1,USDT:1,'USDT-TRC':1,'USDT-ERC':1},warnings:[30],negativeLimit:0,...old.settings,accountExpiry:old.accountExpiry||{}}};
function load(){return JSON.parse(localStorage.getItem(KEY)||'{"batches":[],"flows":[],"keys":[]}')}
function put(s){localStorage.setItem(KEY,JSON.stringify(s))}
function add(s,type,place,n,meta,t){const flow={no:'PL'+String(s.flows.length+1).padStart(8,'0'),time:new Date(t).toISOString(),type,place,amount:round(n),operator:'系统',confirmer:'系统',...meta};s.flows.push(flow);if(place==='客户持有'&&!(type==='兑换'&&meta.method!=='手动扣除')){const expired=type==='到期退回',issued=type==='收工发放';s.flows.push({...flow,no:'PL'+String(s.flows.length+1).padStart(8,'0'),place:'积分池',amount:expired||issued?round(-n):round(n),customerFlow:flow.no,poolRule:expired?'expiry-return':issued?'turnover-issue':'same-direction'});}}
const remaining=(s,b)=>round(s.flows.filter(f=>f.batch===b.no&&f.place==='客户持有').reduce((n,f)=>n+f.amount,0));
function expire(s,t){for(const b of s.batches){if(b.expiry&&Date.parse(b.expiry)<+new Date(t)&&!s.keys.includes('expiry:'+b.no)){const n=remaining(s,b);add(s,'到期退回','客户持有',-n,{batch:b.no,account:b.account,order:b.order},t);s.keys.push('expiry:'+b.no)}}}
function read(t=Date.now()){const s=load();expire(s,t);put(s);return s}
function expiry(t,days){if(!days)return null;const d=new Date(day(t)+'T00:00:00+08:00');d.setUTCDate(d.getUTCDate()+days);return new Date(+d-1000).toISOString()}
function positive(n){if(!Number.isFinite(n)||n<=0||round(n)!==n)throw Error('积分须大于0且最多四位小数')}
function rows(s,t){return s.batches.map(b=>({...b,left:remaining(s,b),used:round(-s.flows.filter(f=>f.batch===b.no&&['兑换','兑换撤销'].includes(f.type)).reduce((n,f)=>n+f.amount,0)),returned:s.flows.filter(f=>f.batch===b.no&&f.type==='到期退回'&&f.place==='客户持有').reduce((n,f)=>n-f.amount,0),status:s.keys.includes('expiry:'+b.no)?'已到期扣除':remaining(s,b)>0?'有效':'已兑换完'}))}
function snapshot(t=Date.now()){const s=read(t),b=rows(s,t);return {...s,batches:b,pool:round(s.flows.filter(f=>f.place==='积分池').reduce((n,f)=>n+f.amount,0)),holding:round(b.reduce((n,b)=>n+b.left,0))}}
function close({order,account,turnover,currency='HKD',time=Date.now()}){const s=load();if(s.keys.includes('close:'+order))return false;const c=config(),map={HKD:'港币(越)',CNY:'人民币',USD:'美金(越)',VND:'越南盾',USDT:'USDT'},rate=currency==='HKD'?1:Number(c.rates[map[currency]]??(currency==='USDT'?c.rates['USDT-TRC']:undefined));if(!Number.isFinite(turnover)||!Number.isFinite(rate)||rate<=0)throw Error('积分汇率未配置');const n=c.threshold>0?Math.max(0,Math.floor(turnover*rate/c.threshold+1e-10)):0;const days=c.accountExpiry[account]??c.days,b={no:'PB'+String(s.batches.length+1).padStart(8,'0'),account,order,time:new Date(time).toISOString(),days,source:account in c.accountExpiry?'户口专属':'默认',expiry:expiry(time,days),amount:n};s.batches.push(b);add(s,'收工发放','客户持有',n,{batch:b.no,account,order},time);s.keys.push('close:'+order);expire(s,Date.now());put(s);return b}
function finance(n,reason,date,operator,confirmer){positive(Math.abs(n));if(!reason.trim()||!date||!operator||!confirmer||operator===confirmer)throw Error('请填写原因、对应日期及两位不同人员');const s=read();add(s,n>0?'财务新增':'财务手动扣除','积分池',n,{reason,date,operator,confirmer},Date.now());put(s)}
function apply(s,{account,amount,order,method='',reason='',operator='演示操作员',confirmer='演示确认人'},t){positive(Math.abs(amount));const meta={account,order,method,reason,operator,confirmer};if(amount<0){let left=-amount;const list=s.batches.filter(b=>b.account===account&&(!b.expiry||Date.parse(b.expiry)>=+new Date(t))).sort((a,b)=>(a.expiry||'9999').localeCompare(b.expiry||'9999')||a.time.localeCompare(b.time)||a.no.localeCompare(b.no));if(round(list.reduce((n,b)=>n+remaining(s,b),0))<left)throw Error('可用积分不足');for(const b of list){const n=Math.min(left,remaining(s,b));if(n>0){add(s,'兑换','客户持有',-n,{...meta,batch:b.no},t);left=round(left-n)}}}else{throw Error('积分不支持负数冲销，请在户口余额通过添加补回')}}
function transaction(legs,key,dry=false,t=Date.now()){const s=read(t);if(key&&s.keys.includes(key))return false;for(const leg of legs){if(leg.place==='积分池'){if(!['公司赠送还款','积分代垫现金还款','积分代垫余额还款'].includes(leg.method)||!Number.isSafeInteger(leg.amount)||leg.amount>=0||!leg.order)throw Error('公司积分扣除无效');add(s,leg.method,'积分池',leg.amount,{account:leg.account,order:leg.order,method:leg.method,reason:leg.reason||'',operator:leg.operator||'演示操作员',confirmer:leg.confirmer||'演示确认人'},t)}else apply(s,leg,t)}if(key)s.keys.push(key);if(!dry)put(s);return true}
function correct(batch,delta,reason,operator,confirmer){positive(Math.abs(delta));if(!reason.trim()||!operator||!confirmer||operator===confirmer)throw Error('更正须填写原因及双人确认');const s=read(),b=s.batches.find(b=>b.no===batch);if(!b)throw Error('批次不存在');if(b.expiry&&Date.parse(b.expiry)<Date.now())throw Error('已到期批次更正规则待确认');if(remaining(s,b)+delta<0)throw Error('扣回后客户剩余不足，需人工核实；本次未记账');const meta={batch,account:b.account,order:b.order,reason,operator,confirmer};add(s,'转码更正','客户持有',delta,meta,Date.now());put(s)}
function importLegacy(reason){if(!reason.trim())throw Error('请填写期初导入原因');const s=read();if(s.keys.includes('legacy-import'))throw Error('已导入，请勿重复');const old=JSON.parse(localStorage.getItem('points-clone-v1')||'{}');if(!old.batches?.length)throw Error('无旧积分批次可导入');for(const [i,x] of old.batches.entries()){const b={no:'LEGACY'+i,account:x.id,order:'期初导入',time:new Date(x.time.replace(' ','T')+'+08:00').toISOString(),days:null,source:'期初保留期限',expiry:x.expiry?new Date(x.expiry.replace(' ','T')+'+08:00').toISOString():null,amount:x.amount/10000};s.batches.push(b);add(s,'期初导入','客户持有',x.left/10000,{batch:b.no,account:b.account,order:b.order,reason,operator:'演示操作员',confirmer:'演示确认人'},Date.now())}add(s,'期初导入','积分池',Number(old.company?.balance||0)/10000,{reason,operator:'演示操作员',confirmer:'演示确认人'},Date.now());s.keys.push('legacy-import');expire(s,Date.now());put(s)}
function manual(account,amount,reason,operator,confirmer,t=Date.now()){positive(Math.abs(amount));if(!account||!reason.trim()||!operator||!confirmer||operator===confirmer)throw Error('请填写户口、备注和两位不同人员');const s=read(t);if(amount<0){apply(s,{account,amount,order:'MANUAL'+Date.now(),method:'手动扣除',reason,operator,confirmer},t)}else{const c=config(),days=c.accountExpiry[account]??c.days,b={no:'PB'+String(s.batches.length+1).padStart(8,'0'),account,order:'手动添加',time:new Date(t).toISOString(),days,source:account in c.accountExpiry?'户口专属':'默认',expiry:expiry(t,days),amount,reason,operator};s.batches.push(b);add(s,'手动添加','客户持有',amount,{batch:b.no,account,reason,operator,confirmer},t);}put(s)}
function adjustExpiry(ids,date,reason,operator,confirmer,t=Date.now()){
 if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw Error('请选择有效且不重复的积分记录');
 if(!reason.trim()||!operator||!confirmer||operator===confirmer)throw Error('请填写原因及双人确认');
 let next=null;
 if(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T23:59:59+08:00'))||day(date+'T12:00:00+08:00')!==date||date<day(t))throw Error('到期日须为今天或之后的有效日期');next=new Date(date+'T23:59:59+08:00').toISOString()}
 const s=read(t),list=ids.map(id=>s.batches.find(b=>b.no===id));
 if(list.some(b=>!b))throw Error('积分记录不存在，请刷新后重选');
 s.expiryChanges||=[];
 for(const b of list){if(b.expiry===next)continue;const before=b.expiry;
 const days=next?Math.round((Date.parse(date+'T00:00:00+08:00')-Date.parse(day(b.time)+'T00:00:00+08:00'))/86400000)+1:0;
 if(days<0)throw Error('到期日不能早于获取日');
 s.expiryChanges.push({batch:b.no,account:b.account,before,after:next,reason:reason.trim(),operator,confirmer,time:new Date(t).toISOString()});
 b.expiry=next;b.days=days;b.source='单笔期限调整';
 }put(s);
}
function usedTotal(s,month=day(Date.now()).slice(0,7)){
 return round(s.flows.filter(f=>f.amount<0&&day(f.time).startsWith(month)&&((f.place==='客户持有'&&f.type==='兑换')||(f.place==='积分池'&&['财务手动扣除','公司赠送还款','积分代垫现金还款','积分代垫余额还款'].includes(f.type)&&!f.customerFlow))).reduce((n,f)=>n-f.amount,0));
}
function extendExpiry(ids,days,reason,operator,confirmer,t=Date.now()){
 if(!Number.isSafeInteger(days)||days<=0||days>36500)throw Error('延长天数须为1至36500的整数');
 if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw Error('请选择有效积分记录');
 if(!reason.trim()||!operator||!confirmer||operator===confirmer)throw Error('请填写原因及双人确认');
 const s=read(t),list=ids.map(id=>s.batches.find(b=>b.no===id));
 if(list.some(b=>!b))throw Error('积分记录不存在，请刷新后重选');
 const updates=list.map(b=>{if(!b.expiry)throw Error('永久有效积分无需延长');const next=new Date(Date.parse(b.expiry)+days*86400000);if(!Number.isFinite(+next)||next.getUTCFullYear()>9999)throw Error('调整后的日期超出范围');return {b,next:next.toISOString()}});
 s.expiryChanges||=[];
 for(const {b,next} of updates){s.expiryChanges.push({batch:b.no,account:b.account,before:b.expiry,after:next,addedDays:days,effectiveFrom:b.expiry,reason:reason.trim(),operator,confirmer,time:new Date(t).toISOString()});b.expiry=next;b.days=(Number(b.days)||0)+days;b.source='单笔期限调整'}
 put(s);
}
function ensureExpiryDemo(account='DEMO001',accountName='演示客户甲',t=Date.now()){
 const s=read(t),key='expiry-edit-demo-20261127';
 if(s.keys.includes(key))return false;
 const b={no:'PB-DEMO-EXPIRY-001',account,accountName,order:'手动添加',time:new Date(t).toISOString(),days:90,source:'可操作演示',expiry:expiry(t,90),amount:1000,reason:'可操作演示：支持单条及批量调整有效期',operator:'演示操作员',demo:true};
 if(s.batches.some(x=>x.no===b.no))return false;
 s.batches.push(b);add(s,'手动添加','客户持有',1000,{batch:b.no,account,reason:b.reason,operator:b.operator,confirmer:'演示确认人'},t);
 s.keys.push(key);put(s);return true;
}
root.Points={extendExpiry,ensureExpiryDemo,usedTotal,adjustExpiry,manual,correct,importLegacy,config,day,expiry,snapshot,close,finance,transaction,balance(account){return round(snapshot().batches.filter(b=>b.account===account).reduce((n,b)=>n+b.left,0))},nearest(account){return snapshot().batches.filter(b=>b.account===account&&b.left>0&&b.expiry).sort((a,b)=>a.expiry.localeCompare(b.expiry))[0]?.expiry||null}};
})(globalThis);
