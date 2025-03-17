import express from 'express';
import json from 'body-parser';
import mongoose, { ConnectOptions } from 'mongoose';
import { MainRouters } from "./routes";
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
const app = express();
app.use(cors());
app.use(json());
app.use(MainRouters)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});
mongoose.connect(`${process.env.MONGODB_CONNECTION_STRING}${process.env.MONGODB_DATABASE}`, { useNewUrlParser: true, useUnifiedTopology: true } as ConnectOptions)
  .then(() => {
    console.log('Database connected');
  })
  .catch((error) => {
    console.log(error)
    console.log('Error connecting to database');
  });
app.listen(5000, () => {
  console.log('server run now 5000')
})
