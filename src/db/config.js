import mongodb from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;

const client = new mongodb.MongoClient(connectionString);

await client.connect();

console.log("Connected successfully to MongoDB!");

const db = client.db(dbName);

export default db;