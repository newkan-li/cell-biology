/* 生成考点证据表 data/keypoints.js
   证据：802真题kp + hotexp高频实验 + outline提纲分层 + 题库kp密度 + recent热点
   用法：node _tools/gen_keypoints.js */
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
function load(file){const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(ROOT,file),'utf8'),ctx);return ctx.window;}
const ids=['ch01','ch02','ch03','ch04','ch05','ch06','ch07','ch08','ch09','ch10','ch11','ch12','ch13','tb03','tb06','tb11','tb12','tb13','tb15','tb17'];
const z=load('data/802.js').ZT802.items||[];
const hot=load('data/hotexp.js').HOTEXP||[];
const outline=load('data/outline.js').OUTLINE||[];
const recent=(load('data/recent.js').RECENT||{}).items||[];
const pptA=JSON.parse(fs.readFileSync('/tmp/cell4/ppttext.json','utf8'));
const pptB=JSON.parse(fs.readFileSync('/tmp/cell4/pdftext.json','utf8'));
const jyqText=fs.readFileSync('/tmp/cell4/jyq.txt','utf8');
function normKey(x){return String(x||'').replace(/p\d+[^ ]*/gi,'').replace(/[^\u4e00-\u9fa5A-Za-z0-9]+/g,'').toLowerCase();}
function countIn(text,needle){if(!needle||needle.length<3)return 0;return text.split(needle).length-1;}
function titleNeedles(title){const t=normKey(title);const arr=[];if(t.length>=6&&t.length<=40)arr.push(t);String(title||'').replace(/[（(].*?[)）]/g,' ').split(/[\s、，,；;：:·\/\-]+/).forEach(x=>{const n=normKey(x);if(n.length>=4&&n.length<=20)arr.push(n)});return [...new Set(arr)].slice(0,8);}
const pptNorm={};['ch01','ch02','ch03','ch04','ch05'].forEach(ch=>pptNorm[ch]=normKey(pptA[ch]||''));['ch06','ch07','ch08','ch09','ch10','ch11','ch12','ch13'].forEach(ch=>pptNorm[ch]=normKey(pptB[ch]||''));
const jyqNorm=normKey(jyqText);
const zBy={},hotBy={},hotGenBy={},outBy={},recentBy={};
z.forEach(x=>{if(x.kp)zBy[x.kp]=(zBy[x.kp]||0)+1});
hot.forEach(x=>{if(!x.kp)return;if(x.freq==='高频')hotBy[x.kp]=(hotBy[x.kp]||0)+1;else hotGenBy[x.kp]=(hotGenBy[x.kp]||0)+1;});
const rank={'必背':3,'常考':2,'了解':1};
outline.forEach(x=>{if(!x.kp)return;if(!outBy[x.kp]||rank[x.tier]>rank[outBy[x.kp]])outBy[x.kp]=x.tier;});
recent.forEach(x=>{if(x.kp)recentBy[x.kp]=(recentBy[x.kp]||0)+1;});
const bankBy={},bankTypes={};
const items=[];
for(const id of ids){
 let w;try{w=load('data/'+id+'.js')}catch(e){continue}
 const ch=w.CHAPTERS&&w.CHAPTERS[id];if(!ch)continue;
 (ch.modules||[]).forEach((m,mi)=>{
  (m.slides||[]).forEach((s,si)=>{
   const kp=id+'_s'+(m.i!=null?m.i:mi)+'_'+(s.i!=null?s.i:si);
   const zc=zBy[kp]||0,hc=hotBy[kp]||0,hg=hotGenBy[kp]||0,ot=outBy[kp]||'',rc=recentBy[kp]||0;
   // 题库密度
   let bc=0;
   ['mcq','judge','fill','short','calc','term'].forEach(k=>{(ch[k]||[]).forEach(q=>{if(q.kp===kp){bc++;bankTypes[kp]=bankTypes[kp]||{};bankTypes[kp][k]=(bankTypes[kp][k]||0)+1;}})});
   bankBy[kp]=bc;
   let tier='C';
   if(zc>=1||hc>0||ot==='必背')tier='S';
   else if(ot==='常考'||bc>=2||rc>0)tier='A';
   else if(bc>=1||hg>0||ot==='了解')tier='B';
   const title=(s.title||'').replace(/\s+/g,' ').trim()||m.name||kp;
   const page=s.page||'';
   const needles=titleNeedles(title);let pc=0,jc=0;
   needles.forEach(n=>{pc=Math.max(pc,countIn(pptNorm[id]||'',n));jc=Math.max(jc,countIn(jyqNorm,n));});
   items.push({ch:id,ctitle:ch.title||id,mod:m.name||'',kp,title,tier,z802:zc,hot:hc,hotGen:hg,outline:ot,bank:bc,types:bankTypes[kp]||{},recent:rc,ppt:pc,jyq:jc,page,link:id+'.html#s_'+kp});
  });
 });
}
// 只保留有证据的考点；教材每页都保留会过密
const keep=items.filter(x=>x.tier!=='C'||x.bank>0||x.z802>0||x.hot>0||x.outline||x.recent>0);
fs.writeFileSync(path.join(ROOT,'data','keypoints.js'),'window.KEYPOINTS='+JSON.stringify(keep)+';');
const c={};keep.forEach(x=>c[x.tier]=(c[x.tier]||0)+1);
console.log('考点条目:',keep.length,JSON.stringify(c));
console.log('S示例:',keep.filter(x=>x.tier==='S').slice(0,8).map(x=>x.kp+' '+x.title).join(' | '));
