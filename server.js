require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Error:", err));

// Schema
const registrationSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  projectTitle: String,
  productionDate: String,
  trailerLink: String,
  fullFilmLink: String,
  cast: String,
  producer: String,
  directorsByte: String
}, { timestamps: true });

const Registration = mongoose.model("Registration", registrationSchema);

// 🔥 Change Stream (Real-time sync)
Registration.watch().on("change", async (change) => {
  try {

    if (change.operationType === "insert") {
      await axios.post(process.env.GOOGLE_SCRIPT_URL, {
        type: "insert",
        data: change.fullDocument
      });
    }

    else if (change.operationType === "update") {
      const updatedDoc = await Registration.findById(change.documentKey._id);

      await axios.post(process.env.GOOGLE_SCRIPT_URL, {
        type: "update",
        data: updatedDoc
      });
    }

  } catch (err) {
    console.error("Sync error:", err.message);
  }
});

// CREATE
app.post("/register", async (req, res) => {
  try {
    const registration = await Registration.create(req.body);
    res.json(registration);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE
app.put("/update/:id", async (req, res) => {
  try {
    const updated = await Registration.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE (important: send email before deletion)
app.delete("/delete/:id", async (req, res) => {
  try {
    const doc = await Registration.findById(req.params.id);

    await axios.post(process.env.GOOGLE_SCRIPT_URL, {
      type: "delete",
      email: doc.email
    });

    await Registration.findByIdAndDelete(req.params.id);

    res.json({ message: "Deleted & synced" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔄 FULL RESYNC
app.get("/resync", async (req, res) => {
  try {
    const allData = await Registration.find();

    await axios.post(process.env.GOOGLE_SCRIPT_URL, {
      type: "resync",
      data: allData
    });

    res.json({ message: "Sheet fully resynced" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port " + PORT));