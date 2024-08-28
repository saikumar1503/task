const { gql } = require("apollo-server-express");

const taskSchema = gql`
  type Task {
    _id: ID!
    title: String!
    description: String
    status: String!
    assignedUsers: [User]
    subtasks: [Task]
    dependencies: [Task]
    version: Int
    createdAt: String
    updatedAt: String
  }

  type User {
    _id: ID!
    name: String!
    email: String!
    tasks: [Task]
  }

  type Query {
    getTask(id: ID!): Task
    getTasks: [Task]
    fetchTasks(status: String, assignee: ID, dueDate: String): [Task]
    getTaskDetails(id: ID!): Task
  }

  type Mutation {
    createTask(
      title: String!
      description: String
      status: String!
      assignedUsers: [ID]
      subtasks: [ID]
      dependencies: [ID]
      version: Int
    ): Task!

    updateTask(
      id: ID!
      title: String
      description: String
      status: String
      assignedUsers: [ID]
      subtasks: [ID]
      dependencies: [ID]
      version: Int
    ): Task!

    deleteTask(id: ID!): Boolean

    createSubtask(
      parentId: ID!
      title: String!
      description: String
      status: String!
      assignedUsers: [ID]
      subtasks: [ID]
      dependencies: [ID]
      version: Int
    ): Task!

    updateSubtask(
      id: ID!
      title: String
      description: String
      status: String
      assignedUsers: [ID]
      subtasks: [ID]
      dependencies: [ID]
      version: Int
    ): Task!

    deleteSubtask(id: ID!): Boolean

    assignUsersToTask(taskId: ID!, userIds: [ID]!): Task!
    assignUsersToSubtask(subtaskId: ID!, userIds: [ID]!): Task!
  }
`;

module.exports = taskSchema;
