import mongoose from 'mongoose';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

const MONGODB_URI = process.env.DATABASE_URL || "mongodb://durgaraokumili300_db_user:1rbPoPKWDgsmX2Hw@ac-gefnk3g-shard-00-00.9ruzudz.mongodb.net:27017,ac-gefnk3g-shard-00-01.9ruzudz.mongodb.net:27017,ac-gefnk3g-shard-00-02.9ruzudz.mongodb.net:27017/viswaschool?ssl=true&authSource=admin&retryWrites=true&w=majority";

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected successfully ✓");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
};

export default mongoose;
