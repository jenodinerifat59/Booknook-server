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

async function run() {
  await client.connect();

  const db = client.db("booknook");

  const booksCollection = db.collection("books");
  const borrowsCollection = db.collection("borrows");

  await db.command({ ping: 1 });

  console.log("Connected to MongoDB Atlas");

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

run().catch((err) => {
  console.error("Database connection failed:", err.message);
  process.exit(1);
});

// Get all books
app.get("/books", async (req, res) => {
  try {
    const { search, category, sort } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      query.category = category;
    }

    const order = sort === "oldest" ? 1 : -1;

    const books = await booksCollection
      .find(query)
      .sort({ createdAt: order, _id: order })
      .toArray();

    res.send(books);
  } catch (error) {
    res.status(500).send({ message: "Failed to get books" });
  }
});