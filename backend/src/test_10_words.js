import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectMongo from './config/mongo_pool.js';
import User from './models/User.js';
import Word from './models/Word.js';
import { createWordEntry } from './features/words/words.service.js';
import { getSession } from './config/neo4j_pool.js';

dotenv.config({ override: true });

async function run() {
  console.log("=== NEO4J PERSISTENCE TEST ===");
  await connectMongo();

  // 1. Resolve or create test user
  const username = "persisttestuser";
  let user = await User.findOne({ username });
  if (!user) {
    user = new User({
      username,
      email: "persisttestuser@example.com",
      passwordHash: "dummy"
    });
    await user.save();
    console.log(`[MongoDB] Created test user: ${username}`);
  } else {
    console.log(`[MongoDB] Found test user: ${username}`);
  }

  // Ensure Neo4j user node exists
  const session = getSession();
  try {
    await session.executeWrite(tx =>
      tx.run(
        `MERGE (u:User {mongo_id: $userId})
         SET u.username = $username`,
        { userId: user._id.toString(), username }
      )
    );
    console.log("[Neo4j] Ensured user node exists.");
  } finally {
    await session.close();
  }

  // 2. Add 10 different words sequentially
  const wordsToAdd = [
    "robust", "scalable", "efficient", "optimal", "quantum",
    "compiler", "algorithm", "variable", "function", "closure"
  ];

  console.log(`\nAttempting to ingest ${wordsToAdd.length} words...`);
  
  for (let i = 0; i < wordsToAdd.length; i++) {
    const word = wordsToAdd[i];
    try {
      console.log(`\n[${i + 1}/${wordsToAdd.length}] Ingesting word: "${word}"...`);
      await createWordEntry(user._id.toString(), word);
      console.log(`[SUCCESS] Word "${word}" ingested successfully.`);
      
      // Query current node count in Neo4j
      const neoSession = getSession();
      try {
        const wordCountRes = await neoSession.run(
          "MATCH (w:Word) RETURN count(w) AS count"
        );
        const relCountRes = await neoSession.run(
          "MATCH (u:User {username: $username})-[r:LEARNED]->(w:Word) RETURN count(w) AS count",
          { username }
        );
        console.log(` - Neo4j Total Word Nodes: ${wordCountRes.records[0].get('count').toNumber()}`);
        console.log(` - Neo4j User Learned Count: ${relCountRes.records[0].get('count').toNumber()}`);
      } finally {
        await neoSession.close();
      }
    } catch (err) {
      console.error(`[FAILURE] Failed to ingest word "${word}":`, err.message);
      console.error(err.stack);
    }
  }

  await mongoose.disconnect();
  console.log("\nTest completed.");
  process.exit(0);
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
