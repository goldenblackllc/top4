import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection } from "firebase/firestore";

const app = initializeApp({
  // NO apiKey
  projectId: "top4-490eb",
  appId: "1:913792665510:web:69294485b4987f3389f167"
});

const db = getFirestore(app);
console.log("DB Initialized");

async function run() {
  const start = Date.now();
  console.log("Starting getDocs");
  try {
    await Promise.race([
      getDocs(collection(db, "test")),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);
    console.log("Done getDocs");
  } catch (e) {
    console.error("Error getDocs", e.message, "after", Date.now() - start, "ms");
  }
}
run();
