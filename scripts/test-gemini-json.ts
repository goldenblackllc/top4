// Quick test: which Gemini model works with structured output?
const models = ['gemini-3.1-pro-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'];

async function test(model: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { console.log('NO KEY'); return; }
  
  const start = Date.now();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'For the movie "Up", what is the single most iconic or recognizable piece of music associated with it?\nReply with ONLY valid JSON: {"track": "...", "artist": "..."}' }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 200,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              track: { type: 'STRING' },
              artist: { type: 'STRING' }
            },
            required: ['track', 'artist']
          }
        },
      }),
    },
  );
  const ms = Date.now() - start;
  
  if (!res.ok) {
    console.log(`${model}: ERROR ${res.status} (${ms}ms)`);
    return;
  }
  
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log(`${model}: ${text} (${ms}ms)`);
}

async function main() {
  for (const m of models) {
    await test(m);
  }
}
main();
