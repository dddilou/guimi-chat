export function selectReplyStickers(library, messages) {
  const latest=messages.at(-1)?.content||'';
  const asksToRepeat=/同一张|一样的表情|这个表情也发|再发一次/.test(latest)
    && !/不要|别|不想|不希望|不准|别再/.test(latest);
  if(asksToRepeat)return library;
  const user=messages.findLast(m=>m.role==='user'&&m.sticker)?.sticker;
  const own=messages.findLast(m=>m.role==='assistant'&&m.sticker)?.sticker;
  return library.filter(s=>s.url!==user&&s.url!==own);
}
