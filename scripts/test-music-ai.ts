/**
 * Simple raw output test for Gemini 3.1 Pro music suggestions.
 * Usage: npx tsx scripts/test-music-ai.ts
 */

const TEST_CASES = [
  { category: 'movie', title: 'Up' },
  { category: 'movie', title: 'Interstellar' },
  { category: 'movie', title: 'A Man Called Ove' },
  { category: 'TV show', title: "Clarkson's Farm" },
  { category: 'TV show', title: 'The Grand Tour' },
  { category: 'TV show', title: 'Just for Laughs Gags' },
  { category: 'TV show', title: 'All Creatures Great & Small' },
  { category: 'book', title: 'War and Peace' },
  { category: 'book', title: 'Rich Dad Poor Dad' },
];

const PROMPT = (category: string, title: string) =>
  `For the ${category} "${title}", what is the single most iconic or recognizable piece of music associated with it?\nReply with ONLY valid JSON: {"track": "...", "artist": "..."}`;

async function callGemini(category: string, title: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return 'NO KEY';

  const start = Date.now();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT(category, title) }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 2048 },
      }),
    },
  );
  const ms = Date.now() - start;
  if (!res.ok) return `ERROR ${res.status} (${ms}ms)`;
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'EMPTY';
  return `${text}  [${ms}ms]`;
}

async function callSonnet(category: string, title: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return 'NO KEY';

  const start = Date.now();
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 100,
      messages: [{ role: 'user', content: PROMPT(category, title) }],
    }),
  });
  const ms = Date.now() - start;
  if (!res.ok) return `ERROR ${res.status} (${ms}ms)`;
  const data = await res.json();
  const text = data?.content?.[0]?.text?.trim() || 'EMPTY';
  return `${text}  [${ms}ms]`;
}

async function main() {
  for (const { category, title } of TEST_CASES) {
    const [gemini, sonnet] = await Promise.all([
      callGemini(category, title),
      callSonnet(category, title),
    ]);
    console.log(`\n--- ${category}: "${title}" ---`);
    console.log(`  Gemini 3.1 Pro: ${gemini}`);
    console.log(`  Sonnet 5:       ${sonnet}`);
    await new Promise(r => setTimeout(r, 200));
  }
}

main();
