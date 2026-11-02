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

// Latest 6 books
app.get("/books/latest", async (req, res) => {
  try {
    const books = await booksCollection
      .find()
      .sort({ createdAt: -1, _id: -1 })
      .limit(6)
      .toArray();

    res.send(books);
  } catch (error) {
    res.status(500).send({ message: "Failed to get latest books" });
  }
});

// Get books by user
app.get("/books/user/:email", async (req, res) => {
  try {
    const books = await booksCollection
      .find({ addedBy: req.params.email })
      .sort({ createdAt: -1, _id: -1 })
      .toArray();

    res.send(books);
  } catch (error) {
    res.status(500).send({ message: "Failed to get user's books" });
  }
});

// Get single book
app.get("/books/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid book ID" });
    }

    const book = await booksCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!book) {
      return res.status(404).send({ message: "Book not found" });
    }

    res.send(book);
  } catch (error) {
    res.status(500).send({ message: "Failed to get book" });
  }
});

// Add new book
app.post("/books", async (req, res) => {
  try {
    const {
      title,
      author,
      category,
      description,
      coverImage,
      totalCopies,
      addedBy,
    } = req.body;

    if (!title || !author || !category) {
      return res.status(400).send({
        message: "Title, author and category are required",
      });
    }

    const copies = Number(totalCopies);

    if (!Number.isInteger(copies) || copies < 1) {
      return res.status(400).send({
        message: "Total copies must be at least 1",
      });
    }

    const newBook = {
      title,
      author,
      category,
      description: description || "",
      coverImage: coverImage || "",
      totalCopies: copies,
      availableCopies: copies,
      addedBy: addedBy || null,
      createdAt: new Date(),
    };

    const result = await booksCollection.insertOne(newBook);

    res.status(201).send({
      success: true,
      message: "Book added successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    res.status(500).send({ message: "Failed to add book" });
  }
});

// Update book
app.patch("/books/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid book ID" });
    }

    const allowedFields = [
      "title",
      "author",
      "category",
      "description",
      "coverImage",
    ];

    const updateData = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).send({
        message: "No valid fields to update",
      });
    }

    const result = await booksCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Book not found" });
    }

    res.send({
      success: true,
      message: "Book updated successfully",
    });
  } catch (error) {
    res.status(500).send({ message: "Failed to update book" });
  }
});

// Delete book
app.delete("/books/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid book ID" });
    }

    const result = await booksCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Book not found" });
    }

    res.send({
      success: true,
      message: "Book deleted successfully",
    });
  } catch (error) {
    res.status(500).send({ message: "Failed to delete book" });
  }
});

// Borrow a book
app.post("/borrows", async (req, res) => {
  try {
    const { bookId, userEmail, borrowDate, returnDate } = req.body;

    if (!bookId || !userEmail || !borrowDate || !returnDate) {
      return res.status(400).send({
        message: "All borrow information is required",
      });
    }

    if (!ObjectId.isValid(bookId)) {
      return res.status(400).send({ message: "Invalid book ID" });
    }

    if (
      !Number.isFinite(new Date(borrowDate).getTime()) ||
      !Number.isFinite(new Date(returnDate).getTime()) ||
      new Date(returnDate) <= new Date(borrowDate)
    ) {
      return res.status(400).send({
        message: "Invalid borrow or return date",
      });
    }

    const alreadyBorrowed = await borrowsCollection.findOne({
      bookId: new ObjectId(bookId),
      userEmail,
      status: "borrowed",
    });

    if (alreadyBorrowed) {
      return res.status(400).send({
        message: "You have already borrowed this book",
      });
    }

    const result = await booksCollection.updateOne(
      {
        _id: new ObjectId(bookId),
        availableCopies: { $gt: 0 },
      },
      {
        $inc: { availableCopies: -1 },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).send({
        message: "Book is unavailable",
      });
    }

    const borrowData = {
      bookId: new ObjectId(bookId),
      userEmail,
      borrowDate: new Date(borrowDate),
      returnDate: new Date(returnDate),
      status: "borrowed",
      createdAt: new Date(),
    };

    try {
      const borrowResult = await borrowsCollection.insertOne(borrowData);

      res.status(201).send({
        success: true,
        message: "Book borrowed successfully",
        insertedId: borrowResult.insertedId,
      });
    } catch (error) {
      await booksCollection.updateOne(
        { _id: new ObjectId(bookId) },
        { $inc: { availableCopies: 1 } }
      );

      throw error;
    }
  } catch (error) {
    res.status(500).send({
      message: "Failed to borrow book",
    });
  }
});

// Get borrowed books by user email
app.get("/borrows/user/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const borrows = await borrowsCollection
      .aggregate([
        {
          $match: {
            userEmail: email,
          },
        },
        {
          $lookup: {
            from: "books",
            localField: "bookId",
            foreignField: "_id",
            as: "book",
          },
        },
        {
          $unwind: {
            path: "$book",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
      ])
      .toArray();

    res.send(borrows);
  } catch (error) {
    res.status(500).send({
      message: "Failed to get user's borrowed books",
    });
  }
});