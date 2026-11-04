
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Create a connection pool to MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10
});

// Validate the student request body
function validStudent(body) {
    return (
        typeof body.name === "string" &&
        body.name.trim().length > 0 &&
        Number.isInteger(body.age) &&
        body.age > 0 &&
        typeof body.course === "string" &&
        body.course.trim().length > 0
    );
}

// 1. GET all students
app.get("/students", async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            "SELECT * FROM students ORDER BY id"
        );

        res.status(200).json(rows);
    } catch (err) {
        next(err);
    }
});

// 2. GET one student by ID
app.get("/students/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid student ID"
            });
        }

        const [rows] = await pool.execute(
            "SELECT * FROM students WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.status(200).json(rows[0]);
    } catch (err) {
        next(err);
    }
});

// 3. POST a new student
app.post("/students", async (req, res, next) => {
    try {
        if (!validStudent(req.body)) {
            return res.status(400).json({
                message: "Valid name, positive integer age, and course are required"
            });
        }

        const { name, age, course } = req.body;

        const [result] = await pool.execute(
            "INSERT INTO students (name, age, course) VALUES (?, ?, ?)",
            [name.trim(), age, course.trim()]
        );

        const [rows] = await pool.execute(
            "SELECT * FROM students WHERE id = ?",
            [result.insertId]
        );

        res.status(201).json({
            message: "Student added successfully",
            student: rows[0]
        });
    } catch (err) {
        next(err);
    }
});

// 4. PUT: Update an existing student
app.put("/students/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid student ID"
            });
        }

        if (!validStudent(req.body)) {
            return res.status(400).json({
                message: "Valid name, positive integer age, and course are required"
            });
        }

        const { name, age, course } = req.body;

        const [result] = await pool.execute(
            `UPDATE students
             SET name = ?, age = ?, course = ?
             WHERE id = ?`,
            [name.trim(), age, course.trim(), id]
        );

        if (result.affectedRows === 0) {
            const [rows] = await pool.execute(
                "SELECT id FROM students WHERE id = ?",
                [id]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    message: "Student not found"
                });
            }
        }

        const [rows] = await pool.execute(
            "SELECT * FROM students WHERE id = ?",
            [id]
        );

        res.status(200).json({
            message: "Student updated successfully",
            student: rows[0]
        });
    } catch (err) {
        next(err);
    }
});

// 5. DELETE a student
app.delete("/students/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid student ID"
            });
        }

        const [result] = await pool.execute(
            "DELETE FROM students WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.status(200).json({
            message: "Student deleted successfully"
        });
    } catch (err) {
        next(err);
    }
});

// Handle invalid JSON bodies
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 &&
        "body" in err) {
        return res.status(400).json({
            message: "Invalid JSON body"
        });
    }

    console.error(err);
    res.status(500).json({
        message: "Internal server error"
    });
});

// Start only after confirming database connectivity
async function startServer() {
    try {
        await pool.query("SELECT 1");

        console.log("Connected to MySQL successfully");

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error("Database connection failed:", err.message);
        process.exit(1);
    }
}

startServer();
