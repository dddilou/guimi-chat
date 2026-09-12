// Strip only the internal timestamp prefix that older versions exposed.
export function cleanReply(text) {
  return text.replace(/^[ \t]*[\[【]消息时间\s*[：:]\s*\d{4}-\d{2}-\d{2}[T ][^\]】\r\n]*[\]】][ \t]*(?:\r?\n)?/gm, '').trim();
}
