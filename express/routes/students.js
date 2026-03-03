const router = require("express").Router();
const Student = require("../models/Student");

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
