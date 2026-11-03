import "dotenv/config";
import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(
  `mongodb+srv://${encodeURIComponent(
    process.env.DB_NAME
  )}:${encodeURIComponent(
    process.env.DB_PASSWORD
  )}@cluster0.ehaajbu.mongodb.net/`
);

async function run() {
  await client.connect();

  const db = client.db("booknook");
  const booksCollection = db.collection("books");
  const borrowsCollection = db.collection("borrows");

  // =================================
  // Books API
  // =================================

  // Get latest 6 books
  app.get("/books/latest", async (req, res) => {
    try {
      const books = await booksCollection
        .find()
        .sort({ createdAt: -1, _id: -1 })
        .limit(6)
        .toArray();

      res.send(books);
    } catch (error) {
      console.error(error);

      res.status(500).send({
        message: "Failed to get latest books",
      });
    }
  });

  // Get all books with search, category and sorting
  app.get("/books", async (req, res) => {
    try {
      const { search, category, sort } = req.query;
      const query = {};

      if (search) {
        const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        query.$or = [
          {
            title: {
              $regex: safe,
              $options: "i",
            },
          },
          {
            author: {
              $regex: safe,
              $options: "i",
            },
          },
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
      console.error(error);

      res.status(500).send({
        message: "Failed to get books",
      });
    }
  });

  // Get books added by a specific user
  app.get("/books/user/:email", async (req, res) => {
    try {
      const email = decodeURIComponent(req.params.email)
        .trim()
        .toLowerCase();

      if (!email) {
        return res.status(400).send({
          message: "User email is required",
        });
      }

      const books = await booksCollection
        .find({ addedBy: email })
        .sort({ createdAt: -1, _id: -1 })
        .toArray();

      res.send(books);
    } catch (error) {
      console.error(error);

      res.status(500).send({
        message: "Failed to get user's books",
      });
    }
  });

  // Get single book by ID
  app.get("/books/:id", async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({
          message: "Invalid book ID",
        });
      }

      const book = await booksCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!book) {
        return res.status(404).send({
          message: "Book not found",
        });
      }

      res.send(book);
    } catch (error) {
      console.error(error);

      res.status(500).send({
        message: "Failed to get book",
      });
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

      if (!title || !author || !category || !addedBy) {
        return res.status(400).send({
          message: "Title, author, category and email are required",
        });
      }

      const email = addedBy.trim().toLowerCase();
      const copies = Number(totalCopies);

      if (!Number.isInteger(copies) || copies < 1) {
        return res.status(400).send({
          message: "Total copies must be at least 1",
        });
      }

      const newBook = {
        title: title.trim(),
        author: author.trim(),
        category,
        description: description || "",
        coverImage: coverImage || "",
        totalCopies: copies,
        availableCopies: copies,
        addedBy: email,
        createdAt: new Date(),
      };

      const result = await booksCollection.insertOne(newBook);

      res.status(201).send({
        success: true,
        message: "Book added successfully",
        insertedId: result.insertedId,
      });
    } catch (error) {
      console.error(error);

      res.status(500).send({
        message: "Failed to add book",
      });
    }
  });

  // Update book
  app.patch("/books/:id", async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({
          message: "Invalid book ID",
        });
      }

      const {
        title,
        author,
        category,
        description,
        coverImage,
        totalCopies,
        availableCopies,
      } = req.body;

      const updateData = {
        title,
        author,
        category,
        description: description || "",
        coverImage: coverImage || "",
        totalCopies: Number(totalCopies),
        availableCopies: Number(availableCopies),
      };

      if (
        !Number.isInteger(updateData.totalCopies) ||
        !Number.isInteger(updateData.availableCopies) ||
        updateData.totalCopies < 0 ||
        updateData.availableCopies < 0 ||
        updateData.availableCopies > updateData.totalCopies
      ) {
        return res.status(400).send({
          message: "Invalid book copies",
        });
      }

      const result = await booksCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: updateData,
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).send({
          message: "Book not found",
        });
      }

      res.send({
        success: true,
        message: "Book updated successfully",
      });
    } catch (error) {
      console.error("Update Error:", error);

      res.status(500).send({
        message: "Failed to update book",
      });
    }
  });

  // Delete book
  app.delete("/books/:id", async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({
          message: "Invalid book ID",
        });
      }

      const result = await booksCollection.deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        return res.status(404).send({
          message: "Book not found",
        });
      }

      res.send({
        success: true,
        message: "Book deleted successfully",
      });
    } catch (error) {
      console.error(error);

      res.status(500).send({
        message: "Failed to delete book",
      });
    }
  });

  // =================================
  // Borrow API
  // =================================

  // Borrow a book or save book view history
  app.post("/borrows", async (req, res) => {
    try {
      const {
        bookId,
        userId,
        userEmail,
        borrowDate,
        returnDate,
        status,
      } = req.body;

      if (!bookId || !userEmail) {
        return res.status(400).send({
          success: false,
          message: "Book ID and user email are required",
        });
      }

      if (!ObjectId.isValid(bookId)) {
        return res.status(400).send({
          success: false,
          message: "Invalid book ID",
        });
      }

      const email = userEmail.trim().toLowerCase();

      // Save book view history
      if (status === "viewed") {
        const historyData = {
          bookId: new ObjectId(bookId),
          userId: userId || null,
          userEmail: email,
          status: "viewed",
          createdAt: new Date(),
        };

        const result = await borrowsCollection.insertOne(historyData);

        return res.send({
          success: true,
          message: "Book view history saved",
          insertedId: result.insertedId,
        });
      }

      // Check if already borrowed
      const alreadyBorrowed = await borrowsCollection.findOne({
        bookId: new ObjectId(bookId),
        userEmail: email,
        status: "borrowed",
      });

      if (alreadyBorrowed) {
        return res.status(400).send({
          message: "You have already borrowed this book",
        });
      }

      // Reduce available copies
      const result = await booksCollection.updateOne(
        {
          _id: new ObjectId(bookId),
          availableCopies: { $gt: 0 },
        },
        {
          $inc: {
            availableCopies: -1,
          },
        }
      );

      if (result.modifiedCount === 0) {
        return res.status(400).send({
          message: "Book is unavailable",
        });
      }

      const borrowData = {
        bookId: new ObjectId(bookId),
        userId: userId || null,
        userEmail: email,
        borrowDate: borrowDate ? new Date(borrowDate) : new Date(),
        returnDate: returnDate ? new Date(returnDate) : null,
        status: "borrowed",
        createdAt: new Date(),
      };

      let borrowResult;

      try {
        borrowResult = await borrowsCollection.insertOne(borrowData);
      } catch (error) {
        // Restore available copies if borrow record insertion fails
        await booksCollection.updateOne(
          { _id: new ObjectId(bookId) },
          { $inc: { availableCopies: 1 } }
        );

        throw error;
      }

      res.status(201).send({
        success: true,
        message: "Book borrowed successfully",
        insertedId: borrowResult.insertedId,
      });
    } catch (error) {
      console.error(error);

      res.status(500).send({
        message: "Failed to borrow book",
      });
    }
  });

  // Get borrow history by user email
  app.get("/borrows/user/:email", async (req, res) => {
    try {
      const email = decodeURIComponent(req.params.email)
        .trim()
        .toLowerCase();

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
      console.error(error);

      res.status(500).send({
        message: "Failed to get user's borrowed books",
      });
    }
  });

  // Return a borrowed book
  app.patch("/borrows/:id/return", async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({
          message: "Invalid borrow ID",
        });
      }

      const borrow = await borrowsCollection.findOne({
        _id: new ObjectId(id),
        status: "borrowed",
      });

      if (!borrow) {
        return res.status(404).send({
          message: "Borrow record not found or already returned",
        });
      }

      const result = await borrowsCollection.updateOne(
        {
          _id: new ObjectId(id),
          status: "borrowed",
        },
        {
          $set: {
            status: "returned",
            returnedAt: new Date(),
          },
        }
      );

      if (result.modifiedCount === 0) {
        return res.status(400).send({
          message: "Book has already been returned",
        });
      }

      await booksCollection.updateOne(
        {
          _id: borrow.bookId,
        },
        {
          $inc: {
            availableCopies: 1,
          },
        }
      );

      res.send({
        success: true,
        message: "Book returned successfully",
        returnedAt: new Date(),
      });
    } catch (error) {
      console.error(error);

      res.status(500).send({
        message: "Failed to return book",
      });
    }
  });

  // Delete returned or viewed borrow history
  app.delete("/borrows/:id", async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({
          success: false,
          message: "Invalid borrow ID",
        });
      }

      const result = await borrowsCollection.deleteOne({
        _id: new ObjectId(id),
        status: { $in: ["returned", "viewed"] },
      });

      if (result.deletedCount === 0) {
        return res.status(404).send({
          success: false,
          message: "Record not found or cannot be deleted",
        });
      }

      res.send({
        success: true,
        message: "Record deleted successfully",
      });
    } catch (error) {
      console.error(error);

      res.status(500).send({
        success: false,
        message: "Failed to delete record",
      });
    }
  });

  await db.command({ ping: 1 });

  console.log("Connected to MongoDB Atlas");
}

// Root API
app.get("/", (req, res) => {
  res.send("BookNook API is running");
});

// Start server
run()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  });