const fs = require("fs");

const data = JSON.parse(
    fs.readFileSync("./data/sample_a/transactions.json", "utf8")
);

const categories = [...new Set(data.map(t => t.category))];

console.log("Categories:");
console.log(categories);

const refunds = data.filter(t => t.amount < 0);

console.log("Refund Count:", refunds.length);

// Transfer analysis
const transfers = data.filter(
    t => t.category === "transfer"
);

console.log("Transfer Count:", transfers.length);

// Merchant analysis
const merchants = [...new Set(data.map(t => t.merchant))];

console.log("Merchant Count:", merchants.length);