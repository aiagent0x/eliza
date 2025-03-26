import express from 'express';
import json from 'body-parser';
import mongoose, { ConnectOptions } from 'mongoose';
import { MainRouters } from "./routes";
import cors from 'cors';
import dotenv from 'dotenv';
import Redis from "ioredis";
dotenv.config();
const app = express();
app.use(cors());
app.use(json());
app.use(MainRouters)

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
export const redisClient = new Redis(redisUrl);

redisClient.on("connect", () => {
  console.log("Connected to Redis at", redisUrl);
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});
mongoose.connect(`${process.env.MONGODB_CONNECTION_STRING}`, { useNewUrlParser: true, useUnifiedTopology: true, dbName: process.env.MONGODB_DATABASE, user: process.env.MONGODB_USER, pass: process.env.MONGODB_PASSWORD } as ConnectOptions)
  .then(() => {
    console.log('Database connected');
  })
  .catch((error) => {
    console.log(error)
    console.log('Error connecting to database');
  });
app.listen(process.env.PORT || 5000, () => {
  console.log(`server run now ${process.env.PORT || 5000}`);
})
