// Audio stays out of chat history/localStorage; transcripts remain in backups.
const cacheName='paipai-speech-v1',jobs=new Map(),ready=new Map(),errors=new Map();
const player=new Audio();
let current=null,queue=Promise.resolve();
function label(button,id){
  button.textContent=jobs.has(id)?'◌ 语音生成中…':errors.has(id)?'↻ 重试语音':current===id&&!player.paused?'❚❚ 正在播放':'▷ 派派的语音';
  button.setAttribute('aria-label',button.textContent);
}
function update(){document.querySelectorAll('[data-speech-id]').forEach(b=>{label(b,b.dataset.speechId);if(errors.has(b.dataset.speechId)){const transcript=b.parentElement.querySelector('details');if(transcript)transcript.open=true;}});}
async function load(m){
  if(ready.has(m.id))return ready.get(m.id);
  const url=new URL('/__voice_cache__/'+encodeURIComponent(m.id),location.origin).href;
  let cache,cached;
  try{cache=await caches.open(cacheName);cached=await cache.match(url);}catch{}
  let blob;
  if(cached)blob=await cached.blob();
  else{
    const r=await fetch('/api/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket:m.speech}),signal:AbortSignal.timeout(55000)});
    if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(d.error||'语音暂不可用，文字已保留。');}
    if(!r.headers.get('content-type')?.includes('audio/'))throw Error('语音格式异常，文字已保留。');
    blob=await r.blob();
    try{if(cache){await cache.put(url,new Response(blob,{headers:{'Content-Type':'audio/mpeg'}}));const keys=await cache.keys();for(const key of keys.slice(0,Math.max(0,keys.length-100)))await cache.delete(key);}}catch{}
  }
  const result=URL.createObjectURL(blob);
  if(ready.size>=40){const old=[...ready.keys()].find(id=>id!==current);if(old){URL.revokeObjectURL(ready.get(old));ready.delete(old);}}
  ready.set(m.id,result);return result;
}
function prepare(m){
  if(jobs.has(m.id))return jobs.get(m.id);
  errors.delete(m.id);
  const job=queue.then(()=>load(m)).catch(e=>{errors.set(m.id,e.message||'语音连接中断，文字已保留。');throw e;}).finally(()=>{jobs.delete(m.id);update();});
  jobs.set(m.id,job);queue=job.catch(()=>{});update();return job;
}
export function prepareSpeech(m){if(m.speech)prepare(m).catch(()=>{});}
export function renderSpeech(bubble,m,toast){
  const button=document.createElement('button');button.type='button';button.className='speech-play';button.dataset.speechId=m.id;
  label(button,m.id);
  button.onclick=async()=>{
    if(current===m.id&&!player.paused){player.pause();update();return;}
    const selected=m.id;current=selected;player.pause();update();
    try{const src=await prepare(m);if(current!==selected)return;player.src=src;await player.play();update();}catch(e){toast(errors.get(m.id)||'语音已准备好，请再点一次播放。');update();}
  };
  const detail=document.createElement('details');detail.className='speech-transcript';
  const summary=document.createElement('summary');summary.textContent='查看文字';
  const text=document.createElement('div');text.textContent=m.content;detail.append(summary,text);
  if(errors.has(m.id))detail.open=true;
  bubble.classList.add('speech-bubble');bubble.append(button,detail);
}
player.addEventListener('ended',()=>{current=null;update();});
player.addEventListener('pause',update);
player.addEventListener('error',()=>{if(current)errors.set(current,'播放失败，可查看文字或再点气泡重试。');update();});
