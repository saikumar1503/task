const Task = require("./../../models/taskModel");
const User = require("./../../models/userModel");
const { verifyToken } = require("../../utils/jwtUtils");

const taskResolver = {
  Query: {
    getTask: async (_, { id }, { token }) => {
      const user = verifyToken(token);

      const task = await Task.findById(id)
        .populate("assignedUsers")
        .populate("subtasks")
        .populate("dependencies");
      if (!task) throw new Error("Task not found");

      // RBAC: Check if the user has permission to view the task
      if (
        !user.roles.includes("Admin") &&
        !user.roles.includes("Project Manager") &&
        !task.assignedUsers.some((u) => u._id.toString() === user.sub)
      ) {
        throw new Error("Access Denied");
      }

      return task;
    },

    getTasks: async (_, __, { token }) => {
      const user = verifyToken(token);

      // RBAC: Only Admin and Project Manager can view all tasks
      if (
        user.roles.includes("Admin") ||
        user.roles.includes("Project Manager")
      ) {
        return await Task.find()
          .populate("assignedUsers")
          .populate("subtasks")
          .populate("dependencies");
      }

      // Team Lead and Team Member can only view their assigned tasks
      return await Task.find({ assignedUsers: user.sub })
        .populate("assignedUsers")
        .populate("subtasks")
        .populate("dependencies");
    },
    fetchTasks: async (_, { status, assignee, dueDate }, { token }) => {
      const user = verifyToken(token);

      // Build the filter query based on provided arguments
      const filter = {};

      if (status) {
        filter.status = status;
      }

      if (assignee) {
        filter.assignedUsers = assignee;
      }

      if (dueDate) {
        const dueDateObj = new Date(dueDate);
        // You may want to include a range for due dates
        filter.dueDate = { $gte: dueDateObj }; // Tasks with due dates greater than or equal to provided date
      }

      // RBAC: Restrict access based on roles
      if (
        !user.roles.includes("Admin") &&
        !user.roles.includes("Project Manager") &&
        !user.roles.includes("Team Lead")
      ) {
        // If the user is a Team Member, only fetch tasks assigned to them
        filter.assignedUsers = user.sub;
      }

      // Fetch tasks based on the filter
      const tasks = await Task.find(filter)
        .populate("assignedUsers")
        .populate("subtasks")
        .populate("dependencies");
      return tasks;
    },
    getTaskDetails: async (_, { id }, { token }) => {
      const user = verifyToken(token);

      // Fetch the task and populate related data
      const task = await Task.findById(id)
        .populate("assignedUsers")
        .populate("subtasks")
        .populate("dependencies");

      if (!task) throw new Error("Task not found");

      // RBAC: Check if the user has permission to view the task
      if (
        !user.roles.includes("Admin") &&
        !user.roles.includes("Project Manager") &&
        !task.assignedUsers.some((u) => u._id.toString() === user.sub)
      ) {
        throw new Error("Access Denied");
      }

      return task;
    },
  },

  Mutation: {
    createTask: async (
      _,
      {
        title,
        description,
        status,
        assignedUsers,
        subtasks,
        dependencies,
        version,
      },
      { tokenId }
    ) => {
      console.log(tokenId);
      const user = verifyToken(tokenId);

      // RBAC: Only Admin and Project Manager can create tasks
      if (
        !user.roles.includes("Admin") &&
        !user.roles.includes("Project Manager")
      ) {
        throw new Error("Access Denied");
      }

      const task = new Task({
        title,
        description,
        status,
        assignedUsers,
        subtasks,
        dependencies,
        version,
      });

      await task.save();

      // Update the User model to add this task to assignedUsers
      await User.updateMany(
        { _id: { $in: assignedUsers } },
        { $push: { tasks: task._id } }
      );

      // Populate the task with user details
      (await task.populate("assignedUsers")).populate("subtasks");

      return task;
    },

    updateTask: async (
      _,
      {
        id,
        title,
        description,
        status,
        assignedUsers,
        subtasks,
        dependencies,
        version,
      },
      { token }
    ) => {
      const user = verifyToken(token);

      const task = await Task.findById(id);
      if (!task) throw new Error("Task not found");

      // RBAC: Only Admin, Project Manager, or assigned users can update tasks
      if (
        !user.roles.includes("Admin") &&
        !user.roles.includes("Project Manager") &&
        !task.assignedUsers.some((u) => u._id.toString() === user.sub)
      ) {
        throw new Error("Access Denied");
      }

      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (status !== undefined) task.status = status;
      if (assignedUsers !== undefined) {
        // Remove previous assignments
        await User.updateMany(
          { _id: { $in: task.assignedUsers } },
          { $pull: { tasks: id } }
        );
        // Add new assignments
        await User.updateMany(
          { _id: { $in: assignedUsers } },
          { $push: { tasks: id } }
        );
        task.assignedUsers = assignedUsers;
      }
      if (subtasks !== undefined) task.subtasks = subtasks;
      if (dependencies !== undefined) task.dependencies = dependencies;
      if (version !== undefined) task.version = version;

      await task.save();
      return task;
    },

    deleteTask: async (_, { id }, { token }) => {
      const user = verifyToken(token);

      const task = await Task.findById(id);
      if (!task) throw new Error("Task not found");

      // RBAC: Only Admin can delete tasks
      if (!user.roles.includes("Admin")) {
        throw new Error("Access Denied");
      }

      // Remove the task from all assigned users
      await User.updateMany(
        { _id: { $in: task.assignedUsers } },
        { $pull: { tasks: id } }
      );

      await task.remove();
      return true;
    },

    createSubtask: async (
      _,
      {
        parentId,
        title,
        description,
        status,
        assignedUsers,
        subtasks,
        dependencies,
        version,
      },
      { token }
    ) => {
      const user = verifyToken(token);

      // Find the parent task to ensure it exists
      const parentTask = await Task.findById(parentId);
      if (!parentTask) throw new Error("Parent task not found");

      // RBAC: Only Admin, Project Manager, or assigned users of the parent task can create subtasks
      if (
        !user.roles.includes("Admin") &&
        !user.roles.includes("Project Manager") &&
        !parentTask.assignedUsers.some((u) => u._id.toString() === user.sub)
      ) {
        throw new Error("Access Denied");
      }

      const subtask = new Task({
        title,
        description,
        status,
        assignedUsers,
        subtasks,
        dependencies,
        version,
      });
      await subtask.save();

      // Add the new subtask to the parent task's subtasks array
      parentTask.subtasks.push(subtask._id);
      await parentTask.save();

      // Update the User model to add this subtask to assignedUsers
      await User.updateMany(
        { _id: { $in: assignedUsers } },
        { $push: { tasks: subtask._id } }
      );

      return subtask;
    },

    updateSubtask: async (
      _,
      {
        id,
        title,
        description,
        status,
        assignedUsers,
        subtasks,
        dependencies,
        version,
      },
      { token }
    ) => {
      const user = verifyToken(token);

      const subtask = await Task.findById(id);
      if (!subtask) throw new Error("Subtask not found");

      // Find the parent task to ensure the user has permission
      const parentTask = await Task.findOne({ subtasks: id });
      if (!parentTask) throw new Error("Parent task not found");

      // RBAC: Only Admin, Project Manager, or assigned users of the parent task can update subtasks
      if (
        !user.roles.includes("Admin") &&
        !user.roles.includes("Project Manager") &&
        !parentTask.assignedUsers.some((u) => u._id.toString() === user.sub)
      ) {
        throw new Error("Access Denied");
      }

      if (title !== undefined) subtask.title = title;
      if (description !== undefined) subtask.description = description;
      if (status !== undefined) subtask.status = status;
      if (assignedUsers !== undefined) {
        // Remove previous assignments
        await User.updateMany(
          { _id: { $in: subtask.assignedUsers } },
          { $pull: { tasks: id } }
        );
        // Add new assignments
        await User.updateMany(
          { _id: { $in: assignedUsers } },
          { $push: { tasks: id } }
        );
        subtask.assignedUsers = assignedUsers;
      }
      if (subtasks !== undefined) subtask.subtasks = subtasks;
      if (dependencies !== undefined) subtask.dependencies = dependencies;
      if (version !== undefined) subtask.version = version;

      await subtask.save();
      return subtask;
    },

    deleteSubtask: async (_, { id }, { token }) => {
      const user = verifyToken(token);

      const subtask = await Task.findById(id);
      if (!subtask) throw new Error("Subtask not found");

      // Find the parent task to ensure the user has permission
      const parentTask = await Task.findOne({ subtasks: id });
      if (!parentTask) throw new Error("Parent task not found");

      // RBAC: Only Admin, Project Manager, or assigned users of the parent task can delete subtasks
      if (
        !user.roles.includes("Admin") &&
        !user.roles.includes("Project Manager") &&
        !parentTask.assignedUsers.some((u) => u._id.toString() === user.sub)
      ) {
        throw new Error("Access Denied");
      }

      // Remove the subtask from the parent task's subtasks array
      parentTask.subtasks.pull(id);
      await parentTask.save();

      // Remove the subtask from all assigned users
      await User.updateMany(
        { _id: { $in: subtask.assignedUsers } },
        { $pull: { tasks: id } }
      );

      await subtask.remove();
      return true;
    },

    assignUsersToTask: async (_, { taskId, userIds }, { token }) => {
      const user = verifyToken(token);

      const task = await Task.findById(taskId);
      if (!task) throw new Error("Task not found");

      // RBAC: Only Admin or Project Manager can assign users to tasks
      if (
        !user.roles.includes("Admin") &&
        !user.roles.includes("Project Manager")
      ) {
        throw new Error("Access Denied");
      }

      // Remove previous assignments
      await User.updateMany(
        { _id: { $in: task.assignedUsers } },
        { $pull: { tasks: taskId } }
      );

      // Add new assignments
      await User.updateMany(
        { _id: { $in: userIds } },
        { $push: { tasks: taskId } }
      );

      task.assignedUsers = userIds;
      await task.save();

      return task;
    },

    assignUsersToSubtask: async (_, { subtaskId, userIds }, { token }) => {
      const user = verifyToken(token);

      const subtask = await Task.findById(subtaskId);
      if (!subtask) throw new Error("Subtask not found");

      // Find the parent task to ensure the user has permission
      const parentTask = await Task.findOne({ subtasks: subtaskId });
      if (!parentTask) throw new Error("Parent task not found");

      // RBAC: Only Admin, Project Manager, or assigned users of the parent task can assign users to subtasks
      if (
        !user.roles.includes("Admin") &&
        !user.roles.includes("Project Manager") &&
        !parentTask.assignedUsers.some((u) => u._id.toString() === user.sub)
      ) {
        throw new Error("Access Denied");
      }

      // Remove previous assignments
      await User.updateMany(
        { _id: { $in: subtask.assignedUsers } },
        { $pull: { tasks: subtaskId } }
      );

      // Add new assignments
      await User.updateMany(
        { _id: { $in: userIds } },
        { $push: { tasks: subtaskId } }
      );

      subtask.assignedUsers = userIds;
      await subtask.save();

      return subtask;
    },
  },
};

module.exports = taskResolver;
