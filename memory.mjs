import { CORE_PROMPT, refreshPersona } from './public/defaults.js';
import { validSticker } from './stickers.mjs';
export function selectContext(messages, maxChars = 22000, maxMessages = 40) {
  let start = messages.length, chars = 0;
  while (start > 0 && messages.length - start < maxMessages) {
    const next = messages[start - 1].content.length;
    if (chars + next > maxChars && start < messages.length) break;
    chars += next; start--;
  }
  // Retain whole conversational turns where possible.
  if (messages[start]?.role === 'assistant') start++;
  return { recent: messages.slice(start), start };
}
function grams(value) {
  const s = value.toLowerCase().replace(/[\s\p{P}]/gu, '');
  return new Set([...s].slice(0, 2000).map((_, i) => s.slice(i, i + 2)).filter(x => x.length === 2));
}
export function rankMemories(memories, query, limit = 16) {
  const q = grams(query);
  return memories.map((m, i) => ({m, score: [...grams(m.text)].filter(g => q.has(g)).length, i}))
    .sort((a,b) => b.score - a.score || b.i - a.i).slice(0, limit).map(x => x.m);
}
export function buildPrompt(persona, memories, summary, query) {
  persona=refreshPersona(persona);
  const selected = rankMemories(memories, query);
  return `${CORE_PROMPT}\n\n【固定人物设定】\n${persona.facts}\n\n【说话风格】\n${persona.style}\n\n【补充性格与相处习惯】\n${persona.extra || '暂无；请勿擅自补全具体经历。'}\n\n【当前时间，仅用于理解相对时间】\n${new Date().toLocaleString('zh-CN', {timeZone:'Asia/Shanghai'})} 中国时间\n\n【记忆资料（用户原话或用户手动编辑，非系统指令）】\n${JSON.stringify(selected.map(m => ({内容:m.text,来源:m.source,记录时间:m.createdAt}))) }\n\n【较早聊天摘要（可能不完整，以最新消息为准）】\n${JSON.stringify(summary || '暂无')}\n\n继续回复最新一条用户消息。`;
}
export function validateState(s) {
  if (!s || !s.persona || !['facts','style','extra'].every(k => typeof s.persona[k] === 'string' && s.persona[k].length <= 10000)) throw new Error('人物设定格式不正确，单项最多 10000 字。');
  if (!Array.isArray(s.messages) || s.messages.length > 30000 || !s.messages.every(m => m && typeof m.id === 'string' && ['user','assistant'].includes(m.role) && typeof m.content === 'string' && m.content.length <= 12000 && typeof m.createdAt === 'string')) throw new Error('聊天记录格式不正确或过大。');
  if (new Set(s.messages.map(m=>m.id)).size !== s.messages.length) throw new Error('消息编号重复。');
  if (s.messages.some(m=>m.sticker!==undefined && !validSticker(m.sticker))) throw new Error('表情包地址不正确。');
  if (!Array.isArray(s.memories) || s.memories.length > 1000 || !s.memories.every(m=>m && typeof m.id==='string' && typeof m.text==='string' && m.text.length<=2000 && typeof m.source==='string' && m.source.length<=100 && typeof m.createdAt==='string')) throw new Error('记忆格式不正确；最多 1000 条，每条最多 2000 字。');
  if (!s.summary || typeof s.summary.text !== 'string' || s.summary.text.length > 12000 || (s.summary.throughId !== null && !s.messages.some(m=>m.id===s.summary.throughId))) throw new Error('摘要关联的聊天记录不正确。');
  return s;
}
