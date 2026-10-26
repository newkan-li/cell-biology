/* 生成 802 仿真卷 data/mock802.js
   说明：官方未公布题型/分值；本文件按透明假设规格生成仿真卷，不是真题。
   规格：名解5×4=20，选择15×2=30，判断10×1=10，填空15×2=30，简答4×8=32，论述/实验2×14=28，共150分/180分钟；主观题附评分要点，全部题目附解析。 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
function load(id){const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(ROOT,'data',id+'.js'),'utf8'),ctx);return ctx.window.CHAPTERS[id];}
const ids=['ch01','ch02','ch03','ch04','ch05','ch06','ch07','ch08','ch09','ch10','ch11','ch12','ch13','tb03','tb06','tb11','tb12','tb13','tb15','tb17'];
const pools={term:[],mcq:[],judge:[],fill:[],short:[],calc:[]};
let EXPLAIN={};try{const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(ROOT,'data','mock802-explain.js'),'utf8'),ctx);EXPLAIN=ctx.window.MOCK802_EXPLAIN||{};}catch(e){}
for(const id of ids){const c=load(id);for(const k of Object.keys(pools))for(const q of c[k]||[]){
 if(q.prio!=='S'&&q.prio!=='A')continue;
 const qt=q.q||q.term||'';
 if(/根据图|如图|图\s*\d/.test(qt)||/＋|Ca2\s*[，,]\s*而不是/.test(qt))continue;
 pools[k].push({ch:id,kind:k,id:q.id,q:qt,a:(k==='calc'?(q.steps||q.a||''):(q.a||q.def||'')),o:q.o||null,e:q.e||EXPLAIN[q.id]||'',subtype:q.subtype||'',kps:q.kps||'',kp:q.kp,prio:q.prio});
}}
let seed=8022027;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const used=new Set();
function pick(kind,n,maxPerCh,pref){
 let pool=shuffle(pools[kind]);
 if(pref)pool.sort((a,b)=>(b.subtype===pref?1:0)-(a.subtype===pref?1:0));
 const out=[],chc={};
 for(const q of pool){if(out.length>=n)break;if(used.has(q.id))continue;const ch=q.ch;if((chc[ch]||0)>=maxPerCh)continue;out.push(q);used.add(q.id);chc[ch]=(chc[ch]||0)+1;}
 // 不够时放宽章节限制
 for(const q of pool){if(out.length>=n)break;if(used.has(q.id))continue;out.push(q);used.add(q.id);}
 return out;
}
const specs=[['term',5,1,4],['mcq',15,3,2],['judge',10,2,1],['fill',15,3,2],['short',4,1,8],['calc',2,1,14]];
const papers=[];
for(const name of ['A','B','C','D','E','F','G','H','I','J']){
 const sections=[];
 for(const [kind,n,maxPerCh,per] of specs){
  let arr;
  if(kind==='calc'){
   // 一套尽量一题实验设计、一题论述
   arr=[];
   const exp=pick('calc',1,1,'实验设计');if(exp.length)arr.push(exp[0]);
   const rest=pick('calc',1,1,'论述');if(rest.length)arr.push(rest[0]);
  }else arr=pick(kind,n,maxPerCh);
  sections.push({kind,per,items:arr});
 }
 const total=sections.reduce((s,x)=>s+x.per*x.items.length,0);
 papers.push({id:'paper'+name,name:'802 仿真卷 '+name,total,minutes:180,sections});
}
const out={meta:{title:'首都师范大学 802 细胞生物学 仿真卷',note:'官方未公布题型/分值；本卷为按 4 版教材与 S/A 考点生成的仿真卷，不是真题。规格：名解5×4、选择15×2、判断10×1、填空15×2、简答4×8、论述/实验2×14，共150分/180分钟；主观题附评分要点，全部题目附解析。'},papers};
fs.writeFileSync(path.join(ROOT,'data','mock802.js'),'window.MOCK802='+JSON.stringify(out)+';');
console.log('generated',papers.map(p=>p.name+':'+p.total+'分/'+p.sections.map(s=>s.kind+s.items.length).join(',')).join(' | '));
