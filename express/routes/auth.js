const router = require("express").Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// REGISTER
router.post("/register", async (req, res) => {
    console.log("Received registration request:", req.body);
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "name, email and password are required" });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return res.status(409).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            password: hashedPassword
        });

        await newUser.save();
        return res.status(201).json({ message: "User Registered Successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Registration failed", error: error.message });
    }
});

// LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "email and password are required" });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(400).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid Password" });

        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email
        };

        return res.json({
            message: "Login Successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        return res.status(500).json({ message: "Login failed", error: error.message });
    }
});

// LOGOUT
router.get("/logout", (req, res) => {
    req.session.destroy();
    res.json({ message: "Logged out" });
});

module.exports = router;