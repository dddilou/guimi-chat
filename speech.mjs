import {createHmac, timingSafeEqual, createHash} from 'node:crypto';
import {replyMode} from './reply-mode.mjs';

// Deliberately fixed: never silently fall back to a paid Fish model.
export const FISH_MODEL = 's2.1-pro-free';
export const PAIPAI_VOICE = '37fc02c1ab4644d091eaa84317c41b27';
export function voiceCount(messages) {
  const lastVoice=messages.findLastIndex(m=>m.role==='assistant'&&m.speech);
  const turns=messages.slice(lastVoice+1).filter((m,i,a)=>m.role==='user'&&(i===0||a[i-1].role!=='user')).length;
  const batches=messages.filter(m=>m.role==='assistant'&&m.speech).length;
  return turns>=2 ? (batches%3===1?2:1) : 0;
}
export function createSpeechService({key='',voice=PAIPAI_VOICE,fetcher=fetch,now=Date.now}={}) {
  const cache=new Map(),pending=new Map();
  let windowStart=0,requests=0;
  const signature=p=>createHmac('sha256',key).update('paipai-tts-v1:'+p).digest('base64url');
  function ticket(text) {
    if(!key||typeof text!=='string'||!text.trim()||text.length>180)return null;
    const p=Buffer.from(JSON.stringify({text,voice,model:FISH_MODEL,expires:now()+7*86400000})).toString('base64url');
    return `${p}.${signature(p)}`;
  }
  function verify(token) {
    if(!key)throw Error('派派语音尚未配置，文字聊天仍可使用。');
    if(typeof token!=='string'||token.length>5000)throw Error('语音凭证无效。');
    const [p,s,...extra]=token.split('.');
    const expected=signature(p||''),a=Buffer.from(s||''),b=Buffer.from(expected);
    if(extra.length||a.length!==b.length||!timingSafeEqual(a,b))throw Error('语音凭证无效。');
    let data;try{data=JSON.parse(Buffer.from(p,'base64url').toString());}catch{throw Error('语音凭证无效。');}
    if(data.voice!==voice||data.model!==FISH_MODEL||typeof data.text!=='string'||!data.text.trim()||data.text.length>180)throw Error('语音凭证无效。');
    if(data.expires<now())throw Error('这条旧语音的生成期限已过，可查看下方文字。');
    return data;
  }
  function decorate(parts,messages){
    const mode=replyMode(messages);
    if(mode==='text'||!key)return parts;
    if(mode==='voice')return parts.flatMap(p=>{
      if(p.sticker)return [p];
      // Never silently turn a long forced-voice reply back into plain text.
      const content=p.content.replace(/[（(]\s*(?:这(?:句|条)(?:是)?|以下是)?\s*语音(?:消息)?\s*[）)]/g,'').trim();
      const chunks=[];
      for(let i=0;i<content.length;i+=180){const text=content.slice(i,i+180);chunks.push({...p,content:text,speech:ticket(text)});}
      return chunks;
    });
    let count=voiceCount(messages);
    return parts.map(p=>{if(!count||p.sticker)return p;const speech=ticket(p.content);if(!speech)return p;count--;return {...p,speech};});
  }
  async function audio(token) {
    const data=verify(token);
    const id=createHash('sha256').update(`${voice}:${FISH_MODEL}:${data.text}`).digest('hex');
    if(cache.has(id))return cache.get(id);
    if(pending.has(id))return pending.get(id);
    if(now()-windowStart>60000){windowStart=now();requests=0;}
    if(requests>=6||pending.size>=2)throw Error('语音正在排队，稍后点气泡重试；文字不受影响。');
    requests++;
    const task=(async()=>{
      let r;
      try{r=await fetcher('https://api.fish.audio/v1/tts',{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json',model:FISH_MODEL},body:JSON.stringify({text:data.text,reference_id:voice,format:'mp3',mp3_bitrate:128}),signal:AbortSignal.timeout(45000)});}catch{throw Error('派派语音暂时连不上，文字已保留，稍后点气泡重试。');}
      if(!r.ok){const errors={401:'语音连接失效，请网站主人检查 Fish 密钥。',402:'Fish 语音额度不足，文字聊天仍可使用。',429:'Fish 语音繁忙，稍后点气泡重试。'};throw Error(errors[r.status]||`Fish 语音暂不可用（${r.status}），文字已保留。`);}
      if(!r.headers.get('content-type')?.includes('audio/'))throw Error('没有收到有效语音，文字已保留。');
      let bytes;try{bytes=Buffer.from(await r.arrayBuffer());}catch{throw Error('语音接收中断，文字已保留。');}
      if(bytes.length<100||bytes.length>3*1024*1024)throw Error('语音文件异常，文字已保留。');
      // Bounded warm-instance cache; browser also keeps audio for replay.
      if(cache.size>=40)cache.delete(cache.keys().next().value);
      cache.set(id,bytes);return bytes;
    })();
    pending.set(id,task);
    try{return await task;}finally{pending.delete(id);}
  }
  return {enabled:!!key,ticket,verify,decorate,audio};
}
