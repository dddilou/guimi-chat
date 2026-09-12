import test from 'node:test';
import assert from 'node:assert/strict';
import {selectReplyStickers} from '../sticker-selection.mjs';
test('avoids mirroring and respects requests not to repeat',()=>{
 const library=['a','b','c'].map(url=>({url}));
 const history=[{role:'user',sticker:'a'},{role:'assistant',sticker:'b'}];
 for(const content of ['哈哈','不要发一样的表情','别再发同一张'])assert.deepEqual(selectReplyStickers(library,[...history,{role:'user',content}]),[{url:'c'}]);
 assert.deepEqual(selectReplyStickers(library,[...history,{role:'user',content:'同一张再发一次'}]),library);
});
