import { pool } from "../db/connection.ts";

export interface HoldingSummary {
  fundId: string;
  fundName: string;
  units: number;
  purchaseDate: string;
  purchaseNAV: number;
  currentNAV: number;
  currentValue: number;
  costBasis: number;
  returnAbsolute: number;
  returnPercentage: number;
}

export interface PortfolioSummary {
  totalCurrentValue: number;
  totalCost: number;
  totalReturnAbsolute: number;
  totalReturnPercentage: number;
  holdings: HoldingSummary[];
}

/**
 * Calculates the total current value of the portfolio based on current holding units and their latest NAV.
 */
export async function getPortfolioValue(): Promise<number> {
  const query = `
    WITH max_dates AS (
      SELECT fund_id, MAX(date) as max_date
      FROM fund_nav
      GROUP BY fund_id
    ),
    latest_nav AS (
      SELECT fn.fund_id, fn.value::float as current_nav
      FROM fund_nav fn
      JOIN max_dates md ON fn.fund_id = md.fund_id AND fn.date = md.max_date
    )
    SELECT COALESCE(SUM(h.units::float * ln.current_nav), 0) as total_value
    FROM holdings h
    JOIN latest_nav ln ON h.fund_id = ln.fund_id
  `;
  const res = await pool.query(query);
  return res.rows[0]?.total_value || 0;
}

/**
 * Calculates the percentage return for a specific holding based on its purchase NAV and current NAV.
 * Returns null if the holding is not found or has an invalid purchase NAV.
 */
export async function getHoldingReturn(fundId: string): Promise<number | null> {
  const query = `
    WITH latest_nav AS (
      SELECT fund_id, value::float as current_nav
      FROM fund_nav
      WHERE fund_id = $1
      ORDER BY date DESC
      LIMIT 1
    )
    SELECT 
      CASE 
        WHEN h.purchase_nav > 0 THEN (((ln.current_nav - h.purchase_nav::float) / h.purchase_nav::float) * 100)
        ELSE NULL
      END as return_percentage
    FROM holdings h
    JOIN latest_nav ln ON h.fund_id = ln.fund_id
    WHERE h.fund_id = $1
  `;
  const res = await pool.query(query, [fundId]);
  return res.rows[0]?.return_percentage ?? null;
}

/**
 * Compiles a detailed summary of the entire portfolio, including totals and individual holding performance.
 */
export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const query = `
    WITH max_dates AS (
      SELECT fund_id, MAX(date) as max_date
      FROM fund_nav
      GROUP BY fund_id
    ),
    latest_nav AS (
      SELECT fn.fund_id, fn.value::float as current_nav
      FROM fund_nav fn
      JOIN max_dates md ON fn.fund_id = md.fund_id AND fn.date = md.max_date
    )
    SELECT 
      h.fund_id as "fundId",
      h.fund_name as "fundName",
      h.units::float as units,
      h.purchase_date::text as "purchaseDate",
      h.purchase_nav::float as "purchaseNAV",
      ln.current_nav as "currentNAV",
      (h.units::float * ln.current_nav) as "currentValue",
      (h.units::float * h.purchase_nav::float) as "costBasis",
      ((h.units::float * ln.current_nav) - (h.units::float * h.purchase_nav::float)) as "returnAbsolute",
      CASE 
        WHEN h.purchase_nav > 0 THEN (((ln.current_nav - h.purchase_nav::float) / h.purchase_nav::float) * 100)
        ELSE 0
      END as "returnPercentage"
    FROM holdings h
    JOIN latest_nav ln ON h.fund_id = ln.fund_id
  `;
  const res = await pool.query(query);
  const holdings: HoldingSummary[] = res.rows;

  let totalCurrentValue = 0;
  let totalCost = 0;

  for (const h of holdings) {
    totalCurrentValue += h.currentValue;
    totalCost += h.costBasis;
  }

  const totalReturnAbsolute = totalCurrentValue - totalCost;
  const totalReturnPercentage = totalCost > 0 ? (totalReturnAbsolute / totalCost) * 100 : 0;

  return {
    totalCurrentValue,
    totalCost,
    totalReturnAbsolute,
    totalReturnPercentage,
    holdings
  };
}

/**
 * Finds the holding in the portfolio with the highest percentage return.
 * Returns null if the portfolio is empty.
 */
export async function getBestHolding(): Promise<HoldingSummary | null> {
  const query = `
    WITH max_dates AS (
      SELECT fund_id, MAX(date) as max_date
      FROM fund_nav
      GROUP BY fund_id
    ),
    latest_nav AS (
      SELECT fn.fund_id, fn.value::float as current_nav
      FROM fund_nav fn
      JOIN max_dates md ON fn.fund_id = md.fund_id AND fn.date = md.max_date
    )
    SELECT 
      h.fund_id as "fundId",
      h.fund_name as "fundName",
      h.units::float as units,
      h.purchase_date::text as "purchaseDate",
      h.purchase_nav::float as "purchaseNAV",
      ln.current_nav as "currentNAV",
      (h.units::float * ln.current_nav) as "currentValue",
      (h.units::float * h.purchase_nav::float) as "costBasis",
      ((h.units::float * ln.current_nav) - (h.units::float * h.purchase_nav::float)) as "returnAbsolute",
      (((ln.current_nav - h.purchase_nav::float) / h.purchase_nav::float) * 100) as "returnPercentage"
    FROM holdings h
    JOIN latest_nav ln ON h.fund_id = ln.fund_id
    WHERE h.purchase_nav > 0
    ORDER BY "returnPercentage" DESC
    LIMIT 1
  `;
  const res = await pool.query(query);
  return res.rows[0] || null;
}

/**
 * Calculates the total cost basis (amount invested) of all holdings in the portfolio.
 */
export async function getTotalInvestedAmount(): Promise<number> {
  const query = `
    SELECT COALESCE(SUM(units::float * purchase_nav::float), 0) as total_invested
    FROM holdings
  `;
  const res = await pool.query(query);
  return res.rows[0]?.total_invested || 0;
}

