const { gql } = require("apollo-server-express");

const authSchema = gql`
  type User {
    _id: ID!
    name: String!
    email: String!
    roles: [String!]! # Update this line to support multiple roles if needed
    assignedTasks: [Task]
  }

  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
  }

  type Query {
    login(email: String!, password: String!): AuthPayload!
    refreshToken(refreshToken: String!): AuthPayload!
    getUserDetails(id: ID!): User
  }

  type Mutation {
    signup(
      name: String!
      email: String!
      password: String!
      roles: [String!]!
    ): AuthPayload! # Added roles parameter
  }
`;

module.exports = authSchema;
