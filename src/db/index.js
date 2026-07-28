import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async (attempt = 1) => {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const connectionInstance = await mongoose.connect(`${mongoUri}/${DB_NAME}`);
    console.log(
      `\n MongoDB connected!! DB host: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    if (attempt < 10) {
      console.warn(
        `Database connection attempt ${attempt} failed. Retrying in 3 seconds...`
      );
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return connectDB(attempt + 1);
    }

    console.error("Database connection error:", error);
    process.exit(1);
  }
};

export default connectDB;
