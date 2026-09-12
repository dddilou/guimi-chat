import {cleanReply} from './message-utils.js';
export function replyParts(text,stickers=[]) {
  const parts=[];
  for(const piece of cleanReply(text).split(/(\[\[表情:[a-f0-9]{64}\]\])/g)){
    const match=piece.match(/^\[\[表情:([a-f0-9]{64})\]\]$/);
    if(match){const sticker=stickers.find(s=>s.id===match[1]);if(sticker)parts.push({content:sticker.name,sticker:sticker.url});}
    else for(const content of piece.replace(/\[\[表情:[^\]]*\]\]/g,'').split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean))parts.push({content});
  }
  if(parts.length<=3)return parts;
  // Preserve a chosen sticker even when the model writes three text paragraphs first.
  const sticker=parts.find(p=>p.sticker);
  const texts=parts.filter(p=>!p.sticker);
  const budget=sticker?2:3;
  const compact=texts.slice(0,budget);
  if(texts.length>budget)compact[budget-1]={content:texts.slice(budget-1).map(p=>p.content).join('\n')};
  return sticker?[...compact,sticker]:compact;
}
