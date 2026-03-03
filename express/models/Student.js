const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    course: {
        type: String,
        required: true,
        trim: true
    },
    department: {
        type: String,
        required: true,
        trim: true
    },
    marks: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Student", StudentSchema);
