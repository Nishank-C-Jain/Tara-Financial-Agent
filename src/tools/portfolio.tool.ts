import { fileURLToPath } from "url";
import path from "path";
import {
  getPortfolioValue,
  getHoldingReturn,
  getPortfolioSummary,
  getBestHolding,
  getTotalInvestedAmount
} from "../services/portfolio.service.ts";

export {
  getPortfolioValue,
  getHoldingReturn,
  getPortfolioSummary,
  getBestHolding,
  getTotalInvestedAmount
};

// CLI Support
const isDirectRun = process.argv[1] && path.basename(process.argv[1]).includes("portfolio.tool");

if (isDirectRun) {
  const runCLI = async () => {
    const action = process.argv[2];
    try {
      if (action === "getPortfolioValue") {
        console.log(await getPortfolioValue());
      } else if (action === "getHoldingReturn") {
        const fundId = process.argv[3];
        if (!fundId) throw new Error("fundId required");
        const ret = await getHoldingReturn(fundId);
        console.log(ret !== null ? `${ret.toFixed(3)}%` : "null");
      } else if (action === "getPortfolioSummary") {
        console.log(JSON.stringify(await getPortfolioSummary(), null, 2));
      } else if (action === "getBestHolding") {
        console.log(JSON.stringify(await getBestHolding(), null, 2));
      } else if (action === "getTotalInvestedAmount") {
        console.log(await getTotalInvestedAmount());
      } else {
        console.log("Available actions: getPortfolioValue, getHoldingReturn, getPortfolioSummary, getBestHolding, getTotalInvestedAmount");
      }
    } catch (err: any) {
      console.error("Error:", err.message);
      process.exit(1);
    }
  };
  runCLI().then(() => process.exit(0));
}
