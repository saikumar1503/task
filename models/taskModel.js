const mongoose = require("mongoose");
const { Schema } = mongoose;

// Task Schema
const taskSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      enum: ["To Do", "In Progress", "Done"],
      default: "To Do",
    },
    subtasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }], // References other tasks as subtasks
    dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }], // Task dependencies
    version: { type: Number, default: 1 },
    versionHistory: [
      {
        version: { type: Number },
        changes: { type: Map, of: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;
