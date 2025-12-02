// config/db.js
import mongodb from "mongodb";

let client;
let db;

export async function connectToDb() {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_NAME || "testing";

  client = new mongodb.MongoClient(uri);
  await client.connect();
  db = client.db(dbName);

  console.log("✅ Connected to MongoDB");
  console.log("Using DB:", dbName);

  return db;
}

export function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call connectToDb() first.");
  }
  return db;
}

export const ObjectId = mongodb.ObjectId;
export const isValidObjectId = (id) => mongodb.ObjectId.isValid(id);
