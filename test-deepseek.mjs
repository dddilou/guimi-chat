const key = process.env.DEEPSEEK_API_KEY || '';
const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
if (!key) {
  console.log('DeepSeek test: no API key');
  process.exit(1);
}
try {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: '只回复：连接成功' }],
      stream: false,
      max_tokens: 40,
      temperature: 0.1,
      thinking: { type: 'disabled' },
    }),
    signal: AbortSignal.timeout(30000),
  });
  const text = await response.text();
  console.log(`DeepSeek test status: ${response.status}`);
  if (response.ok) {
    console.log('DeepSeek test OK');
    console.log(text.slice(0, 200));
  } else {
    console.log(text.slice(0, 500));
  }
} catch (error) {
  console.log(`DeepSeek test failed: ${error?.cause?.code || error?.code || error?.message}`);
}
