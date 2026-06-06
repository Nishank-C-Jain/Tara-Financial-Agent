import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as transactionService from "../src/services/transaction.service.ts";
import * as fundService from "../src/services/fund.service.ts";
import * as portfolioService from "../src/services/portfolio.service.ts";
import { pool } from "../src/db/connection.ts";

const DATA_DIR = process.argv[2] || process.env.DATA_DIR || "./data/sample_a";

console.log(`\n==================================================`);
console.log(`        EVALUATING DATABASE VS JSON SOURCE        `);
console.log(`        Target Directory: ${DATA_DIR}`);
console.log(`==================================================\n`);

// 1. Read JSON Data
const fundsPath = path.join(DATA_DIR, "funds.json");
const holdingsPath = path.join(DATA_DIR, "holdings.json");
const transactionsPath = path.join(DATA_DIR, "transactions.json");

const rawFunds = JSON.parse(fs.readFileSync(fundsPath, "utf8"));
const rawHoldings = JSON.parse(fs.readFileSync(holdingsPath, "utf8"));
const rawTransactions = JSON.parse(fs.readFileSync(transactionsPath, "utf8"));

// Evaluation stats
let totalTests = 0;
let passedTests = 0;

function assertEqual(testName: string, actual: any, expected: any, tolerance: number = 0.01) {
  totalTests++;
  let passed = false;

  if (typeof actual === "number" && typeof expected === "number") {
    passed = Math.abs(actual - expected) <= tolerance;
  } else {
    passed = JSON.stringify(actual) === JSON.stringify(expected);
  }

  if (passed) {
    passedTests++;
    console.log(`✓ [PASS] ${testName}`);
  } else {
    console.log(`✗ [FAIL] ${testName}`);
    console.log(`   Expected:`, expected);
    console.log(`   Actual:  `, actual);
  }
}

