export function selectReplyStickers(library, messages) {
  const latest=messages.at(-1)?.content||'';
  const asksToRepeat=/同一张|一样的表情|这个表情也发|再发一次/.test(latest)
    && !/不要|别|不想|不希望|不准|别再/.test(latest);
  if(asksToRepeat)return library;
  const user=messages.findLast(m=>m.role==='user'&&m.sticker)?.sticker;
  const own=messages.findLast(m=>m.role==='assistant'&&m.sticker)?.sticker;
  return library.filter(s=>s.url!==user&&s.url!==own);
}

// Keep occasional stickers even when a voice-focused model forgets its marker.
export function mixVoiceSticker(parts,library,messages){
  if(!library.length||parts.some(p=>p.sticker))return parts;
  const latest=messages.findLast(m=>m.role==='user')?.content||'';
  if(/(?:不要|别|不想|停止).{0,6}(?:表情|图片)|去世|自杀|自残|病危|住院|葬礼/.test(latest))return parts;
  const asks=/表情|贴图/.test(latest);
  const since=messages.slice(messages.findLastIndex(m=>m.role==='assistant'&&m.sticker)+1).filter(m=>m.role==='assistant');
  if(!asks&&since.length<3)return parts;
  const reply=parts.map(p=>p.content).join(' '),context=reply+' '+latest;
  const moods=[[/开心|哈哈|好玩|笑死|快乐|好事|愉快|赢了/,/比耶|开心/],[/加油|支持|努力|练习/,/加油/],[/厉害|真棒|太强|夸/,/夸夸/],[/震惊|我去|竟然/,/震惊/],[/难过|委屈|哭|伤心/,/哭哭/],[/疑惑|咋回事|不懂/,/疑惑/]];
  const match=moods.find(([re])=>re.test(context));
  const sticker=library.find(s=>(match?.[1]||/乖巧/).test(s.name));
  if(!sticker)return parts;
  const next=parts.map(p=>({...p}));
  if(next.length>=3){next[1].content=next.slice(1).map(p=>p.content).join('\n');next.length=2;}
  next.push({content:sticker.name,sticker:sticker.url});return next;
}
