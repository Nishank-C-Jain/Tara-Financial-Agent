import {
  getCurrentNAV,
  getFundReturn,
  getBestPerformingFund
} from "./src/services/fund.service.js";
import { pool } from "./src/db/connection.js";

async function runTests() {
  console.log("=== Running Fund Service Tests ===");

  try {
    // 0. Print all funds in DB
    const fundsList = await pool.query("SELECT id, name FROM funds");
    console.log("Funds in DB:", fundsList.rows);

    // 1. Test getCurrentNAV
    console.log("\nTesting getCurrentNAV('fund_bluechip')...");
    const navBluechip = await getCurrentNAV("fund_bluechip");
    console.log("Current NAV (Bluechip):", navBluechip);

    console.log("\nTesting getCurrentNAV('fund_silver')...");
    const navSilver = await getCurrentNAV("fund_silver");
    console.log("Current NAV (Silver):", navSilver);

    console.log("\nTesting getCurrentNAV('invalid_fund') (Edge Case)...");
    const navInvalid = await getCurrentNAV("invalid_fund");
    console.log("Current NAV (Invalid):", navInvalid);

    // 2. Test getFundReturn
    console.log("\nTesting getFundReturn('fund_bluechip', '2023-04-01', '2025-03-01')...");
    const returnBluechip = await getFundReturn("fund_bluechip", "2023-04-01", "2025-03-01");
    console.log("Fund Return (Bluechip, full range):", returnBluechip !== null ? `${returnBluechip.toFixed(3)}%` : null);

    console.log("\nTesting getFundReturn('fund_silver', '2023-04-01', '2025-03-01')...");
    const returnSilver = await getFundReturn("fund_silver", "2023-04-01", "2025-03-01");
    console.log("Fund Return (Silver, full range):", returnSilver !== null ? `${returnSilver.toFixed(3)}%` : null);

    console.log("\nTesting getFundReturn('invalid_fund', '2023-04-01', '2025-03-01') (Edge Case)...");
    const returnInvalid = await getFundReturn("invalid_fund", "2023-04-01", "2025-03-01");
    console.log("Fund Return (Invalid):", returnInvalid);

    // 3. Test getBestPerformingFund
    console.log("\nTesting getBestPerformingFund()...");
    const bestFund = await getBestPerformingFund();
    console.log("Best Performing Fund:", bestFund);

  } catch (error) {
    console.error("Test failed with error:", error);
  } finally {
    await pool.end();
  }
}

runTests();
