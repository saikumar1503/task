const mongoose = require("mongoose");
const { Schema } = mongoose;

// User Schema
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    roles: {
      type: [String],
      enum: ["Admin", "Project Manager", "Team Lead", "Team Member"],
      default: ["Team Member"],
    },
    assignedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }], // References tasks assigned to the user
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
