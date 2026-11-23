import templates from './templates.json';
import './styles.css';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const parse=s=>new DOMParser().parseFromString(s,'text/html');
const docs=Object.fromEntries(Object.entries(templates).map(([k,v])=>[k,parse(v)]));
const embeddedList=new URLSearchParams(location.search).get('embed')==='list';
const embeddedSettings=new URLSearchParams(location.search).get('embed')==='settings';
if(embeddedSettings||embeddedList)document.body.classList.add('embedded-points-settings');
function settingsDirectory(){try{return embeddedSettings&&parent.bookingBridge?parent.bookingBridge.directory():state.accounts}catch{return state.accounts}}
const keys=['manage','expiring','records','exchanges','detail','company','settings'];
const attr='data-v-2df0b291';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number((n/10000).toFixed(4)).toLocaleString('en-US',{maximumFractionDigits:4});
const stamp=()=>new Date().toLocaleString('sv-SE');
const seed={accounts:[{id:'QQ1',name:'好好',hall:'1F',balance:600,used:0,expired:0,total:600},{id:'QQ123',name:'xx',hall:'1F',balance:400,used:0,expired:0,total:400},{id:'QQ168',name:'111',hall:'—',balance:0,used:0,expired:0,total:0},{id:'DEMO001',name:'演示客户甲',hall:'3H',balance:0,used:0,expired:0,total:0},{id:'DEMO002',name:'演示客户乙',hall:'3H',balance:0,used:0,expired:0,total:0}],batches:[['QQ1',300,'2026-10-20 13:13:10'],['QQ1',300,'2026-10-20 13:41:09'],['QQ123',400,'2026-10-21 16:21:41']].map(([id,n,time])=>({id,amount:n,left:n,used:0,expired:0,time,expiry:time.replace('2026','2027'),source:'收工自动'})),records:[],exchanges:[],company:{balance:0,used:0,total:0,records:[]},settings:{ratio:1000,days:90,remark:'',time:'2026-11-19 05:57:29'}};
let state;try{state=JSON.parse(localStorage.getItem('points-clone-v1'))||structuredClone(seed)}catch{state=structuredClone(seed)}
const currencies=['USDT-TRC','USDT-ERC','港币(越)','人民币','美金(越)','越南盾'];
state.settings.rates ??= Object.fromEntries(currencies.map(c=>[c,1]));
state.settings.threshold ??= state.settings.ratio/10000;
state.accountExpiry ??= {};
state.settingsLogs ??= [];
let settingsTab='config';
let settingsLogFilter={account:'',type:'',field:'',start:'',end:''};
let current='manage',selected=null,query='',filter='',editing=false,modalKind=null,modalAccount=null;
const save=()=>localStorage.setItem('points-clone-v1',JSON.stringify(state));
function toast(message){$('.local-toast')?.remove();let t=document.createElement('div');t.className='local-toast';t.role='status';t.textContent=message;document.body.append(t);setTimeout(()=>t.remove(),3000)}
function account(id){return (embeddedSettings?settingsDirectory():state.accounts).find(a=>a.id===id)||state.accounts.find(a=>a.id===id)}
function tagNew(root){$$('*',root).forEach(e=>e.setAttribute(attr,''))}
function cells(vals){return '<tr '+attr+'>'+vals.map(v=>`<td ${attr}>${v}</td>`).join('')+'</tr>'}
function tableRows(table,rows,empty='暂无记录'){let b=$('tbody',table);b.innerHTML=rows.length?rows.join(''):`<tr><td class="loading" colspan="${$$('th',table).length}">${empty}</td></tr>`;tagNew(b)}
function dateDays(b){return b.expiry?Math.ceil((new Date(b.expiry.replace(' ','T'))-new Date())/86400000):Infinity}
function batchRows(list){return list.map(b=>cells([esc(b.time),b.expiry||'永久',Number.isFinite(dateDays(b))?`${Math.max(0,dateDays(b))} 天`:'永久',fmt(b.amount),fmt(b.left),fmt(b.used),fmt(b.expired),esc(b.source),b.expired?'已过期':b.left?'有效':'已用完']))}
function exchangeRows(list,detail=false){return list.map(x=>cells(detail?[x.no,esc(x.time),esc(x.type),esc(x.item),fmt(x.amount),esc(x.cash||'—'),'已完成','演示操作员']:[x.no,esc(x.time),esc(x.id),esc(account(x.id).name),esc(x.type),esc(x.item),fmt(x.amount),esc(x.cash||'—'),'已完成','演示操作员']))}
function bindSearch(input,onPick,directory=state.accounts){input.autocomplete='off';input.addEventListener('input',()=>{modalAccount=null;input.parentElement.querySelector('.point-options')?.remove();const term=input.value.trim().toLowerCase();if(!term)return;const box=document.createElement('div');box.className='point-options';box.role='listbox';let list=directory.filter(a=>(a.id+' '+a.name).toLowerCase().includes(term));if(!list.length){box.textContent='未找到匹配户口';box.style.padding='12px'}list.forEach(a=>{const b=document.createElement('button');b.type='button';b.textContent=a.id+' '+a.name;b.onclick=()=>{input.value=a.id+' '+a.name;box.remove();onPick(a.id)};box.append(b)});input.parentElement.style.position='relative';input.parentElement.append(box)})}
function navigate(key){current=key;query='';filter='';editing=false;render();history.replaceState(null,'','?tab='+key)}
function render(){
 if(embeddedList){document.getElementById('root').innerHTML=docs.settings.querySelector('#app').outerHTML;renderPointsList();return;}
 const key=current==='manage'?'manage-desktop':current==='settings'&&editing?'settings-edit':current==='detail'&&selected?'account-search':current;
 document.getElementById('root').innerHTML=docs[key].querySelector('#app').outerHTML;
 $$('input[type=password]').forEach(e=>{e.value='';e.autocomplete='new-password'});
 $('.version-tag').textContent='本地演示 · 数据仅保存在本机';
 $$('aside button').forEach(b=>b.onclick=()=>b.textContent.includes('积分管理')?navigate('manage'):b.textContent.includes('预定管理')?openReservations():toast('本次原型包含积分与预订管理模块'));
 $$('.tabs button').forEach(b=>b.onclick=()=>navigate('manage'));
 $$('.sub-tab').forEach((e,i)=>{e.classList.toggle('active',keys[i]===current);e.role='tab';e.tabIndex=0;e.setAttribute('aria-selected',keys[i]===current);e.onclick=()=>navigate(keys[i]);e.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' ')navigate(keys[i])}});
 $$('.page-head button').forEach((b,i)=>b.onclick=()=>i===3?cleanExpired():openModal(['add','deduct','exchange'][i]));
 const search=$('main .card-body input:not([type])');
 if(['manage','expiring','records','exchanges'].includes(current)){
  if(search)search.value=query;
  let select=$('main select');if(select){select.value=filter||(current==='expiring'?'30':'')}
  $$('main button').filter(b=>['筛选','重置'].includes(b.textContent.trim())).forEach(b=>b.onclick=()=>{if(b.textContent.trim()==='重置'){query='';filter=''}else{query=search?.value.trim()||'';filter=select?.value||''}render()});
  if(search)search.onkeydown=e=>{if(e.key==='Enter'){query=search.value.trim();filter=select?.value||'';render()}};
 }
 if(current==='manage'){
  const list=state.accounts.filter(a=>(a.total||a.balance||a.used||a.expired)&&(!query||(a.id+' '+a.name).toLowerCase().includes(query.toLowerCase())));
  const tbody=$('main tbody'),rowTemplate=$('tbody tr',docs['manage-desktop']);tbody.innerHTML='';
  list.forEach(a=>{let row=rowTemplate.cloneNode(true),td=$$('td',row);[a.id,a.name,a.hall,fmt(a.balance),fmt(a.used),fmt(a.expired),fmt(a.total)].forEach((x,i)=>td[i].textContent=x);$$('button',row).forEach((b,i)=>b.onclick=()=>{selected=a.id;i===0?navigate('detail'):openModal(i===1?'add':'exchange',a.id)});tbody.append(row)});
  if(!list.length)tableRows($('main table'),[],'暂无积分记录');$('main .card-body strong').textContent=list.length;
 }
 if(current==='records'){
  const base=$$('tbody tr',docs.records).map(r=>r.outerHTML);
  const rows=state.records.filter(r=>(!filter||r.kind===filter)&&(!query||(r.id+' '+account(r.id)?.name+' 演示操作员').includes(query))).map(r=>cells([esc(r.time),esc(r.id),esc(account(r.id)?.name),r.label,`${r.delta>0?'+':''}${fmt(r.delta)}`,esc(r.type||'-'),esc(r.reason),'演示操作员',fmt(r.after),r.expiry||'-']));
  tableRows($('main table'),rows.concat(base.filter(s=>(!filter||filter==='add')&&(!query||parse(s).body.textContent.includes(query)))));
 }
 if(current==='exchanges')tableRows($('main table'),exchangeRows(state.exchanges.filter(x=>(!filter||filter==='completed')&&(!query||(x.no+x.id+account(x.id).name+x.item).includes(query)))));
 if(current==='expiring'){
  const list=state.batches.filter(b=>b.left>0&&dateDays(b)>=0&&dateDays(b)<=Number(filter||30)&&(!query||(b.id+account(b.id)?.name).includes(query)));
  tableRows($('main table'),list.map(b=>cells([esc(b.id),esc(account(b.id)?.name),esc(b.time),esc(b.expiry),dateDays(b)+' 天',fmt(b.left),fmt(b.used),fmt(b.amount),esc(b.source),`<button class="link" data-detail="${esc(b.id)}">查看详情</button>`])),'暂无即将到期的积分');
  const strong=$('main .card-body strong');if(strong)strong.textContent=list.length;$$('[data-detail]').forEach(b=>b.onclick=()=>{selected=b.dataset.detail;navigate('detail')});
 }
 if(current==='detail'){
  const input=$('main input');if(selected){input.value=selected+' '+account(selected).name;const a=account(selected);$$('.stat b').forEach((e,i)=>e.textContent=fmt([a.balance,a.used,a.expired,a.total][i]));const tables=$$('main table');tableRows(tables[0],batchRows(state.batches.filter(b=>b.id===selected)));tableRows(tables[1],exchangeRows(state.exchanges.filter(x=>x.id===selected),true),'暂无兑换记录')}
  bindSearch(input,id=>{selected=id;render()});
 }
 if(current==='company'){
  $$('.stat b').forEach((e,i)=>e.textContent=fmt([state.company.balance,state.company.used,state.company.total][i]));
  $$('main button').filter(b=>['公司赠送/垫款','客户还款入库','手动调整'].includes(b.textContent.trim())).forEach((b,i)=>b.onclick=()=>openModal(['gift','repay','adjust'][i]));
  tableRows($('main table'),state.company.records.map(r=>cells([esc(r.time),esc(r.label),fmt(r.delta),esc(r.id||'—'),esc(r.reason),'演示操作员'])));
 }
 if(current==='settings')renderSettings();
 $$('label').forEach((l,i)=>{let input=l.parentElement.querySelector('input,textarea,select');if(input&&!input.id){input.id='field-'+i;l.htmlFor=input.id}});
}
function error(msg,root=$('.dialogbody')||$('main .card-body')){root.querySelector('.point-error')?.remove();let box=document.createElement('div');box.className='point-error';box.role='alert';box.textContent=msg;root.prepend(box)}
function auth(root){let p=$$('input[type=password]',root);if(p.some(e=>!e.value))return '请填写操作人和确认人密码';if(p[0].value===p[1].value)return '操作人密码与确认人密码不可相同';return ''}
function openModal(kind,id=null){modalKind=kind;modalAccount=id;let overlay=$('.overlay',docs[kind]).cloneNode(true);$('main').append(overlay);overlay.role='dialog';overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',$('.dialoghead',overlay).textContent);$$('input',overlay).forEach(e=>{if(e.type==='number')e.value='0';if(e.type==='password'){e.value='';e.autocomplete='new-password'}});let input=$('input[placeholder="输入户口号或姓名搜索"]',overlay);if(input){if(id)input.value=id+' '+account(id).name;bindSearch(input,selectedId=>{modalAccount=selectedId;updateModal(overlay)})}$$('.dialogfoot button',overlay).forEach((b,i)=>b.onclick=()=>i===0?overlay.remove():submitModal(overlay));updateModal(overlay);$$('label',overlay).forEach((l,i)=>{let el=l.parentElement.querySelector('input,select,textarea');if(el){el.id='modal-field-'+i;l.htmlFor=el.id}});input?.focus()}
function updateModal(root){if(modalKind==='exchange'){let strong=$('strong',root);if(strong)strong.textContent=modalAccount?modalAccount+' '+account(modalAccount).name:'';let label=$$('label',root).find(e=>e.textContent==='当前可用积分');if(label)label.nextElementSibling.textContent=fmt(modalAccount?account(modalAccount).balance:0)}}
function addBatch(id,n,source){let d=new Date();const days=state.accountExpiry[id]??state.settings.days;d.setDate(d.getDate()+days);let expiry=days?d.toLocaleString('sv-SE'):null;state.batches.push({id,amount:n,left:n,used:0,expired:0,time:stamp(),expiry,source});return expiry}
function spend(id,n){let left=n;state.batches.filter(b=>b.id===id&&b.left>0).sort((a,b)=>(a.expiry||'9999').localeCompare(b.expiry||'9999')).forEach(b=>{let use=Math.min(left,b.left);b.left-=use;b.used+=use;left-=use});}
function submitModal(root){
 const kind=modalKind,id=modalAccount,raw=$('input[type=number]',root).value,n=/^\d+(\.\d{1,4})?$/.test(raw)?Number(raw.split('.')[0])*10000+Number((raw.split('.')[1]||'').padEnd(4,'0')):NaN;
 const personal=['add','deduct','exchange'].includes(kind);
 if(personal&&!id)return error('请选择户口');
 if(!/^\d+(\.\d{1,4})?$/.test(raw)||!Number.isSafeInteger(n)||n<=0)return error('积分数量必须大于0，且最多四位小数');
 const reason=$('textarea',root)?.value.trim();let item,typ,cash;
 if(kind==='exchange'){typ=$('select',root).value;item=$('input[placeholder="例如：HKD 1000、餐饮礼券"]',root).value.trim();cash=$$('input[type=number]',root)[1].value;if(!typ)return error('请选择兑换类型');if(!item)return error('请填写物品 / 说明');if(cash&&(!/^\d+(\.\d{1,4})?$/.test(cash)||Number(cash)<0))return error('现金价值必须为非负数字，且最多四位小数')}
 else if(!reason)return error('请填写原因');
 const authError=auth(root);if(authError)return error(authError);
 if(kind==='exchange'&&n>account(id).balance)return error('可用积分不足');
 if(kind==='deduct'&&!$('input[type=checkbox]',root).checked&&n>account(id).balance)return error('可用积分不足，可选择允许扣至负数');
 if(kind==='gift'&&n>state.company.balance)return error('公司可用积分不足');
 const labels={add:'新增',deduct:'扣减',exchange:'兑换',gift:'公司赠送/垫款',repay:'客户还款入库',adjust:'手动调整'};
 if(personal){let a=account(id),delta=kind==='add'?n:-n;a.balance+=delta;let expiry=null;if(kind==='add'){a.total+=n;expiry=addBatch(id,n,'手动新增')}else{a.used+=n;spend(id,n)}state.records.unshift({kind,label:labels[kind],id,delta,after:a.balance,time:stamp(),reason:reason||item,type:typ,expiry});if(kind==='exchange')state.exchanges.unshift({no:'EX'+Date.now(),time:stamp(),id,type:typ,item,amount:n,cash,status:'completed'})}
 else {let delta=kind==='gift'?-n:n;state.company.balance+=delta;if(delta>0)state.company.total+=n;else state.company.used+=n;state.company.records.unshift({time:stamp(),label:labels[kind],id,delta,reason});if(kind==='gift'&&id){let a=account(id);a.balance+=n;a.total+=n;let expiry=addBatch(id,n,'公司赠送');state.records.unshift({kind:'add',label:'新增',id,delta:n,after:a.balance,time:stamp(),reason,expiry})}}
 save();render();toast('操作成功（本地演示）');
}
function renderSettings(){
 const host=$('main .card-body'),s=state.settings;
 const daysText=d=>d===0?'永久':d+' 天';
 host.innerHTML=`<section class="points-settings"><h2>积分设置</h2><nav class="settings-nav">${[['config','积分设置'],['accounts','户口期限设置'],['logs','设置操作记录']].map(([k,t])=>`<button class="${settingsTab===k?'active':''}" data-settings-tab="${k}">${t}</button>`).join('')}</nav><div id="settings-panel"></div></section>`;
 const panel=$('#settings-panel');
 if(settingsTab==='config')panel.innerHTML=`<form id="global-settings"><div class="rate-grid"><div>币别</div><div>港币(越)（换算汇率）</div>${currencies.map((c,i)=>`<label for="rate-${i}">1 ${c}　=</label><input id="rate-${i}" data-rate="${c}" aria-label="${c}换算汇率" inputmode="decimal" value="${Number(s.rates[c]).toFixed(8)}" ${i===2?'disabled':''}>`).join('')}</div><div class="setting-line"><label for="threshold">积分获取条件 *</label><input id="threshold" value="${s.threshold}" inputmode="decimal"><span>万 港币(越)转码值 = 1 点积分</span></div><p class="settings-note">该次收工转码值依上述币别汇率换算后，当达到积分获取条件，即可兑换 1 点。<br>积分获取条件输入 0 则不计算积分。</p><div class="setting-line"><label for="default-days">默认积分使用期限 *</label><input id="default-days" value="${s.days}" inputmode="numeric"><span>天（0 = 永久）</span></div><p class="muted">户口专属期限优先于默认期限；设置修改只影响之后新增的积分，已有积分到期日不变。</p>${settingsAuth()}<button class="btn primary" type="submit">保存积分设置</button></form>`;
 if(settingsTab==='accounts')panel.innerHTML=`<p class="muted">为不同户口设置积分使用期限。未单独设置的户口使用默认期限：${daysText(s.days)}。</p><form id="account-settings"><div class="expiry-form-grid"><div class="expiry-field"><label for="expiry-account">户口 *</label><div class="expiry-search"><input id="expiry-account" placeholder="输入户口号检索" autocomplete="off"><div id="expiry-selection" class="muted" aria-live="polite">输入户口号后，从检索结果中选择</div></div></div><div class="expiry-field"><label for="expiry-days">专属期限 *</label><div class="expiry-days-input"><input id="expiry-days" placeholder="请输入天数" inputmode="numeric"><span>天</span></div><p class="muted">填写 0 表示永久有效</p></div></div>${settingsAuth()}<div class="setting-actions"><button class="btn primary" type="submit">保存户口期限</button><button class="btn" id="inherit-expiry" type="button">恢复默认期限</button></div></form><form id="expiry-list-filter" class="expiry-list-filter"><label for="expiry-list-account">户口号<input id="expiry-list-account" placeholder="输入户口号查询" autocomplete="off"></label><button class="btn primary" type="submit">查询</button><button class="btn" id="expiry-list-reset" type="button">重置</button><span id="expiry-list-count" class="muted" aria-live="polite"></span></form><div class="table-wrap"><table id="expiry-list-table"><thead><tr><th>户口号</th><th>户名</th><th>期限来源</th><th>当前使用期限</th></tr></thead><tbody>${settingsDirectory().map(a=>cells([esc(a.id),esc(a.name),a.id in state.accountExpiry?'户口专属':'默认设置',daysText(state.accountExpiry[a.id]??s.days)])).join('')}</tbody></table></div>`;
 if(settingsTab==='logs'){
 const f=settingsLogFilter,types=[...new Set(state.settingsLogs.map(l=>l.type))],fields=[...new Set(state.settingsLogs.map(l=>l.field))];
 const logs=state.settingsLogs.filter(l=>(!f.account||l.account.toLowerCase().includes(f.account.toLowerCase()))&&(!f.type||l.type===f.type)&&(!f.field||l.field===f.field)&&(!f.start||l.time>=f.start.replace('T',' '))&&(!f.end||l.time<=f.end.replace('T',' ')+':59'));
 panel.innerHTML=`<form id="settings-log-query" class="settings-log-query"><label>户口号<input name="account" placeholder="输入户口号或全部户口" value="${esc(f.account)}"></label><label>操作类型<select name="type"><option value="">全部</option>${types.map(t=>`<option value="${esc(t)}" ${f.type===t?'selected':''}>${esc(t)}</option>`).join('')}</select></label><label>变更字段<select name="field"><option value="">全部</option>${fields.map(t=>`<option value="${esc(t)}" ${f.field===t?'selected':''}>${esc(t)}</option>`).join('')}</select></label><label>开始时间<input name="start" type="datetime-local" value="${esc(f.start)}"></label><label>结束时间<input name="end" type="datetime-local" value="${esc(f.end)}"></label><button class="btn primary" type="submit">查询</button><button class="btn" type="button" id="settings-log-reset">重置</button><p id="settings-log-error" role="alert"></p></form><p class="muted">共 ${logs.length} 条操作记录</p><div class="table-wrap"><table><thead><tr><th>操作时间</th><th>操作类型</th><th>适用户口</th><th>变更字段</th><th>修改前</th><th>修改后</th><th>操作人</th><th>确认人</th></tr></thead><tbody>${logs.length?logs.map(l=>cells([esc(l.time),esc(l.type),esc(l.account),esc(l.field),esc(l.before),esc(l.after),'演示操作员','演示确认人'])).join(''):'<tr><td colspan="8">暂无符合条件的操作记录</td></tr>'}</tbody></table></div>`;
 $('#settings-log-query').onsubmit=e=>{e.preventDefault();const next=Object.fromEntries(new FormData(e.target));next.account=next.account.trim();if(next.start&&next.end&&next.start>next.end){$('#settings-log-error').textContent='开始时间不能晚于结束时间';return}settingsLogFilter=next;render()};
 $('#settings-log-reset').onclick=()=>{settingsLogFilter={account:'',type:'',field:'',start:'',end:''};render()};
 }

 tagNew(host);
 $$('[data-settings-tab]').forEach(b=>b.onclick=()=>{settingsTab=b.dataset.settingsTab;render()});
 $('#global-settings')?.addEventListener('submit',e=>{e.preventDefault();saveSettings()});
 $('#account-settings')?.addEventListener('submit',e=>{e.preventDefault();saveExpiry(false)});
 $('#inherit-expiry')?.addEventListener('click',()=>saveExpiry(true));
 const refreshExpiryList=()=>{const q=$('#expiry-list-account').value.trim().toLowerCase(),rows=settingsDirectory().filter(a=>a.id.toLowerCase().includes(q));$('#expiry-list-table tbody').innerHTML=rows.map(a=>cells([esc(a.id),esc(a.name),a.id in state.accountExpiry?'户口专属':'默认设置',daysText(state.accountExpiry[a.id]??s.days)])).join('')||'<tr><td colspan="4" class="empty">未找到匹配户口</td></tr>';$('#expiry-list-count').textContent='共 '+rows.length+' 个户口'};
 $('#expiry-list-filter')?.addEventListener('submit',e=>{e.preventDefault();refreshExpiryList()});
 $('#expiry-list-reset')?.addEventListener('click',()=>{$('#expiry-list-account').value='';refreshExpiryList()});
 if($('#expiry-list-filter'))refreshExpiryList();
 const expiryInput=$('#expiry-account');
 if(expiryInput){
  expiryInput.addEventListener('input',()=>{delete expiryInput.dataset.accountId;$('#expiry-days').value='';$('#expiry-selection').textContent='请从检索结果中选择户口'});
  bindSearch(expiryInput,id=>{expiryInput.dataset.accountId=id;$('#expiry-days').value=state.accountExpiry[id]??s.days;$('#expiry-selection').textContent=`已选择：${id} · ${account(id).name}（${id in state.accountExpiry?'专属期限':'默认期限'}）`},settingsDirectory());
 }

}
function settingsAuth(){return `<div class="settings-auth"><div><label for="settings-op">操作人密码 *</label><input id="settings-op" type="password" autocomplete="new-password"></div><div><label for="settings-confirm">确认人密码 *</label><input id="settings-confirm" type="password" autocomplete="new-password"></div></div><p class="muted">本地演示：填写两组不同的非空密码，不会保存密码。</p>`}
function logSettings(type,account,field,before,after){state.settingsLogs.unshift({time:stamp(),type,account,field,before:String(before),after:String(after)})}
function saveSettings(){
 const rates={};for(const input of $$('[data-rate]')){if(!/^\d+(\.\d{1,8})?$/.test(input.value)||!Number.isFinite(Number(input.value))||Number(input.value)<=0)return error('换算汇率必须大于0，且最多八位小数');rates[input.dataset.rate]=Number(input.value)}
 const raw=$('#threshold').value,daysRaw=$('#default-days').value;
 if(!/^\d+(\.\d{1,4})?$/.test(raw)||!Number.isFinite(Number(raw)))return error('积分获取条件必须为非负数字，且最多四位小数');
 if(!/^\d+$/.test(daysRaw)||Number(daysRaw)>36500)return error('使用期限须为0至36500的整数天数');
 const err=auth($('main'));if(err)return error(err);
 let changed=false;const record=(field,before,after)=>{if(before!==after){logSettings('全局设置','全部户口',field,before,after);changed=true}};
 currencies.forEach(c=>record(c+'换算汇率',state.settings.rates[c],rates[c]));record('积分获取条件（万/点）',state.settings.threshold,Number(raw));record('默认使用期限（天）',state.settings.days,Number(daysRaw));
 if(!changed)return toast('设置未发生变化');
 Object.assign(state.settings,{rates,threshold:Number(raw),ratio:Number(raw)*10000,days:Number(daysRaw),time:stamp()});save();render();toast('积分设置已保存');
}
function saveExpiry(inherit){const id=$('#expiry-account').dataset.accountId,raw=$('#expiry-days').value;if(!id)return error('请选择户口');if(!inherit&&(!/^\d+$/.test(raw)||Number(raw)>36500))return error('使用期限须为0至36500的整数天数');const err=auth($('main'));if(err)return error(err);const before=id in state.accountExpiry?state.accountExpiry[id]+' 天（专属）':'默认期限';if(inherit){if(!(id in state.accountExpiry))return toast('该户口已使用默认期限');delete state.accountExpiry[id]}else{if(state.accountExpiry[id]===Number(raw))return toast('设置未发生变化');state.accountExpiry[id]=Number(raw)}logSettings(inherit?'恢复默认':'户口期限',id,'积分使用期限',before,inherit?'默认期限':raw+' 天（专属）');save();render();toast('户口期限已保存')}
function cleanExpired(){let list=state.batches.filter(b=>b.left>0&&b.expiry&&new Date(b.expiry.replace(' ','T'))<=new Date());if(!list.length)return toast('暂无已到期积分');if(!confirm(`将清理 ${list.length} 个已到期批次，仅影响本地演示数据。`))return;list.forEach(b=>{let a=account(b.id),n=b.left;b.left=0;b.expired+=n;a.balance-=n;a.expired+=n;state.records.unshift({kind:'expired',label:'过期',id:b.id,delta:-n,after:a.balance,time:stamp(),reason:'清理过期积分'})});save();render();toast('过期积分已清理')}
let pointsListTab='acquire',pointsListQuery={no:'',account:'',start:'',end:''};
function pointsListRows(){const local=pointsListTab==='acquire'?state.batches.map((b,i)=>({no:b.no||'POINT-BATCH-'+String(i+1).padStart(6,'0'),account:b.id,amount:b.amount/10000,used:b.used/10000,left:b.left/10000,status:b.expired||dateDays(b)<0?'已过期':b.left?'使用中':'已用完',time:b.time,expiry:b.expiry||'永久',note:b.source})):pointsListTab==='exchange'?state.exchanges.map(x=>({no:x.no,account:x.id,amount:x.amount/10000,time:x.time,status:'已完成',note:[x.type,x.item].filter(Boolean).join(' / ')})):state.records.map((r,i)=>({no:r.no||'POINT-LOG-'+String(i+1).padStart(6,'0'),account:r.id,amount:r.delta/10000,time:r.time,status:r.label,note:r.reason||r.type||'—'}));let linked=[];try{linked=parent.bookingBridge?.pointsRecords?.()||[]}catch{}if(pointsListTab!=='acquire')for(const r of linked){if(pointsListTab==='exchange'&&Number(r.amount)>=0)continue;local.push({no:r.no,account:r.account,amount:pointsListTab==='exchange'?Math.abs(Number(r.amount)):Number(r.amount),time:r.time,status:pointsListTab==='exchange'?'已完成':r.method,note:r.method,operator:r.operator,confirmer:r.confirmer})}return local.sort((a,b)=>String(b.time).localeCompare(String(a.time)))}
function renderPointsList(){const host=$('main .card-body'),q=pointsListQuery,rows=pointsListRows().filter(r=>(!q.no||r.no.toLowerCase().includes(q.no.toLowerCase()))&&(!q.account||r.account.toLowerCase().includes(q.account.toLowerCase()))&&(!q.start||r.time.slice(0,10)>=q.start)&&(!q.end||r.time.slice(0,10)<=q.end));const headers=pointsListTab==='acquire'?['序号','单号','户口号','获取积分（点）','已兑换积分（点）','剩余积分（点）','状态','创建时间','操作']:['序号','单号','户口号',pointsListTab==='exchange'?'兑换积分（点）':'变动积分（点）','业务类型／状态','创建时间','操作'];const n=v=>Number(v).toLocaleString('en-US',{maximumFractionDigits:4});host.innerHTML=`<section class="points-settings"><h2>积分列表</h2><nav class="settings-nav">${[['acquire','获取列表'],['exchange','兑换列表'],['flow','积分流水']].map(([k,v])=>`<button data-points-list-tab="${k}" class="${k===pointsListTab?'active':''}">${v}</button>`).join('')}</nav><form id="points-list-search" class="expiry-list-filter"><label>单号<input name="no" value="${esc(q.no)}" placeholder="输入单号"></label><label>户口号<input name="account" value="${esc(q.account)}" placeholder="输入户口号"></label><label>创建日期起<input name="start" type="date" value="${esc(q.start)}"></label><label>至<input name="end" type="date" value="${esc(q.end)}"></label><button class="btn primary">查询</button><button class="btn" type="button" id="points-list-reset">重置</button></form><p class="muted">共 ${rows.length} 笔 · 积分单位：点</p><div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r,i)=>cells([i+1,esc(r.no),esc(r.account),n(r.amount),...(pointsListTab==='acquire'?[n(r.used),n(r.left)]:[]),esc(r.status),esc(r.time),`<button class="btn" data-point-row="${i}">详情</button>`])).join('')||`<tr><td colspan="${headers.length}">暂无匹配记录</td></tr>`}</tbody></table></div></section>`;$$('[data-points-list-tab]').forEach(b=>b.onclick=()=>{pointsListTab=b.dataset.pointsListTab;renderPointsList()});$('#points-list-search').onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target));if(v.start&&v.end&&v.start>v.end)return toast('开始日期不能晚于结束日期');pointsListQuery=Object.fromEntries(Object.entries(v).map(([k,v])=>[k,v.trim()]));renderPointsList()};$('#points-list-reset').onclick=()=>{pointsListQuery={no:'',account:'',start:'',end:''};renderPointsList()};$$('[data-point-row]').forEach(b=>b.onclick=()=>{const r=rows[Number(b.dataset.pointRow)],dialog=document.createElement('dialog');dialog.className='points-list-detail';dialog.setAttribute('aria-labelledby','points-detail-title');dialog.innerHTML=`<div class="points-detail-head"><h2 id="points-detail-title">积分记录详情</h2><button type="button" class="points-detail-close" aria-label="关闭详情">×</button></div><div class="points-detail-body"><dl>${[['单号',r.no],['户口号',r.account],['积分（点）',n(r.amount)],...(pointsListTab==='acquire'?[['已兑换（点）',n(r.used)],['剩余（点）',n(r.left)],['到期时间',r.expiry]]:[]),['状态／业务',r.status],['创建时间',r.time],['说明',r.note||'—']].map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div><div class="points-detail-foot"><button type="button" class="points-detail-done">关闭</button></div>`;document.body.append(dialog);dialog.querySelectorAll('button').forEach(b=>b.onclick=()=>dialog.close());dialog.onclose=()=>dialog.remove();dialog.showModal()});}

document.addEventListener('keydown',e=>{if(e.key==='Escape')$('.overlay')?.remove()});
const initial=new URLSearchParams(location.search).get('tab');if(keys.includes(initial))current=initial;if(embeddedSettings)current='settings';render();

function openReservations(){document.querySelector("main").innerHTML=`<iframe title="消费管理 · 预订管理" src="./booking.html" style="width:100%;height:calc(100vh - 160px);min-height:720px;border:0"></iframe>`;document.querySelector("header h1").textContent="消费管理 · 预订管理";}

// Keep action columns accessible while horizontally scrolling any list.
(()=>{let queued=false;function pinActions(){queued=false;document.querySelectorAll('table').forEach(table=>{const header=table.tHead?.rows[table.tHead.rows.length-1]||table.querySelector('tr');if(!header)return;const cells=[...header.cells],index=cells.findIndex(cell=>/^(操作|操作栏)$/.test(cell.textContent.trim()));if(index<0)return;table.classList.add('fixed-actions-table');for(const row of table.rows){const cell=row.cells[index];if(cell&&cell.colSpan===1&&row.cells.length===cells.length)cell.classList.add('fixed-action-cell');}})}new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(pinActions)}}).observe(document.body,{childList:true,subtree:true});pinActions();})();
