import readline from "readline";
import { fileURLToPath } from "url";
import path from "path";
import * as transactionService from "../services/transaction.service.ts";
import * as fundService from "../services/fund.service.ts";
import * as portfolioService from "../services/portfolio.service.ts";

// Helper to parse months
function parseMonth(monthStr: string): number | null {
  const months: Record<string, number> = {
    january: 1, jan: 1, "01": 1, "1": 1,
    february: 2, feb: 2, "02": 2, "2": 2,
    march: 3, mar: 3, "03": 3, "3": 3,
    april: 4, apr: 4, "04": 4, "4": 4,
    may: 5, "05": 5, "5": 5,
    june: 6, jun: 6, "06": 6, "6": 6,
    july: 7, jul: 7, "07": 7, "7": 7,
    august: 8, aug: 8, "08": 8, "8": 8,
    september: 9, sep: 9, sept: 9, "09": 9, "9": 9,
    october: 10, oct: 10, "10": 10,
    november: 11, nov: 11, "11": 11,
    december: 12, dec: 12, "12": 12
  };
  return months[monthStr.toLowerCase()] || null;
}

// Help documentation
const helpText = `
Welcome! I am Tara, your financial assistant. Here are some questions you can ask me:
- "What is my portfolio worth?" or "Portfolio value"
- "How much did I invest in total?"
- "What is my biggest expense?"
- "How much did I spend on food?" (Supports category names)
- "How much did I spend between 2024-01-01 and 2024-01-15?"
- "What are my top 5 merchants?"
- "How much did I spend in January 2024?"
- "What is the current NAV of fund_bluechip?"
- "What is the return of fund_silver?"
- "What is the return of fund_bluechip between 2023-04-01 and 2025-03-01?"
- "Which fund performed best?" or "Best performing fund"
- "What is my best holding?"
- "Show my portfolio summary"
`;

