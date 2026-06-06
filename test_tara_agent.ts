import { askTara } from "./src/agent/tara.agent.js";
import { pool } from "./src/db/connection.js";

async function runTests() {
  console.log("=== Running Tara Agent Natural Language Tests ===");

  const queries = [
    "hello",
    "What is my portfolio worth?",
    "How much have I invested in total?",
    "what is my biggest expense?",
    "how much did I spend on food?",
    "how much did I spend between 2024-01-01 and 2024-01-15?",
    "what are my top 3 merchants?",
    "how much did I spend in January 2024?",
    "what is the current NAV of fund_bluechip?",
    "what is the return of fund_silver?",
    "what is the return of fund_bluechip between 2023-04-01 and 2025-03-01?",
    "which fund performed best?",
    "what is my best holding?",
    "show my portfolio summary"
  ];

  try {
    for (const q of queries) {
      console.log(`\nQuery: "${q}"`);
      const reply = await askTara(q);
      console.log(`Tara: ${reply}`);
    }
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await pool.end();
  }
}

runTests();
