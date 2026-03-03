require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ==========================
// MongoDB Connection
// ==========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Error:", err));

// ==========================
// Schema
// ==========================
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

// ==========================
// Sync Function
// ==========================
async function syncToSheet(type, payload) {
  try {
    await axios.post(process.env.GOOGLE_SCRIPT_URL, payload);
    console.log("Synced:", type);
  } catch (err) {
    console.error("Sheet Sync Error:", err.message);
  }
}

// ==========================
// Change Stream (Auto Update)
// ==========================
function startChangeStream() {

  Registration.watch([], { fullDocument: "updateLookup" })
  .on("change", async (change) => {

    console.log("Change detected:", change.operationType);

    if (change.operationType === "insert") {
      await syncToSheet("insert", {
        type: "insert",
        data: change.fullDocument
      });
    }

    if (change.operationType === "update") {
      await syncToSheet("update", {
        type: "update",
        data: change.fullDocument
      });
    }

  })
  .on("error", (err) => {
    console.error("Change Stream Error:", err);
    setTimeout(startChangeStream, 5000); // Auto reconnect
  });
}

startChangeStream();

// ==========================
// Initial Full Resync (Auto)
// ==========================
async function initialResync() {
  try {
    const allData = await Registration.find();

    await syncToSheet("resync", {
      type: "resync",
      data: allData
    });

    console.log("Initial full resync completed");

  } catch (err) {
    console.error("Initial resync error:", err.message);
  }
}

initialResync();

// ==========================
// Routes
// ==========================

// Create
app.post("/register", async (req, res) => {
  try {
    const doc = await Registration.create(req.body);
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update
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

// Delete
app.delete("/delete/:id", async (req, res) => {
  try {
    const doc = await Registration.findById(req.params.id);

    await syncToSheet("delete", {
      type: "delete",
      email: doc.email
    });

    await Registration.findByIdAndDelete(req.params.id);

    res.json({ message: "Deleted & synced" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test route
app.get("/", (req, res) => {
  res.send("Server Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port " + PORT));