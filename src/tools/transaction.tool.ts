import { fileURLToPath } from "url";
import path from "path";
import {
  getBiggestExpense,
  getTotalSpendByCategory,
  getSpendBetweenDates,
  getTopMerchants,
  getMonthlySpend
} from "../services/transaction.service.ts";

export {
  getBiggestExpense,
  getTotalSpendByCategory,
  getSpendBetweenDates,
  getTopMerchants,
  getMonthlySpend
};

// CLI Support
const isDirectRun = process.argv[1] && path.basename(process.argv[1]).includes("transaction.tool");

if (isDirectRun) {
  const runCLI = async () => {
    const action = process.argv[2];
    try {
      if (action === "getBiggestExpense") {
        console.log(JSON.stringify(await getBiggestExpense(), null, 2));
      } else if (action === "getTotalSpendByCategory") {
        const category = process.argv[3];
        if (!category) throw new Error("Category required");
        console.log(await getTotalSpendByCategory(category));
      } else if (action === "getSpendBetweenDates") {
        const start = process.argv[3];
        const end = process.argv[4];
        if (!start || !end) throw new Error("startDate and endDate required");
        console.log(await getSpendBetweenDates(start, end));
      } else if (action === "getTopMerchants") {
        const limit = parseInt(process.argv[3] || "5");
        console.log(JSON.stringify(await getTopMerchants(limit), null, 2));
      } else if (action === "getMonthlySpend") {
        const month = parseInt(process.argv[3] || "");
        const year = parseInt(process.argv[4] || "");
        if (isNaN(month) || isNaN(year)) throw new Error("month and year required");
        console.log(await getMonthlySpend(month, year));
      } else {
        console.log("Available actions: getBiggestExpense, getTotalSpendByCategory, getSpendBetweenDates, getTopMerchants, getMonthlySpend");
      }
    } catch (err: any) {
      console.error("Error:", err.message);
      process.exit(1);
    }
  };
  runCLI().then(() => process.exit(0));
}
