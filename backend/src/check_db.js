import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectMongo from './config/mongo_pool.js';
import User from './models/User.js';
import Word from './models/Word.js';
import { getSession } from './config/neo4j_pool.js';

dotenv.config({ override: true });

async function run() {
  console.log("--- DATABASE SYSTEM CHECK ---");
  await connectMongo();

  // 1. Fetch MongoDB Users
  const mongoUsers = await User.find({});
  console.log(`\n[MongoDB] Found ${mongoUsers.length} Users:`);
  mongoUsers.forEach(u => {
    console.log(` - ID: ${u._id}, Username: ${u.username}, Display: ${u.displayName || '(none)'}`);
  });

  // 2. Fetch MongoDB Words
  const mongoWords = await Word.find({});
  console.log(`\n[MongoDB] Found ${mongoWords.length} Words:`);
  mongoWords.forEach(w => {
    console.log(` - Word: ${w.word}, PartOfSpeech: ${w.partOfSpeech || '(none)'}`);
  });

  // 3. Query Neo4j
  console.log("\n[Neo4j] Connecting...");
  const session = getSession();
  try {
    const userNodes = await session.run("MATCH (u:User) RETURN u.mongo_id AS mongo_id, u.username AS username");
    console.log(`[Neo4j] Found ${userNodes.records.length} User Nodes:`);
    userNodes.records.forEach(rec => {
      console.log(` - MongoId: ${rec.get('mongo_id')}, Username: ${rec.get('username')}`);
    });

    const wordNodes = await session.run("MATCH (w:Word) RETURN w.text AS text");
    console.log(`[Neo4j] Found ${wordNodes.records.length} Word Nodes:`);
    wordNodes.records.forEach(rec => {
      console.log(` - Word Text: ${rec.get('text')}`);
    });

    const learnedRels = await session.run("MATCH (u:User)-[r:LEARNED]->(w:Word) RETURN u.username AS username, w.text AS word");
    console.log(`[Neo4j] Found ${learnedRels.records.length} LEARNED Relationships:`);
    learnedRels.records.forEach(rec => {
      console.log(` - User [${rec.get('username')}] learned [${rec.get('word')}]`);
    });
  } catch (err) {
    console.error("Neo4j check error:", err);
  } finally {
    await session.close();
  }

  await mongoose.disconnect();
  console.log("\nDisconnected from MongoDB.");
  process.exit(0);
}

run().catch(err => {
  console.error("Error during check:", err);
  process.exit(1);
});
