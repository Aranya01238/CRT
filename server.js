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
  cast: String,
  producer: String
}, { timestamps: true });

const Registration = mongoose.model("Registration", registrationSchema);

// 🔥 Real-time Change Stream
Registration.watch().on("change", async (change) => {
  try {
    if (change.operationType === "insert") {
      const doc = change.fullDocument;

      await axios.post(process.env.GOOGLE_SCRIPT_URL, {
        type: "insert",
        data: doc
      });

      console.log("Inserted & synced");

    } else if (change.operationType === "update") {
      const updatedDoc = await Registration.findById(change.documentKey._id);

      await axios.post(process.env.GOOGLE_SCRIPT_URL, {
        type: "update",
        data: updatedDoc
      });

      console.log("Updated & synced");
    }

  } catch (err) {
    console.error("Sync error:", err.message);
  }
});

// Normal API
app.post("/register", async (req, res) => {
  try {
    const registration = new Registration(req.body);
    await registration.save();
    res.json({ message: "Saved" });
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port " + PORT));