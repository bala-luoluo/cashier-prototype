// Booking transactions use the same local account registry and ledger as the cashier.
window.bookingBridge={
 companyPointsAccount(){const a=transitBindings['公司积分记账户口'];if(!a)return null;return {...a,balances:coins.map(currency=>{const b=settlementAccount(a.id,currency);return {currency,balance:b?Number(b.cash)/10000:null}})}},
 pointsConfig(){return Points.config()},
 pointsBalance(a){return Points.balance(a)},
 pointsExpiry(a){return Points.nearest(a)},
 pointsRecords(){return transitTransactions.filter(r=>r.kind==='points').map(r=>({...r}))},
 directory(){retainAccount();return [...accountRegistry.values()].map(s=>({id:s.account.code+s.account.number,name:s.account.name,hall:s.account.hall||'—',points:Points.balance(s.account.code+s.account.number)})).concat(Object.keys(companyFunds).map(id=>({id,name:'公司户',hall:id,points:0})))},
 binding(type){return transitBindings[type]||null},
 configure(){transitPage()},
 rate(from,to){return from===to?'1':systemFxRates[from+'|'+to+'|mul']||''},
 balance(acct,cur){const b=settlementAccount(acct,cur);return b?Number(b.cash-b.frozen)/10000:null},
 post(transaction){
  retainAccount();const moneyRows=transaction.money||[],pointRows=transaction.points||[],net=new Map(),pn=new Map(),exempt=new Map();
  for(const r of moneyRows){if(!Number.isSafeInteger(r.units))throw Error('金额超出支持范围');const k=r.account+'|'+r.currency;net.set(k,(net.get(k)||0)+r.units);if(r.balanceExempt&&r.units<0)exempt.set(k,(exempt.get(k)||0)-r.units)}
  for(const r of pointRows){if(!Number.isFinite(r.amount))throw Error('积分无效');if(r.place!=='积分池')pn.set(r.account,(pn.get(r.account)||0)+r.amount)}
  const tn=new Map();for(const r of transaction.till||[]){if(!Number.isSafeInteger(r.units))throw Error('银头金额无效');const k=r.hall+'|'+r.currency;tn.set(k,(tn.get(k)||0)+r.units)}for(const [k,n] of tn){const [h,c]=k.split('|'),i=sessionTillIndex(c);if(i<0||!companyFunds[h])throw Error('公司厅别或币种未配置');if(units(companyFunds[h][i])+BigInt(n+(net.get(k)||0)+(exempt.get(k)||0))<0n)throw Error('公司现金银头不足，无法退款')}
  const lookup=a=>[...accountRegistry.values()].find(s=>s.account.code+s.account.number===a)||(companyFunds[a]?{company:a,account:{name:'公司户'},balances:Object.fromEntries(coins.map(c=>[c,{cash:sessionTillIndex(c)>=0?units(companyFunds[a][sessionTillIndex(c)]):0n,frozen:0n}])),ledger:[]}:null);
  for(const [k,n] of net){const [acct,cur]=k.split('|'),s=lookup(acct),b=s?.company?s.balances[cur]:settlementAccount(acct,cur);if(!s||!b)throw Error('户口不存在：'+acct);if(n<0&&s.account.locked)throw Error('户口已冻结：'+acct);if(n<0&&b.cash-b.frozen+BigInt(n+(s.company?(tn.get(k)||0):0)+(exempt.get(k)||0))<0n&&!accountAllowsNegative(acct))throw Error(acct+' '+cur+' 可用余额不足');}
  for(const [acct,n] of pn){const customer=lookup(acct);if(!customer||customer.company)throw Error('请选择客户积分户口');if(n<0&&customer.account.locked)throw Error('户口已冻结');}
  if(Points.transaction(pointRows.map(r=>({...r,order:r.order||transaction.id,method:r.method||transaction.exchangeMethod,reason:r.reason||transaction.note})),transaction.pointKey)===false)throw Error('本次业务已处理，请刷新订单后查看');
  // All validation precedes writes. Record each leg, including payment reversals.
  for(const r of moneyRows){const s=lookup(r.account);s.balances[r.currency]||={cash:0n,stored:0n,frozen:0n};const beforeCash=s.balances[r.currency].cash;s.balances[r.currency].cash+=BigInt(r.units);if(s.company){const i=sessionTillIndex(r.currency);companyFunds[s.company][i]=fmt(s.balances[r.currency].cash);sessionTillLedger.push({no:transaction.id,company:s.company,cur:r.currency,before:{cash:beforeCash},after:{cash:s.balances[r.currency].cash},delta:{cash:BigInt(r.units)},type:'预订消费',note:transaction.note,time:now()})}const entry={no:'TX'+String(seq++).padStart(5,'0'),key:s.freezeAccountKey,account:r.account,name:s.account.name,type:'预订消费',coin:r.currency,amount:BigInt(r.units),balance:s.balances[r.currency].cash,remark:transaction.id+' · '+transaction.note,time:now()};s.ledger.unshift(entry);txnHistory.unshift(entry);const peer=recipients.find(x=>x.id===r.account);if(peer){peer.balances||={};peer.balances[r.currency]=s.balances[r.currency].cash}if(r.account===id()){balances=s.balances;ledger=s.ledger}}
  for(const r of moneyRows)transitTransactions.unshift({no:transaction.id,kind:'money',method:transaction.note,account:r.account,name:lookup(r.account).account.name,amount:fmt(BigInt(r.units)),from:r.units<0?r.account:'—',to:r.units>0?r.account:'—',delivery:transaction.hall,hall:transaction.hall,cur:r.currency,time:now(),operator:'admin',confirmer:'演示确认人'});
  for(const r of transaction.till||[]){const i=sessionTillIndex(r.currency),before={cash:units(companyFunds[r.hall][i])},after={cash:before.cash+BigInt(r.units)};companyFunds[r.hall][i]=fmt(after.cash);sessionTillLedger.push({no:transaction.id,company:r.hall,cur:r.currency,before,after,delta:{cash:BigInt(r.units)},type:'预订消费',note:transaction.note,time:now()})}
  retainAccount();savePrototypeState();return true;
 }
};
