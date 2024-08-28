require("dotenv").config();
const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const mongoose = require("mongoose");
const authSchema = require("./graphql/schema/userSchema");
const taskSchema = require("./graphql/schema/taskSchema");
const authResolver = require("./graphql/resolvers/userResolver");
const taskResolver = require("./graphql/resolvers/taskResolver");
const jwt = require("jsonwebtoken");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const app = express();

// Apollo Server Setup
const server = new ApolloServer({
  typeDefs: [authSchema, taskSchema],
  resolvers: [authResolver, taskResolver],
  context: ({ req }) => {
    // Authentication and user role can be added here
    const token = req.headers.authorization || "";
    // console.log(token);
    let user = null;

    const tokenId = token.split(" ")[1];
    // console.log(tokenId);
    // try {
    //   user = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    // } catch (err) {
    //   console.error(err);
    // }

    return { tokenId };
  },
});

const startServer = async () => {
  // Start Apollo Server
  await server.start();

  // Apply middleware to Express
  server.applyMiddleware({ app });

  // Start Express Server
  app.listen({ port: process.env.PORT || 4000 }, () =>
    console.log(`Server ready at http://localhost:4000${server.graphqlPath}`)
  );
};

startServer();
