import { pool } from "../db/connection.js";

export interface Fund {
  id: string;
  name: string;
  category: string;
}

export interface FundPerformance {
  fundId: string;
  name: string;
  returnPercentage: number;
}

/**
 * Gets the latest (most recent) NAV for a given fund ID.
 */
export async function getCurrentNAV(fundId: string): Promise<number | null> {
  const query = `
    SELECT value::float as value
    FROM fund_nav
    WHERE fund_id = $1
    ORDER BY date DESC
    LIMIT 1
  `;
  const res = await pool.query(query, [fundId]);
  return res.rows[0] ? res.rows[0].value : null;
}

/**
 * Helper to get the NAV on or before a given date.
 */
async function getNAVOnOrBefore(fundId: string, date: string): Promise<number | null> {
  const query = `
    SELECT value::float as value
    FROM fund_nav
    WHERE fund_id = $1 AND date <= $2
    ORDER BY date DESC
    LIMIT 1
  `;
  const res = await pool.query(query, [fundId, date]);
  return res.rows[0] ? res.rows[0].value : null;
}

/**
 * Calculates the percentage return of a fund between two dates (inclusive).
 * Formula: ((NAV_at_end_date - NAV_at_start_date) / NAV_at_start_date) * 100
 */
export async function getFundReturn(
  fundId: string,
  startDate: string,
  endDate: string
): Promise<number | null> {
  const startNav = await getNAVOnOrBefore(fundId, startDate);
  const endNav = await getNAVOnOrBefore(fundId, endDate);

  if (startNav === null || endNav === null || startNav === 0) {
    return null;
  }

  return ((endNav - startNav) / startNav) * 100;
}

/**
 * Finds the best performing fund based on its return percentage over its entire history.
 */
export async function getBestPerformingFund(): Promise<FundPerformance | null> {
  const query = `
    WITH fund_dates AS (
      SELECT 
        fund_id,
        MIN(date) as min_date,
        MAX(date) as max_date
      FROM fund_nav
      GROUP BY fund_id
    ),
    start_nav AS (
      SELECT 
        fd.fund_id,
        fn.value as start_value
      FROM fund_dates fd
      JOIN fund_nav fn ON fn.fund_id = fd.fund_id AND fn.date = fd.min_date
    ),
    end_nav AS (
      SELECT 
        fd.fund_id,
        fn.value as end_value
      FROM fund_dates fd
      JOIN fund_nav fn ON fn.fund_id = fd.fund_id AND fn.date = fd.max_date
    )
    SELECT 
      f.id as "fundId",
      f.name,
      (((en.end_value::float - sn.start_value::float) / sn.start_value::float) * 100) as "returnPercentage"
    FROM funds f
    JOIN start_nav sn ON sn.fund_id = f.id
    JOIN end_nav en ON en.fund_id = f.id
    WHERE sn.start_value > 0
    ORDER BY "returnPercentage" DESC
    LIMIT 1
  `;
  const res = await pool.query(query);
  return res.rows[0] || null;
}
