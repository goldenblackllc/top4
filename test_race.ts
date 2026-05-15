async function getFeedCards() {
  throw new Error("Missing Index");
}
async function run() {
  const start = Date.now();
  try {
    await Promise.race([
      getFeedCards(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);
  } catch (err) {
    console.log("Caught:", err.message, "after", Date.now() - start, "ms");
  }
}
run();
