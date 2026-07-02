import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectMongo from './config/mongo_pool.js';
import { createWordEntry } from './features/words/words.service.js';

dotenv.config({ override: true });

async function run() {
  console.log("=== SRIi WORD INGESTION TEST ===");
  await connectMongo();

  const userId = "6a381dc48e110555e3c7010a"; // srii
  const word = "another";

  try {
    console.log(`Ingesting word: "${word}" for user: ${userId}`);
    const result = await createWordEntry(userId, word);
    console.log("[SUCCESS] Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("[FAILURE] Error message:", err.message);
    console.error("[FAILURE] Error stack:", err.stack);
  } finally {
    await mongoose.disconnect();
    console.log("Done.");
  }
}

run().catch(console.error);
