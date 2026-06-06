import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "123456",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5050"),
  database: process.env.DB_DATABASE || "provue_tara",
});
