# 📚 BookNook Server

BookNook is a backend RESTful API built for book management and a borrowing system.

## ⚡ Key Features

- **Book CRUD:** Add, view, update, and delete books.
- **Search & Filter:** Search by title/author, filter by category, and sort.
- **Borrow & Return:** Automatic stock count (`availableCopies`) management.
- **User History:** Track books added and borrowed by specific users.

## 📦 Installation

```bash
npm install express mongodb cors dotenv
```

## 💻 Run Local Server

Create a `.env` file in the root folder and add your credentials:

```env
PORT=5000
DB_NAME=your_db_username
DB_PASSWORD=your_db_password
```

Start the local server:

```bash
npm start
```

## 🌐 Endpoints & URLs

- **Local:** http://localhost:5000
- **Live:** https://booknook-server-5hv3.onrender.com

| Method | Endpoint                | Description                                   |
| ------ | ----------------------- | --------------------------------------------- |
| GET    | `/`                     | Server running status check                   |
| GET    | `/books`                | Get all books (with search & category filters) |
| GET    | `/books/latest`         | Get latest 6 books                            |
| GET    | `/books/:id`            | Get single book by ID                         |
| POST   | `/books`                | Add a new book                                |
| PATCH  | `/books/:id`            | Update book details/copies                    |
| DELETE | `/books/:id`            | Delete a book                                 |
| POST   | `/borrows`              | Borrow a book or save view history            |
| GET    | `/borrows/user/:email`  | Get user's borrowed books list                |
| PATCH  | `/borrows/:id/return`   | Return a borrowed book                        |
| DELETE | `/borrows/:id`          | Delete view or returned history record        |
