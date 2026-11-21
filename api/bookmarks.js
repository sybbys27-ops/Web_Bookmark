import {createHash} from 'node:crypto';
const FILE='bookmarks.json', DESC='Web_Bookmark automatic sync';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const send=(res,code,v)=>{res.setHeader('Cache-Control','no-store');res.status(code).json(v);};
function verify(v){
 if(!v||v.version!==2||!Array.isArray(v.pages)||v.pages.length!==5)throw Error('5페이지 JSON 형식 오류');
 return {version:2,pageCount:5,pages:v.pages.map(p=>{
  if(!Array.isArray(p)||p.length>3000)throw Error('페이지 형식 오류');
  return p.map(x=>{
   if(!x||typeof x.name!=='string'||!x.name.trim()||x.name.length>200||typeof x.url!=='string'||x.url.length>2048)throw Error('북마크 항목 오류');
   const u=new URL(x.url);if(!['http:','https:'].includes(u.protocol))throw Error('URL 형식 오류');
   return {name:x.name.trim(),url:u.href};
  });
 })};
}
async function gh(path,token,options={}){
 const r=await fetch('https://api.github.com'+path,{...options,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'Content-Type':'application/json',...options.headers}});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw Error('GitHub API HTTP '+r.status);return j;
}
async function find(token,id){
 if(id)return gh('/gists/'+encodeURIComponent(id),token);
 for(let page=1;page<=10;page++){
 const list=await gh('/gists?per_page=100&page='+page,token);
 const match=list.find(x=>x.description===DESC&&x.files&&x.files[FILE]);
 if(match)return gh('/gists/'+encodeURIComponent(match.id),token);
 if(list.length<100)break;
 }return null;
}
async function read(gist,token){
 if(!gist)return null;
 const f=gist.files&&gist.files[FILE];if(!f)throw Error('Gist bookmarks.json 파일 없음');
 let content=f.content;
 if(f.truncated){const r=await fetch(f.raw_url,{headers:{Authorization:'Bearer '+token}});if(!r.ok)throw Error('Gist 읽기 오류');content=await r.text();}
 return verify(JSON.parse(content));
}
export default async function handler(req,res){
 if(!['GET','PUT'].includes(req.method))return send(res,405,{error:'Method Not Allowed'});
 const token=process.env.GITHUB_GIST_TOKEN;if(!token)return send(res,503,{error:'GITHUB_GIST_TOKEN 환경변수 필요'});
 if(req.method==='PUT'&&JSON.stringify(req.body||{}).length>750000)return send(res,413,{error:'데이터 용량 초과'});
 try{
  const gist=await find(token,process.env.BOOKMARK_GIST_ID);
  const state=await read(gist,token),revision=state?hash(state):null;
  if(req.method==='GET')return send(res,200,{state,revision});
  const next=verify(req.body&&req.body.state);
  if((req.body&&req.body.revision||null)!==revision)return send(res,409,{error:'다른 PC에서 데이터가 변경되었습니다. 새로고침하세요.'});
  const payload={description:DESC,files:{[FILE]:{content:JSON.stringify(next,null,2)}}};
  if(gist)await gh('/gists/'+encodeURIComponent(gist.id),token,{method:'PATCH',body:JSON.stringify(payload)});
  else await gh('/gists',token,{method:'POST',body:JSON.stringify({...payload,public:false})});
  return send(res,200,{saved:true,revision:hash(next)});
 }catch(e){console.error(e);return send(res,502,{error:e.message||'Gist 연결 실패'});}
}