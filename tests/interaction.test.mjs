import test from 'node:test';
import assert from 'node:assert/strict';
import {replyParts} from '../public/reply-parts.js';
import {canInitiate} from '../public/presence.js';
import {refreshPersona,DEFAULT_PERSONA} from '../public/defaults.js';
test('mixed replies resolve only known stickers and stay within three messages',()=>{
 const id='a'.repeat(64),sticker={id,url:`/assets/stickers/${id}.jpg`,name:'哭哭'};
 const parts=replyParts(`我没绷住\n\n[[表情:${id}]]\n\n你现在想打瓦吗\n\n多余的第四条`,[sticker]);
 assert.equal(parts.length,3);assert.ok(parts.some(p=>p.sticker===sticker.url));assert.match(parts.map(p=>p.content).join(""),/多余的第四条/);
 assert.deepEqual(replyParts(`[[表情:${'b'.repeat(64)}]]`,[sticker]),[]);
});
test('idle opener respects typing, quiet intent, pending messages, cooldown and unanswered openers',()=>{
 const input={now:2000000,lastInteraction:1800000,presence:{},lastUser:{id:'u1',content:'今天挺开心'},lastRole:'assistant',available:true};
 assert.equal(canInitiate(input),true);
 assert.equal(canInitiate({...input,lastInteraction:1990000}),true);
 for(const override of [{available:false},{lastInteraction:1990001},{presence:{enabled:false}},{lastRole:'user'},{presence:{lastAt:1990001}},{presence:{userToken:'u1'}},{lastUser:{id:'u2',content:'我先睡觉了'}}])assert.equal(canInitiate({...input,...override}),false);
});
test('persona migration is idempotent and preserves custom relationships and notes',()=>{
 const old={facts:'用户在大连校区，你在沈阳校区。',style:'喜欢句尾用句号',extra:'不喜欢被叫宝宝',name:'Aa.💩'};
 const updated=refreshPersona(old);assert.deepEqual(refreshPersona(updated),updated);
 assert.match(updated.facts,/用户喜欢狼队前职业选手雨晴/);assert.match(updated.facts,/角色喜欢狼队职业选手宠爱/);
 assert.match(updated.style,/喜欢句尾用句号/);assert.match(updated.extra,/不喜欢被叫宝宝/);
 assert.match(DEFAULT_PERSONA.style,/主动约打瓦/);
});