export async function askTara(query: string): Promise<string> {
  const normalized = query.toLowerCase().trim();

  // 1. Portfolio Value
  if (normalized.includes("portfolio value") || normalized.includes("portfolio worth") || normalized.includes("total value")) {
    const val = await portfolioService.getPortfolioValue();
    return `Your portfolio is currently worth ₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
  }

  // 2. Total Invested Amount
  if (normalized.includes("total invested") || normalized.includes("total investment") || normalized.includes("how much have i invested")) {
    const invested = await portfolioService.getTotalInvestedAmount();
    return `You have invested a total of ₹${invested.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
  }

  // 3. Biggest Expense
  if (normalized.includes("biggest expense") || normalized.includes("largest expense") || normalized.includes("biggest transaction")) {
    const expense = await transactionService.getBiggestExpense();
    if (!expense) return "You have no expenses recorded.";
    return `Your biggest expense was ₹${expense.amount.toLocaleString("en-IN")} at ${expense.merchant} on ${expense.date} (${expense.category}). Memo: "${expense.memo || "None"}".`;
  }

  // 4. Spend Between Dates
  const dateRangeRegex = /spend between\s+([\d-]+)\s+and\s+([\d-]+)|spend from\s+([\d-]+)\s+to\s+([\d-]+)/;
  const dateMatch = normalized.match(dateRangeRegex);
  if (dateMatch) {
    const start = dateMatch[1] || dateMatch[3];
    const end = dateMatch[2] || dateMatch[4];
    if (start && end) {
      const spend = await transactionService.getSpendBetweenDates(start, end);
      return `Your total spend between ${start} and ${end} was ₹${spend.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
    }
  }

  // 5. Monthly Spend
  const monthlyRegex = /spend in\s+([a-zA-Z0-9]+)\s+(\d{4})/;
  const monthlyMatch = normalized.match(monthlyRegex);
  if (monthlyMatch) {
    const monthVal = monthlyMatch[1];
    const yearVal = parseInt(monthlyMatch[2] || "");
    if (monthVal && !isNaN(yearVal)) {
      const parsedMonth = parseMonth(monthVal);
      if (parsedMonth) {
        const spend = await transactionService.getMonthlySpend(parsedMonth, yearVal);
        return `Your total spend in ${monthVal.toUpperCase()} ${yearVal} was ₹${spend.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
      }
    }
  }

  // 6. Spend by Category
  const categoryRegex = /spend on\s+([a-zA-Z_]+)|spend for\s+([a-zA-Z_]+)/;
  const categoryMatch = normalized.match(categoryRegex);
  if (categoryMatch) {
    const category = categoryMatch[1] || categoryMatch[2];
    if (category) {
      const spend = await transactionService.getTotalSpendByCategory(category);
      return `Your total spend on category "${category}" was ₹${spend.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
    }
  }

  // 7. Top Merchants
  const topMerchantsRegex = /top\s+(\d+)\s+merchants|top merchants/;
  const merchantMatch = normalized.match(topMerchantsRegex);
  if (merchantMatch) {
    const limit = parseInt(merchantMatch[1] || "5");
    const topList = await transactionService.getTopMerchants(limit);
    if (topList.length === 0) return "No merchants found.";
    let res = `Here are your top ${limit} merchants by total spend:\n`;
    topList.forEach((m, i) => {
      res += `${i + 1}. ${m.merchant}: ₹${m.totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    });
    return res.trim();
  }

  // 8. Fund Return Range
  const fundReturnRangeRegex = /return of\s+([a-zA-Z0-9_-]+)\s+between\s+([\d-]+)\s+and\s+([\d-]+)/;
  const fundReturnRangeMatch = normalized.match(fundReturnRangeRegex);
  if (fundReturnRangeMatch) {
    const fundId = fundReturnRangeMatch[1];
    const start = fundReturnRangeMatch[2];
    const end = fundReturnRangeMatch[3];
    if (fundId && start && end) {
      const ret = await fundService.getFundReturn(fundId, start, end);
      if (ret === null) return `Could not compute return for fund "${fundId}" between ${start} and ${end}.`;
      return `The return of "${fundId}" between ${start} and ${end} was ${ret.toFixed(3)}%.`;
    }
  }

  // 9. Individual Holding Return
  const holdingReturnRegex = /return of\s+([a-zA-Z0-9_-]+)/;
  const holdingReturnMatch = normalized.match(holdingReturnRegex);
  if (holdingReturnMatch) {
    const fundId = holdingReturnMatch[1];
    if (fundId) {
      const ret = await portfolioService.getHoldingReturn(fundId);
      if (ret === null) {
        // Fallback to checking if it is a general fund return from first to last date
        const generalRet = await fundService.getFundReturn(fundId, "2000-01-01", "2099-12-31");
        if (generalRet === null) {
          return `You do not hold "${fundId}", and no NAV data is available for it.`;
        }
        return `You don't hold "${fundId}" in your portfolio, but its general historical return is ${generalRet.toFixed(3)}%.`;
      }
      return `Your holding return for "${fundId}" is ${ret.toFixed(3)}%.`;
    }
  }

  // 10. Current NAV
  const navRegex = /nav of\s+([a-zA-Z0-9_-]+)|current nav of\s+([a-zA-Z0-9_-]+)/;
  const navMatch = normalized.match(navRegex);
  if (navMatch) {
    const fundId = navMatch[1] || navMatch[2];
    if (fundId) {
      const nav = await fundService.getCurrentNAV(fundId);
      if (nav === null) return `Fund "${fundId}" not found or has no NAV data.`;
      return `The current NAV of "${fundId}" is ${nav.toFixed(2)}.`;
    }
  }

  // 11. Best Performing Fund
  if (normalized.includes("best performing fund") || normalized.includes("best fund") || normalized.includes("fund performed best")) {
    const best = await fundService.getBestPerformingFund();
    if (!best) return "No fund data available.";
    return `The best performing fund is "${best.name}" (${best.fundId}) with an overall return of ${best.returnPercentage.toFixed(3)}%.`;
  }

  // 12. Best Holding
  if (normalized.includes("best holding") || normalized.includes("best performing holding")) {
    const bestH = await portfolioService.getBestHolding();
    if (!bestH) return "You have no holdings in your portfolio.";
    return `Your best performing holding is "${bestH.fundName}" (${bestH.fundId}) with a return of ${bestH.returnPercentage.toFixed(3)}% (Current Value: ₹${bestH.currentValue.toLocaleString("en-IN")}).`;
  }

  // 13. Portfolio Summary
  if (normalized.includes("portfolio summary") || normalized.includes("summary of my portfolio") || normalized.includes("show my portfolio")) {
    const summary = await portfolioService.getPortfolioSummary();
    let res = `=== Portfolio Summary ===\n`;
    res += `Total Current Value: ₹${summary.totalCurrentValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n`;
    res += `Total Invested Cost:  ₹${summary.totalCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n`;
    res += `Total Return (Abs):  ₹${summary.totalReturnAbsolute.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n`;
    res += `Total Return (ROI):  ${summary.totalReturnPercentage.toFixed(3)}%\n\n`;
    res += `Holdings Breakdown:\n`;
    summary.holdings.forEach(h => {
      res += `- ${h.fundName} (${h.fundId}):\n`;
      res += `  Units: ${h.units.toFixed(4)} | Value: ₹${h.currentValue.toLocaleString("en-IN")} | Return: ${h.returnPercentage.toFixed(3)}%\n`;
    });
    return res.trim();
  }

  // Help menu
  if (normalized.includes("help") || normalized.includes("hello") || normalized.includes("hi")) {
    return helpText.trim();
  }

  return "I'm sorry, I didn't quite understand that. Type 'help' to see list of questions I can answer.";
}

// Chat Loop Interface
const isDirectRun = process.argv[1] && path.basename(process.argv[1]).includes("tara.agent");

if (isDirectRun) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("\n=============================================");
  console.log("             TARA - FINANCIAL AGENT          ");
  console.log("=============================================");
  console.log("Ask me any question about your transactions, funds, or portfolio.");
  console.log("Type 'help' to see examples, or 'exit' to quit.\n");

  const promptUser = () => {
    rl.question("You > ", async (input) => {
      const trimmed = input.trim();
      if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
        console.log("\nGoodbye!");
        rl.close();
        process.exit(0);
      }
      if (trimmed === "") {
        promptUser();
        return;
      }
      console.log("Tara > Thinking...");
      const response = await askTara(trimmed);
      console.log(`Tara > ${response}\n`);
      promptUser();
    });
  };

  promptUser();
}
