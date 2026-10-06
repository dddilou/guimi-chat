import test from 'node:test';
import assert from 'node:assert/strict';
import {replyMode,speechInstructions} from '../reply-mode.mjs';
import {createSpeechService} from '../speech.mjs';
const user=content=>({role:'user',content});
const assistant=content=>({role:'assistant',content});
test('explicit commands override cadence and persist beyond recent context',()=>{
 const messages=[user('你给我发语音，不要打字了，从现在开始，你都给我发语音'),assistant('好的'),...Array.from({length:60},(_,i)=>i%2?assistant('好的'):user('今天怎么样'))];
 assert.equal(replyMode(messages),'voice');
 const service=createSpeechService({key:'test'});
 const parts=[{content:'第一句'},{content:'第二句'},{content:'第三句'}];
 assert.equal(service.decorate(parts,messages).filter(p=>p.speech).length,3);
 assert.equal(replyMode([...messages,user('以后一直跟我打字')]),'text');
 assert.ok(service.decorate(parts,[...messages,user('以后一直跟我打字')]).every(p=>!p.speech));
 assert.equal(replyMode([...messages,user('恢复正常聊天')]),'auto');
});
test('negative commands, switching, complaints and quoted examples are distinguished',()=>{
 for(const text of ['别再打字了','我希望你以后都用语音回复我','只发语音','用语音跟我聊天','我想让你一直发语音'])assert.equal(replyMode([user(text)]),'voice',text);
 for(const text of ['不要再发语音了','请一直用文字回复','只打字','从现在开始只发文字'])assert.equal(replyMode([user(text)]),'text',text);
 for(const text of ['啥叫“这条是语音”？这不有打字吗？','她说“以后只发语音”','如果只发语音会怎么样','你能发语音吗'])assert.equal(replyMode([user(text)]),'auto',text);
 assert.equal(replyMode([user('一直发语音'),assistant('只打字'),user('这不有打字吗？')]),'voice');
 assert.equal(replyMode([user('只发语音'),user('别发语音了，改成文字')]),'text');
});
test('forced voice preserves stickers and all long reply content',()=>{
 const service=createSpeechService({key:'test'}),content='很长的内容。'.repeat(90),sticker={content:'比耶',sticker:'/assets/stickers/happy.png'};
 const parts=service.decorate([{content:'（这句是语音）'+content},sticker],[user('一直发语音')]);
 assert.equal(parts.filter(p=>!p.sticker).map(p=>p.content).join(''),content);
 assert.ok(parts.filter(p=>!p.sticker).every(p=>p.speech&&p.content.length<=180));
 assert.deepEqual(parts.at(-1),sticker);
 assert.match(speechInstructions('voice',true,0),/真实语音/);
});
