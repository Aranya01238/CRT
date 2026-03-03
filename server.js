require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

const registrationSchema = new mongoose.Schema({
  name: String,
  email: String,
  projectTitle: String,
  productionDate: String,
  trailerLink: String,
  fullFilmLink: String,
  cast: String,
  producer: String,
  directorsByte: String
}, { timestamps: true });

const Registration = mongoose.model("Registration", registrationSchema);

// 🔥 Change Stream
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

    else if (change.operationType === "delete") {
      // Need email before delete
      // So we fetch from change stream's documentKey? Not possible.
      // Therefore we store email before delete OR handle differently.
      console.log("Delete detected — email required for sheet removal");
    }

  } catch (err) {
    console.error("Sync error:", err.message);
  }
});

// API Routes
app.post("/register", async (req, res) => {
  try {
    const registration = await Registration.create(req.body);
    res.json(registration);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port " + PORT));