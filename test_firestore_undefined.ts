import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection } from "firebase/firestore";

const app = initializeApp({
  apiKey: "some-api-key",
  appId: "some-app-id",
  // NO projectId
});

const db = getFirestore(app);
console.log("DB Initialized");

async function run() {
  console.log("Starting getDocs");
  try {
    await getDocs(collection(db, "test"));
    console.log("Done getDocs");
  } catch (e) {
    console.error("Error getDocs", e);
  }
}
run();
