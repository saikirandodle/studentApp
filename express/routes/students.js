const router = require("express").Router();
const multer = require("multer");
const XLSX = require("xlsx");
const { parse } = require("csv-parse/sync");
const Student = require("../models/Student");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

const REQUIRED_COLUMNS = ["name", "email", "course", "department", "marks"];

function normalizeHeader(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");
}

function normalizeDepartment(value) {
    const normalized = String(value || "").trim().toUpperCase();
    if (normalized === "CSE" || normalized === "IT" || normalized === "ECE") {
        return normalized;
    }
    return null;
}

function normalizeRow(row) {
    const mapped = {};

    for (const [key, value] of Object.entries(row || {})) {
        mapped[normalizeHeader(key)] = value;
    }

    const name = String(mapped.name || "").trim();
    const email = String(mapped.email || "").trim().toLowerCase();
    const course = String(mapped.course || "").trim();
    const department = normalizeDepartment(mapped.department);
    const marks = Number(mapped.marks);

    const errors = [];

    if (name.length < 2) {
        errors.push("name must be at least 2 characters");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push("email is invalid");
    }

    if (course.length < 2) {
        errors.push("course must be at least 2 characters");
    }

    if (!department) {
        errors.push("department must be one of CSE, IT, ECE");
    }

    if (!Number.isFinite(marks) || marks < 0 || marks > 100) {
        errors.push("marks must be between 0 and 100");
    }

    return {
        student: {
            name,
            email,
            course,
            department,
            marks
        },
        errors
    };
}

function parseUploadedRows(file) {
    const fileName = String(file?.originalname || "").toLowerCase();

    if (fileName.endsWith(".csv")) {
        return parse(file.buffer.toString("utf8"), {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });
    }

    if (fileName.endsWith(".xlsx")) {
        const workbook = XLSX.read(file.buffer, { type: "buffer" });
        const firstSheetName = workbook.SheetNames[0];
        const firstSheet = workbook.Sheets[firstSheetName];
        return XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
    }

    throw new Error("Only .csv and .xlsx files are supported");
}

router.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Upload a .csv or .xlsx file" });
        }

        const uploadedFileName = String(req.file.originalname || "").toLowerCase();
        if (!uploadedFileName.endsWith(".csv") && !uploadedFileName.endsWith(".xlsx")) {
            return res.status(400).json({ message: "Only .csv and .xlsx files are supported" });
        }

        const rows = parseUploadedRows(req.file);
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ message: "File does not contain any student rows" });
        }

        const rowKeys = Object.keys(rows[0] || {}).map(normalizeHeader);
        const missingColumns = REQUIRED_COLUMNS.filter((column) => !rowKeys.includes(column));
        if (missingColumns.length > 0) {
            return res.status(400).json({
                message: `Missing required columns: ${missingColumns.join(", ")}`
            });
        }

        const validStudents = [];
        const invalidRows = [];
        const seenEmails = new Set();

        rows.forEach((row, index) => {
            const { student, errors } = normalizeRow(row);
            if (errors.length > 0) {
                invalidRows.push({ row: index + 2, errors });
                return;
            }

            if (seenEmails.has(student.email)) {
                invalidRows.push({ row: index + 2, errors: ["duplicate email inside file"] });
                return;
            }

            seenEmails.add(student.email);
            validStudents.push({ row: index + 2, student });
        });

        if (validStudents.length === 0) {
            return res.status(400).json({
                message: "No valid student rows found",
                insertedCount: 0,
                skippedCount: invalidRows.length,
                invalidRows
            });
        }

        const existingEmails = await Student.find(
            { email: { $in: validStudents.map((item) => item.student.email) } },
            { email: 1, _id: 0 }
        ).lean();

        const existingEmailSet = new Set(existingEmails.map((item) => item.email));
        const toInsert = [];

        validStudents.forEach((entry) => {
            const { row, student } = entry;
            if (existingEmailSet.has(student.email)) {
                invalidRows.push({ row, errors: ["email already exists in database"] });
                return;
            }
            toInsert.push(student);
        });

        if (toInsert.length > 0) {
            await Student.insertMany(toInsert, { ordered: false });
        }

        return res.status(201).json({
            message: "Student upload processed successfully",
            insertedCount: toInsert.length,
            skippedCount: invalidRows.length,
            invalidRows
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to upload students",
            error: error.message
        });
    }
});

router.post("/", async (req, res) => {
    try {
        const { name, email, course, department, marks } = req.body;

        if (!name || !email || !course || !department || marks === undefined) {
            return res.status(400).json({ message: "name, email, course, department and marks are required" });
        }

        const existingStudent = await Student.findOne({ email: email.toLowerCase().trim() });
        if (existingStudent) {
            return res.status(409).json({ message: "Student email already exists" });
        }

        const student = await Student.create({
            name,
            email,
            course,
            department,
            marks
        });

        return res.status(201).json({ message: "Student created", student });
    } catch (error) {
        return res.status(500).json({ message: "Failed to create student", error: error.message });
    }
});

router.get("/", async (req, res) => {
    try {
        const students = await Student.find().sort({ createdAt: -1 });
        return res.json(students);
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch students", error: error.message });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        return res.json(student);
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch student", error: error.message });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const { name, email, course, department, marks } = req.body;

        if (!name || !email || !course || !department || marks === undefined) {
            return res.status(400).json({ message: "name, email, course, department and marks are required" });
        }

        const emailOwner = await Student.findOne({ email: email.toLowerCase().trim(), _id: { $ne: req.params.id } });
        if (emailOwner) {
            return res.status(409).json({ message: "Student email already exists" });
        }

        const updatedStudent = await Student.findByIdAndUpdate(
            req.params.id,
            { name, email, course, department, marks },
            { new: true, runValidators: true }
        );

        if (!updatedStudent) {
            return res.status(404).json({ message: "Student not found" });
        }

        return res.json({ message: "Student updated", student: updatedStudent });
    } catch (error) {
        return res.status(500).json({ message: "Failed to update student", error: error.message });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const deletedStudent = await Student.findByIdAndDelete(req.params.id);
        if (!deletedStudent) {
            return res.status(404).json({ message: "Student not found" });
        }
        return res.json({ message: "Student deleted" });
    } catch (error) {
        return res.status(500).json({ message: "Failed to delete student", error: error.message });
    }
});

module.exports = router;
