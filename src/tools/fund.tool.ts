import { fileURLToPath } from "url";
import path from "path";
import {
  getCurrentNAV,
  getFundReturn,
  getBestPerformingFund
} from "../services/fund.service.ts";

export {
  getCurrentNAV,
  getFundReturn,
  getBestPerformingFund
};

// CLI Support
const isDirectRun = process.argv[1] && path.basename(process.argv[1]).includes("fund.tool");

if (isDirectRun) {
  const runCLI = async () => {
    const action = process.argv[2];
    try {
      if (action === "getCurrentNAV") {
        const fundId = process.argv[3];
        if (!fundId) throw new Error("fundId required");
        console.log(await getCurrentNAV(fundId));
      } else if (action === "getFundReturn") {
        const fundId = process.argv[3];
        const start = process.argv[4];
        const end = process.argv[5];
        if (!fundId || !start || !end) throw new Error("fundId, startDate, and endDate required");
        const ret = await getFundReturn(fundId, start, end);
        console.log(ret !== null ? `${ret.toFixed(3)}%` : "null");
      } else if (action === "getBestPerformingFund") {
        console.log(JSON.stringify(await getBestPerformingFund(), null, 2));
      } else {
        console.log("Available actions: getCurrentNAV, getFundReturn, getBestPerformingFund");
      }
    } catch (err: any) {
      console.error("Error:", err.message);
      process.exit(1);
    }
  };
  runCLI().then(() => process.exit(0));
}
