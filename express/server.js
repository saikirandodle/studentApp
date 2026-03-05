const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const cors = require("cors");

const app = express();

app.use(express.json());

app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
});

app.use(cors({
    origin: "http://localhost:4200",
    credentials: true
}));

app.use(session({
    secret: "mysecretkey",
    resave: false,
    saveUninitialized: false
}));

mongoose.connect("mongodb://127.0.0.1:27017/loginDB")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/students", require("./routes/students"));

app.listen(5000, () => console.log("Server running on port 5000"));