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
const zBy={},hotBy={},hotGenBy={},outBy={},recentBy={};
z.forEach(x=>{if(x.kp)zBy[x.kp]=(zBy[x.kp]||0)+1});
hot.forEach(x=>{if(!x.kp)return;if(x.freq==='高频')hotBy[x.kp]=(hotBy[x.kp]||0)+1;else hotGenBy[x.kp]=(hotGenBy[x.kp]||0)+1;});
const rank={'必背':3,'常考':2,'了解':1};
outline.forEach(x=>{if(!x.kp)return;if(!outBy[x.kp]||rank[x.tier]>rank[outBy[x.kp]])outBy[x.kp]=x.tier;});
recent.forEach(x=>{if(x.kp)recentBy[x.kp]=(recentBy[x.kp]||0)+1;});
const bankBy={};
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
   ['mcq','judge','fill','short','calc','term'].forEach(k=>{(ch[k]||[]).forEach(q=>{if(q.kp===kp)bc++})});
   bankBy[kp]=bc;
   let tier='C';
   if(zc>=1||hc>0||ot==='必背')tier='S';
   else if(ot==='常考'||bc>=2||rc>0)tier='A';
   else if(bc>=1||hg>0||ot==='了解')tier='B';
   const title=(s.title||'').replace(/\s+/g,' ').trim()||m.name||kp;
   const page=s.page||'';
   items.push({ch:id,ctitle:ch.title||id,mod:m.name||'',kp,title,tier,z802:zc,hot:hc,hotGen:hg,outline:ot,bank:bc,recent:rc,page,link:id+'.html#s_'+kp});
  });
 });
}
// 只保留有证据的考点；教材每页都保留会过密
const keep=items.filter(x=>x.tier!=='C'||x.bank>0||x.z802>0||x.hot>0||x.outline||x.recent>0);
fs.writeFileSync(path.join(ROOT,'data','keypoints.js'),'window.KEYPOINTS='+JSON.stringify(keep)+';');
const c={};keep.forEach(x=>c[x.tier]=(c[x.tier]||0)+1);
console.log('考点条目:',keep.length,JSON.stringify(c));
console.log('S示例:',keep.filter(x=>x.tier==='S').slice(0,8).map(x=>x.kp+' '+x.title).join(' | '));
