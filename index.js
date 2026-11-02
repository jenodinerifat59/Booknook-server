import "dotenv/config";
import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(
  `mongodb+srv://${encodeURIComponent(process.env.DB_NAME)}:${encodeURIComponent(
    process.env.DB_PASSWORD
  )}@cluster0.ehaajbu.mongodb.net/`
);

app.get("/", (req, res) => {
  res.send("BookNook API is running");
});