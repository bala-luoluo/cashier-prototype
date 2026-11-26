const fs=require('fs'),vm=require('vm'); const html=fs.readFileSync('index.html','utf8');const nodes={};const el=id=>nodes[id]||= {value:'',innerHTML:'',textContent:'',style:{},dataset:{},classList:{toggle(){},add(){},remove(){},contains(){return false}},addEventListener(){},querySelectorAll(){return []},setAttribute(){},remove(){},scrollTo(){}};const document={head:{append(){}},createElement:()=>el("created"),getElementById:el,querySelector:el,querySelectorAll:()=>[],addEventListener(){},body:el('body')};const c=vm.createContext({document,window:{addEventListener(){},scrollTo(){}},console,localStorage:{getItem(){return null},setItem(){}},setTimeout(){},clearTimeout(){},queueMicrotask(){},TextDecoder,Uint8Array,atob,URL,Blob,requestAnimationFrame(){},MutationObserver:class {observe(){}}});for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)){try{vm.runInContext(m[1],c)}catch(e){console.log('INIT',e.stack.split('\n').slice(0,5).join('\n'))}}try{vm.runInContext("menu('系统设置')",c);console.log('TITLE',el('pageTitle').textContent,'BODY',el('main').innerHTML.slice(0,180))}catch(e){console.log(e.stack)}

const assert=require('assert');
assert.equal(el('pageTitle').textContent,'系统设置');
for(const title of ['最小泥码设置','分厅管理','汇率设置','预定类型'])assert(el('main').innerHTML.includes(title));
assert(vm.runInContext('Object.keys(systemFxRates).length>0',c));
vm.runInContext('restorePrototypeParent({minimumChipRules:{}});menu("系统设置")',c);
assert(vm.runInContext('minimumChipRules.mud===500n && minimumChipRules.cash===5n',c));
vm.runInContext('restorePrototypeParent({minimumChipRules:{mud:1000n,cash:10n,enabled:true}});workspaceTabActions["系统设置"]()',c);
assert(el('main').innerHTML.includes('0.1000'));
assert(vm.runInContext('minimumChipRules.enabled',c));
console.log('PASS fresh initialization, settings menu/tab rendering, empty legacy configuration recovery, preserved custom chip configuration');
