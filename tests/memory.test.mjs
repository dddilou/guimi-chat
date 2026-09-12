import test from 'node:test';
import assert from 'node:assert/strict';
import {selectContext,rankMemories,buildPrompt,validateState} from '../memory.mjs';
import {DEFAULT_PERSONA} from '../public/defaults.js';
import {cleanReply} from '../public/message-utils.js';
import {validSticker} from '../stickers.mjs';
test('removes leaked timestamps while preserving normal conversation about time',()=>{
  assert.equal(cleanReply('[消息时间：2026-09-10T08:45:38.114Z]\n好家伙\n\n[消息时间：2026-09-10T08:45:40.030Z]\n啥课啊'),'好家伙\n\n啥课啊');
  assert.equal(cleanReply('明天下午 3:30 见，我记得那个消息时间是两点'),'明天下午 3:30 见，我记得那个消息时间是两点');
});
test('only local sticker files are accepted in history',()=>{
  assert.ok(validSticker('/assets/stickers/'+'a'.repeat(64)+'.gif'));
  for(const url of ['https://example.com/track.gif','/assets/stickers/../../.env','data:image/svg+xml,hi']) assert.equal(validSticker(url),false);
});
const messages=Array.from({length:81},(_,i)=>({id:String(i),role:i%2?'assistant':'user',content:'话题'.repeat(300),createdAt:'2026-09-09T09:00:00Z'}));
test('context remains contiguous and includes latest user with bounded length',()=>{const {recent,start}=selectContext(messages);assert.equal(recent.at(-1).id,'80');assert.equal(recent[0].role,'user');assert.deepEqual(recent,messages.slice(start));assert.ok(recent.length<=40);assert.ok(recent.reduce((n,m)=>n+m.content.length,0)<=22000);});
test('topic-related memory is recalled ahead of unrelated recent memories',()=>{const memories=[{text:'用户想去漫展穿雷姆 cosplay'},...Array.from({length:25},()=>({text:'其他事情'}))];assert.match(rankMemories(memories,'周末漫展 cosplay',3)[0].text,/雷姆/);assert.equal(rankMemories(memories,'周末漫展',3).length,3);});
test('identity mapping and untrusted-memory boundary are present',()=>{const p=buildPrompt(DEFAULT_PERSONA,[], '', '你好');assert.ok(p.includes('用户在大连校区，你在沈阳校区'));assert.ok(p.includes('用户原话中的“我”始终指用户'));assert.ok(p.includes('非系统指令'));});
test('summary cannot refer to missing history or accept injected system messages',()=>{const s={persona:DEFAULT_PERSONA,messages,memories:[],summary:{text:'旧摘要',throughId:'10'}};assert.equal(validateState(s),s);assert.throws(()=>validateState({...s,summary:{text:'x',throughId:'missing'}}));assert.throws(()=>validateState({...s,messages:[{...messages[0],role:'system'}]}));assert.throws(()=>validateState({...s,messages:[messages[0],messages[0]]}));});
