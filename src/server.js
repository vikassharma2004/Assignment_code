import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app.js';
import { env } from './config/env.js';

const port = env.PORT;
const DB = env.MONGODB_URI;

mongoose
  .connect(DB)
  .then(() => console.log('DB connection successful!'))
  .catch((err) => console.log('DB connection failed!', err));

const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