async function runEvaluation() {
  try {
    // --- EVALUATE TRANSACTIONS ---
    console.log("--- 1. Evaluating Transaction Service ---");

    // getBiggestExpense
    const jsonBiggest = rawTransactions
      .filter((t: any) => t.amount > 0)
      .sort((a: any, b: any) => b.amount - a.amount)[0];
    const dbBiggest = await transactionService.getBiggestExpense();
    assertEqual("getBiggestExpense ID", dbBiggest?.id, jsonBiggest?.id);
    assertEqual("getBiggestExpense Amount", dbBiggest?.amount, jsonBiggest?.amount);

    // getTotalSpendByCategory
    const testCategory = "travel";
    const jsonCategorySpend = rawTransactions
      .filter((t: any) => t.category === testCategory && t.amount > 0)
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    const dbCategorySpend = await transactionService.getTotalSpendByCategory(testCategory);
    assertEqual(`getTotalSpendByCategory('${testCategory}')`, dbCategorySpend, jsonCategorySpend);

    // getSpendBetweenDates
    const start = "2024-01-01";
    const end = "2024-01-15";
    const jsonRangeSpend = rawTransactions
      .filter((t: any) => t.date >= start && t.date <= end && t.amount > 0)
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    const dbRangeSpend = await transactionService.getSpendBetweenDates(start, end);
    assertEqual(`getSpendBetweenDates('${start}', '${end}')`, dbRangeSpend, jsonRangeSpend);

    // getTopMerchants
    const limit = 3;
    const merchantMap: Record<string, number> = {};
    rawTransactions
      .filter((t: any) => t.amount > 0)
      .forEach((t: any) => {
        merchantMap[t.merchant] = (merchantMap[t.merchant] || 0) + t.amount;
      });
    const jsonTopMerchants = Object.entries(merchantMap)
      .map(([merchant, totalSpend]) => ({ merchant, totalSpend }))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, limit);
    const dbTopMerchants = await transactionService.getTopMerchants(limit);
    assertEqual("getTopMerchants count", dbTopMerchants.length, limit);
    for (let i = 0; i < limit; i++) {
      assertEqual(`getTopMerchants Rank ${i+1} Name`, dbTopMerchants[i]?.merchant, jsonTopMerchants[i]?.merchant);
      assertEqual(`getTopMerchants Rank ${i+1} Spend`, dbTopMerchants[i]?.totalSpend, jsonTopMerchants[i]?.totalSpend);
    }

    // getMonthlySpend
    const testMonth = 1;
    const testYear = 2024;
    const jsonMonthlySpend = rawTransactions
      .filter((t: any) => {
        const d = new Date(t.date);
        // Ensure timezone differences don't affect simple UTC dates
        const m = parseInt(t.date.split("-")[1]);
        const y = parseInt(t.date.split("-")[0]);
        return m === testMonth && y === testYear && t.amount > 0;
      })
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    const dbMonthlySpend = await transactionService.getMonthlySpend(testMonth, testYear);
    assertEqual(`getMonthlySpend(${testMonth}, ${testYear})`, dbMonthlySpend, jsonMonthlySpend);


    // --- EVALUATE FUNDS ---
    console.log("\n--- 2. Evaluating Fund Service ---");

    // getCurrentNAV
    const testFundId = "fund_bluechip";
    const testFund = rawFunds.find((f: any) => f.id === testFundId);
    const sortedNav = [...(testFund?.nav || [])].sort((a: any, b: any) => b.date.localeCompare(a.date));
    const jsonLatestNav = sortedNav[0]?.value ?? null;
    const dbLatestNav = await fundService.getCurrentNAV(testFundId);
    assertEqual(`getCurrentNAV('${testFundId}')`, dbLatestNav, jsonLatestNav);

    // getFundReturn
    const startRetDate = "2023-04-01";
    const endRetDate = "2025-03-01";
    const getJsonNAVOnOrBefore = (fund: any, date: string) => {
      const sorted = [...(fund.nav || [])]
        .filter((n: any) => n.date <= date)
        .sort((a: any, b: any) => b.date.localeCompare(a.date));
      return sorted[0]?.value ?? null;
    };
    const jsonStartNav = getJsonNAVOnOrBefore(testFund, startRetDate);
    const jsonEndNav = getJsonNAVOnOrBefore(testFund, endRetDate);
    const jsonReturn = (jsonStartNav && jsonEndNav) ? ((jsonEndNav - jsonStartNav) / jsonStartNav) * 100 : null;
    const dbReturn = await fundService.getFundReturn(testFundId, startRetDate, endRetDate);
    assertEqual(`getFundReturn('${testFundId}')`, dbReturn, jsonReturn);

    // getBestPerformingFund
    const getJsonFundReturn = (fund: any) => {
      const navList = fund.nav || [];
      if (navList.length < 2) return 0;
      const sorted = [...navList].sort((a: any, b: any) => a.date.localeCompare(b.date));
      const first = sorted[0].value;
      const last = sorted[sorted.length - 1].value;
      return ((last - first) / first) * 100;
    };
    const jsonBestFund = rawFunds
      .map((f: any) => ({ id: f.id, return: getJsonFundReturn(f) }))
      .sort((a: any, b: any) => b.return - a.return)[0];
    const dbBestFund = await fundService.getBestPerformingFund();
    assertEqual("getBestPerformingFund ID", dbBestFund?.fundId, jsonBestFund?.id);


    // --- EVALUATE PORTFOLIO ---
    console.log("\n--- 3. Evaluating Portfolio Service ---");

    // getPortfolioValue
    let jsonPortfolioValue = 0;
    rawHoldings.forEach((h: any) => {
      const fund = rawFunds.find((f: any) => f.id === h.fund_id);
      const sorted = [...(fund?.nav || [])].sort((a: any, b: any) => b.date.localeCompare(a.date));
      const currentNavVal = sorted[0]?.value ?? 0;
      jsonPortfolioValue += h.units * currentNavVal;
    });
    const dbPortfolioValue = await portfolioService.getPortfolioValue();
    assertEqual("getPortfolioValue", dbPortfolioValue, jsonPortfolioValue);

    // getHoldingReturn
    const holdingToTest = rawHoldings[0];
    let jsonHoldingReturn = null;
    if (holdingToTest) {
      const fund = rawFunds.find((f: any) => f.id === holdingToTest.fund_id);
      const sorted = [...(fund?.nav || [])].sort((a: any, b: any) => b.date.localeCompare(a.date));
      const currentNavVal = sorted[0]?.value ?? 0;
      if (holdingToTest.purchase_nav > 0) {
        jsonHoldingReturn = ((currentNavVal - holdingToTest.purchase_nav) / holdingToTest.purchase_nav) * 100;
      }
      const dbHoldingReturn = await portfolioService.getHoldingReturn(holdingToTest.fund_id);
      assertEqual(`getHoldingReturn('${holdingToTest.fund_id}')`, dbHoldingReturn, jsonHoldingReturn);
    }

    // getBestHolding
    let jsonBestHoldingId = "";
    let maxHoldingReturn = -Infinity;
    rawHoldings.forEach((h: any) => {
      const fund = rawFunds.find((f: any) => f.id === h.fund_id);
      const sorted = [...(fund?.nav || [])].sort((a: any, b: any) => b.date.localeCompare(a.date));
      const currentNavVal = sorted[0]?.value ?? 0;
      const ret = ((currentNavVal - h.purchase_nav) / h.purchase_nav) * 100;
      if (ret > maxHoldingReturn) {
        maxHoldingReturn = ret;
        jsonBestHoldingId = h.fund_id;
      }
    });
    const dbBestHolding = await portfolioService.getBestHolding();
    assertEqual("getBestHolding ID", dbBestHolding?.fundId, jsonBestHoldingId);

    // getTotalInvestedAmount
    const jsonTotalInvested = rawHoldings.reduce((sum: number, h: any) => sum + (h.units * h.purchase_nav), 0);
    const dbTotalInvested = await portfolioService.getTotalInvestedAmount();
    assertEqual("getTotalInvestedAmount", dbTotalInvested, jsonTotalInvested);


    // --- FINAL RESULTS ---
    console.log(`\n==================================================`);
    console.log(`              EVALUATION REPORT SUMMARY           `);
    console.log(`==================================================`);
    console.log(`Total Assertions Run: ${totalTests}`);
    console.log(`Passed:             ${passedTests}`);
    console.log(`Failed:             ${totalTests - passedTests}`);
    console.log(`Accuracy Rate:      ${((passedTests / totalTests) * 100).toFixed(2)}%`);
    console.log(`==================================================\n`);

  } catch (error) {
    console.error("Evaluation runtime error:", error);
  } finally {
    await pool.end();
  }
}

runEvaluation();
