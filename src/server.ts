import express from "express";
import dotenv from "dotenv";
import { askTara } from "./agent/tara.agent.ts";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Expose POST /ask
app.post("/ask", async (req, res) => {
  const query = req.body.query || req.body.question || req.body.message;
  if (!query || typeof query !== "string") {
    return res.status(400).json({
      error: "Request body must contain a string field 'query', 'question', or 'message'."
    });
  }

  try {
    const reply = await askTara(query);
    return res.json({ response: reply });
  } catch (error: any) {
    console.error("Error processing agent query:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", agent: "tara" });
});

app.listen(PORT, () => {
  console.log(`\nTara API server is running on port ${PORT}`);
  console.log(`Endpoint exposed: POST http://localhost:${PORT}/ask\n`);
});
