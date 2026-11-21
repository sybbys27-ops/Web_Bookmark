// Automatic Gist synchronization for the Vercel deployment.
(()=>{
 const api='/api/bookmarks';
 const oldWrite=writePages;
 let manualRequested=false;
 let ready=false,blocked=false,dirty=false,saving=false,revision=null,timer=null;
 const status=()=>document.getElementById('syncStatus');
 const report=s=>{if(status())status().textContent=s;};
 const lock=disabled=>document.querySelectorAll('#bookmarkForm input,#bookmarkForm button,.page-button,#gistSaveButton').forEach(e=>e.disabled=disabled);
 async function request(method,body){
  const r=await fetch(api,{method,cache:'no-store',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(data.error||'HTTP '+r.status);e.conflict=r.status===409;throw e;}
  return data;
 }
 function enqueue(){
  if(!ready||blocked)return;
  dirty=true;clearTimeout(timer);timer=setTimeout(save,650);
  report('☁️ 저장 대기 중...');
 }
 writePages=function(pages){oldWrite(pages);enqueue();};
 async function save(){
  if(!ready||blocked||saving||!dirty)return;
  saving=true;dirty=false;manualRequested=false;report('☁️ 저장 중...');
  const pages=readPages();
  try{
   const r=await request('PUT',{state:{version:2,pageCount:5,pages},revision});
   revision=r.revision;report('☁️ Gist 저장 완료');
  }catch(e){
   dirty=true;
   if(e.conflict){blocked=true;lock(true);report('⚠️ 다른 PC에서 변경됨 — 새로고침 필요');}
   else report('⚠️ 저장 실패: '+e.message);
  }finally{
   saving=false;
   if(dirty&&!blocked){clearTimeout(timer);timer=setTimeout(save,manualRequested?0:5000);}
  }
 }
 document.addEventListener('DOMContentLoaded',async()=>{
  document.getElementById('gistSaveButton').addEventListener('click',()=>{
   if(!ready||blocked){report('⚠️ Gist 연결을 먼저 확인하세요');return;}
   manualRequested=true;dirty=true;clearTimeout(timer);
   if(saving){report('☁️ 현재 저장 후 다시 저장합니다...');return;}
   void save();
  });
  lock(true);report('☁️ Gist 불러오는 중...');
  try{
   const r=await request('GET');
   revision=r.revision;
   if(r.state){
    oldWrite(r.state.pages);
    loadLinks();
   }
   ready=true;lock(false);
   if(!r.state && readPages().some(p=>p.length))enqueue();
   else report(r.state?'☁️ Gist 불러오기 완료':'☁️ 새 Gist 준비됨 (첫 저장 시 생성)');
  }catch(e){
   blocked=true;
   report('⚠️ 첫 불러오기 실패: '+e.message+' — 새로고침 필요');
  }
 });
})();