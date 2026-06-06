import {
  getPortfolioValue,
  getHoldingReturn,
  getPortfolioSummary,
  getBestHolding,
  getTotalInvestedAmount
} from "./src/services/portfolio.service.js";
import { pool } from "./src/db/connection.js";

async function runTests() {
  console.log("=== Running Portfolio Service Tests ===");

  try {
    // 0. Print all holdings in DB
    const holdingsList = await pool.query("SELECT fund_id, fund_name, units, purchase_nav FROM holdings");
    console.log("Holdings in DB:", holdingsList.rows);

    // 1. Test getPortfolioValue
    console.log("\nTesting getPortfolioValue()...");
    const value = await getPortfolioValue();
    console.log("Total Portfolio Value:", value);

    // 2. Test getHoldingReturn
    if (holdingsList.rows.length > 0) {
      const firstFundId = holdingsList.rows[0].fund_id;
      console.log(`\nTesting getHoldingReturn('${firstFundId}')...`);
      const hReturn = await getHoldingReturn(firstFundId);
      console.log(`Holding Return (${firstFundId}):`, hReturn !== null ? `${hReturn.toFixed(3)}%` : null);
    }

    console.log("\nTesting getHoldingReturn('invalid_fund') (Edge Case)...");
    const hReturnInvalid = await getHoldingReturn("invalid_fund");
    console.log("Holding Return (Invalid):", hReturnInvalid);

    // 3. Test getPortfolioSummary
    console.log("\nTesting getPortfolioSummary()...");
    const summary = await getPortfolioSummary();
    console.log("Portfolio Summary Aggregate:");
    console.log({
      totalCurrentValue: summary.totalCurrentValue,
      totalCost: summary.totalCost,
      totalReturnAbsolute: summary.totalReturnAbsolute,
      totalReturnPercentage: `${summary.totalReturnPercentage.toFixed(3)}%`
    });

    console.log("\nPortfolio Summary Holdings:");
    console.table(summary.holdings.map(h => ({
      fundId: h.fundId,
      units: h.units,
      purchaseNAV: h.purchaseNAV,
      currentNAV: h.currentNAV,
      currentValue: h.currentValue,
      costBasis: h.costBasis,
      returnPercentage: `${h.returnPercentage.toFixed(3)}%`
    })));

    // 4. Test getBestHolding
    console.log("\nTesting getBestHolding()...");
    const bestHolding = await getBestHolding();
    console.log("Best Holding in Portfolio:", bestHolding);

    // 5. Test getTotalInvestedAmount
    console.log("\nTesting getTotalInvestedAmount()...");
    const totalInvested = await getTotalInvestedAmount();
    console.log("Total Invested Amount:", totalInvested);

  } catch (error) {
    console.error("Test failed with error:", error);
  } finally {
    await pool.end();
  }
}

runTests();
