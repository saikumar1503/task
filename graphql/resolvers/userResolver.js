// resolvers/userResolver.js

const User = require("../../models/userModel");
const bcrypt = require("bcryptjs");
const {
  generateToken,
  generateRefreshToken,
  verifyToken,
} = require("../../utils/jwtUtils");

const authResolver = {
  Query: {
    login: async (_, { email, password }) => {
      const user = await User.findOne({ email });
      if (!user) throw new Error("User not found");

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) throw new Error("Invalid password");

      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      return { token, refreshToken, user };
    },

    refreshToken: async (_, { refreshToken }) => {
      const decoded = verifyToken(refreshToken);

      const user = await User.findById(decoded.sub);
      if (!user) throw new Error("User not found");

      const token = generateToken(user);
      const newRefreshToken = generateRefreshToken(user);

      return { token, refreshToken: newRefreshToken, user };
    },

    getUserDetails: async (_, { id }, { token }) => {
      const user = verifyToken(token);

      // Fetch the user and populate their assigned tasks
      const userDetails = await User.findById(id).populate("tasks");

      if (!userDetails) throw new Error("User not found");

      // RBAC: Check if the user has permission to view the details of the requested user
      if (!user.roles.includes("Admin") && user.id !== id) {
        throw new Error("Access Denied");
      }

      return userDetails;
    },
  },

  Mutation: {
    signup: async (_, { name, email, password, roles }) => {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        roles: roles, // Accept multiple roles
      });
      await newUser.save();

      const token = generateToken(newUser);
      const refreshToken = generateRefreshToken(newUser);

      return { token, refreshToken, user: newUser };
    },
  },
};

module.exports = authResolver;
