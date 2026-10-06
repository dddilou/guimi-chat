import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpeechService,voiceCount,FISH_MODEL,PAIPAI_VOICE} from '../speech.mjs';
import {mixVoiceSticker} from '../sticker-selection.mjs';
const history=[{role:'user',content:'你好'},{role:'assistant',content:'你好呀'},{role:'user',content:'在做什么'}];
test('voice replies retain requested stickers without dropping text or forcing one into serious topics',()=>{
 const library=[{name:'比耶开心',url:'/assets/stickers/happy.png'},{name:'乖巧',url:'/assets/stickers/wait.png'}];
 const parts=[{content:'开心'},{content:'第二句'},{content:'第三句'}];
 const mixed=mixVoiceSticker(parts,library,[{role:'user',content:'来个表情'}]);
 assert.equal(mixed.length,3);assert.equal(mixed[2].sticker,library[0].url);assert.match(mixed[1].content,/第三句/);
 for(const content of ['不要发表情','我家人住院了'])assert.deepEqual(mixVoiceSticker(parts,library,[{role:'user',content}]),parts);
 assert.deepEqual(mixVoiceSticker(mixed,library,history),mixed);
});
test('voice cadence waits two exchanges, preserves stickers, sometimes sends two voices',()=>{
 const s=createSpeechService({key:'test'}),sticker={content:'开心',sticker:'/assets/stickers/test.png'};
 assert.equal(voiceCount(history.slice(0,1)),0);assert.equal(voiceCount(history),1);
 const parts=s.decorate([{content:'诡秘，我在听歌。'},sticker,{content:'你呢'}],history);
 assert.ok(parts[0].speech);assert.deepEqual(parts[1],sticker);assert.equal(parts[2].speech,undefined);
 const second=[...history,{role:'assistant',...parts[0]},{role:'user',content:'好呀'},{role:'assistant',content:'嗯'},{role:'user',content:'然后呢'}];
 assert.equal(voiceCount(second),2);
 assert.equal(s.decorate([{content:'第一条'},{content:'第二条'},sticker],second).filter(p=>p.speech).length,2);
 assert.deepEqual(createSpeechService().decorate([{content:'不配置时原样返回'}],history),[{content:'不配置时原样返回'}]);
});
test('tickets cannot be forged, changed, expired or used for arbitrary long text',()=>{
 let now=100;const s=createSpeechService({key:'secret',now:()=>now});
 const t=s.ticket('诡秘你好');assert.equal(s.verify(t).text,'诡秘你好');
 assert.throws(()=>s.verify(t+'a'));assert.throws(()=>s.verify('bad'));
 assert.throws(()=>createSpeechService({key:'other'}).verify(t));
 assert.equal(s.ticket('啊'.repeat(181)),null);
 now+=8*86400000;assert.throws(()=>s.verify(t),/期限/);
});
test('real generation contract uses only free model, exact voice and cached/deduplicated bytes',async()=>{
 let calls=0;const s=createSpeechService({key:'secret',fetcher:async(url,opts)=>{
  calls++;assert.equal(url,'https://api.fish.audio/v1/tts');assert.equal(opts.redirect,'error');
  assert.equal(opts.headers.model,FISH_MODEL);assert.equal(FISH_MODEL,'s2.1-pro-free');
  assert.equal(JSON.parse(opts.body).reference_id,PAIPAI_VOICE);
  assert.equal(JSON.parse(opts.body).text,'新的回复');
  return new Response(new Uint8Array(1200),{headers:{'content-type':'audio/mpeg'}});
 }});
 const t=s.ticket('新的回复');const [a,b]=await Promise.all([s.audio(t),s.audio(t)]);
 assert.equal(a.length,1200);assert.equal(a,b);await s.audio(t);assert.equal(calls,1);
});
test('Fish failure does not retry or fall back to paid models; forged request never calls Fish',async()=>{
 let calls=0;const s=createSpeechService({key:'secret',fetcher:async()=>{calls++;return new Response('{}',{status:402});}});
 await assert.rejects(s.audio('forged'),/凭证/);assert.equal(calls,0);
 await assert.rejects(s.audio(s.ticket('测试')),/额度不足/);assert.equal(calls,1);
});
test('speech rate limit protects against bursts and resets after a minute',async()=>{
 let now=100000;const s=createSpeechService({key:'secret',now:()=>now,fetcher:async()=>new Response(new Uint8Array(1200),{headers:{'content-type':'audio/mpeg'}})});
 for(let i=0;i<6;i++)await s.audio(s.ticket('测试'+i));
 await assert.rejects(s.audio(s.ticket('第七条')),/排队/);
 now+=61000;assert.equal((await s.audio(s.ticket('第七条'))).length,1200);
});
