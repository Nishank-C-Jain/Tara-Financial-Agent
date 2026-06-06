import {
  getBiggestExpense,
  getTotalSpendByCategory,
  getSpendBetweenDates,
  getTopMerchants,
  getMonthlySpend
} from "./src/services/transaction.service.js";
import { pool } from "./src/db/connection.js";

async function runTests() {
  console.log("=== Running Transaction Service Tests ===");

  try {
    // 0. Print Category stats
    const catStats = await pool.query(`SELECT category, COUNT(*) as count FROM transactions GROUP BY category`);
    console.log("Category Stats in DB:", catStats.rows);

    // 1. Test getBiggestExpense()
    const biggest = await getBiggestExpense();
    console.log("Biggest Expense:", biggest);

    // 2. Test getTotalSpendByCategory
    console.log("\nTesting getTotalSpendByCategory('food')...");
    const foodSpend = await getTotalSpendByCategory("food");
    console.log("Total Food Spend:", foodSpend);

    console.log("\nTesting getTotalSpendByCategory('travel')...");
    const travelSpend = await getTotalSpendByCategory("travel");
    console.log("Total Travel Spend:", travelSpend);

    // 3. Test getSpendBetweenDates
    console.log("\nTesting getSpendBetweenDates('2024-01-01', '2024-01-15')...");
    const rangeSpend = await getSpendBetweenDates("2024-01-01", "2024-01-15");
    console.log("Spend between 2024-01-01 and 2024-01-15:", rangeSpend);

    // 4. Test getTopMerchants
    console.log("\nTesting getTopMerchants(5)...");
    const topMerchants = await getTopMerchants(5);
    console.log("Top 5 Merchants:");
    console.table(topMerchants);

    // 5. Test getMonthlySpend
    console.log("\nTesting getMonthlySpend(1, 2024)...");
    const jan24Spend = await getMonthlySpend(1, 2024);
    console.log("Total Spend in Jan 2024:", jan24Spend);

    console.log("\nTesting getMonthlySpend(2, 2024)...");
    const feb24Spend = await getMonthlySpend(2, 2024);
    console.log("Total Spend in Feb 2024:", feb24Spend);

  } catch (error) {
    console.error("Test failed with error:", error);
  } finally {
    await pool.end();
  }
}

runTests();
