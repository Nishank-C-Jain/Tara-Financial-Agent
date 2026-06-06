import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../src/db/connection.ts";

// Handle __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.argv[2] || process.env.DATA_DIR || "./data/sample_a";

interface NavEntry {
    date: string;
    value: number;
}

interface Fund {
    id: string;
    name: string;
    category: string;
    nav?: NavEntry[];
}

interface Holding {
    fund_id: string;
    fund_name: string;
    units: number;
    purchase_date: string;
    purchase_nav: number;
}

interface Transaction {
    id: string;
    date: string;
    merchant: string;
    category: string;
    amount: number;
    currency: string;
    memo: string;
}

async function main() {
    const client = await pool.connect();
    try {
        console.log("Loading data from:", DATA_DIR);

        // 1. Read files
        const fundsPath = path.join(DATA_DIR, "funds.json");
        const holdingsPath = path.join(DATA_DIR, "holdings.json");
        const transactionsPath = path.join(DATA_DIR, "transactions.json");

        const funds: Fund[] = JSON.parse(fs.readFileSync(fundsPath, "utf8"));
        const holdings: Holding[] = JSON.parse(fs.readFileSync(holdingsPath, "utf8"));
        const transactions: Transaction[] = JSON.parse(fs.readFileSync(transactionsPath, "utf8"));

        console.log(`Loaded ${funds.length} funds, ${holdings.length} holdings, and ${transactions.length} transactions from files.`);

        // 2. Initialize Database Schema
        console.log("Initializing database schema...");
        const schemaPath = path.join(__dirname, "schema.sql");
        const schemaSql = fs.readFileSync(schemaPath, "utf8");
        await client.query(schemaSql);
        console.log("Database schema initialized successfully.");

        // Start Transaction for Ingestion
        await client.query("BEGIN");

        // 3. Ingest Funds
        console.log("Inserting funds...");
        const fundInsertQuery = `
      INSERT INTO funds (id, name, category)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE 
      SET name = EXCLUDED.name, category = EXCLUDED.category
    `;
        for (const fund of funds) {
            await client.query(fundInsertQuery, [fund.id, fund.name, fund.category]);
        }
        console.log(`Inserted/updated ${funds.length} funds.`);

        // 4. Ingest Fund NAV entries
        console.log("Inserting fund NAVs...");
        const navInsertQuery = `
      INSERT INTO fund_nav (fund_id, date, value)
      VALUES ($1, $2, $3)
      ON CONFLICT (fund_id, date) DO UPDATE 
      SET value = EXCLUDED.value
    `;
        let navCount = 0;
        for (const fund of funds) {
            if (fund.nav && Array.isArray(fund.nav)) {
                for (const entry of fund.nav) {
                    await client.query(navInsertQuery, [fund.id, entry.date, entry.value]);
                    navCount++;
                }
            }
        }
        console.log(`Inserted/updated ${navCount} fund NAV entries.`);

        // 5. Ingest Holdings
        console.log("Inserting holdings...");
        const holdingInsertQuery = `
      INSERT INTO holdings (fund_id, fund_name, units, purchase_date, purchase_nav)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (fund_id) DO UPDATE 
      SET fund_name = EXCLUDED.fund_name,
          units = EXCLUDED.units,
          purchase_date = EXCLUDED.purchase_date,
          purchase_nav = EXCLUDED.purchase_nav
    `;
        for (const holding of holdings) {
            await client.query(holdingInsertQuery, [
                holding.fund_id,
                holding.fund_name,
                holding.units,
                holding.purchase_date,
                holding.purchase_nav
            ]);
        }
        console.log(`Inserted/updated ${holdings.length} holdings.`);

        // 6. Ingest Transactions
        console.log("Inserting transactions...");
        const txnInsertQuery = `
      INSERT INTO transactions (id, date, merchant, category, amount, currency, memo)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE 
      SET date = EXCLUDED.date,
          merchant = EXCLUDED.merchant,
          category = EXCLUDED.category,
          amount = EXCLUDED.amount,
          currency = EXCLUDED.currency,
          memo = EXCLUDED.memo
    `;
        for (const txn of transactions) {
            await client.query(txnInsertQuery, [
                txn.id,
                txn.date,
                txn.merchant,
                txn.category,
                txn.amount,
                txn.currency,
                txn.memo
            ]);
        }
        console.log(`Inserted/updated ${transactions.length} transactions.`);

        // Commit Transaction
        await client.query("COMMIT");
        console.log("Data ingestion completed successfully!");

    } catch (error) {
        await client.query("ROLLBACK");
        console.log("Error during ingestion, transaction rolled back.");
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch((err) => {
    console.error("Unhandled rejection in main:", err);
    process.exit(1);
});
