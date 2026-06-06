import { pool } from "../db/connection.ts";

export interface Transaction {
    id: string;
    date: string;
    merchant: string;
    category: string;
    amount: number;
    currency: string;
    memo: string | null;
}

export interface MerchantSpend {
    merchant: string;
    totalSpend: number;
}

/**
 * Finds the single transaction representing the biggest expense (highest positive amount).
 */
export async function getBiggestExpense(): Promise<Transaction | null> {
    const query = `
    SELECT id, date::text as date, merchant, category, amount::float as amount, currency, memo
    FROM transactions
    WHERE amount > 0
    ORDER BY amount DESC
    LIMIT 1
  `;
    const res = await pool.query(query);
    return res.rows[0] || null;
}

/**
 * Calculates the total spend (sum of positive transaction amounts) in a given category.
 */
export async function getTotalSpendByCategory(category: string): Promise<number> {
    const query = `
    SELECT COALESCE(SUM(amount::float), 0) as total
    FROM transactions
    WHERE category = $1 AND amount > 0
  `;
    const res = await pool.query(query, [category]);
    return res.rows[0].total;
}

/**
 * Calculates the total spend (sum of positive transaction amounts) between two dates (inclusive).
 */
export async function getSpendBetweenDates(startDate: string, endDate: string): Promise<number> {
    const query = `
    SELECT COALESCE(SUM(amount::float), 0) as total
    FROM transactions
    WHERE date >= $1 AND date <= $2 AND amount > 0
  `;
    const res = await pool.query(query, [startDate, endDate]);
    return res.rows[0].total;
}

/**
 * Returns the top merchants by total spend (sum of positive transaction amounts) up to the limit.
 */
export async function getTopMerchants(limit: number): Promise<MerchantSpend[]> {
    const query = `
    SELECT merchant, COALESCE(SUM(amount::float), 0) as "totalSpend"
    FROM transactions
    WHERE amount > 0
    GROUP BY merchant
    ORDER BY "totalSpend" DESC
    LIMIT $1
  `;
    const res = await pool.query(query, [limit]);
    return res.rows;
}

/**
 * Calculates the total spend (sum of positive transaction amounts) in a given month and year.
 * @param month 1-based month (1 = Jan, 12 = Dec)
 * @param year 4-digit year (e.g. 2024)
 */
export async function getMonthlySpend(month: number, year: number): Promise<number> {
    const query = `
    SELECT COALESCE(SUM(amount::float), 0) as total
    FROM transactions
    WHERE EXTRACT(MONTH FROM date) = $1 
      AND EXTRACT(YEAR FROM date) = $2 
      AND amount > 0
  `;
    const res = await pool.query(query, [month, year]);
    return res.rows[0].total;
}

