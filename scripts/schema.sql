-- Schema definition for Pazago Assignment

DROP TABLE IF EXISTS holdings CASCADE;
DROP TABLE IF EXISTS fund_nav CASCADE;
DROP TABLE IF EXISTS fund_navs CASCADE;
DROP TABLE IF EXISTS funds CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;

CREATE TABLE funds (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL
);

CREATE TABLE fund_nav (
    fund_id VARCHAR(100) REFERENCES funds(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    value NUMERIC(15, 4) NOT NULL,
    PRIMARY KEY (fund_id, date)
);

CREATE TABLE holdings (
    fund_id VARCHAR(100) PRIMARY KEY REFERENCES funds(id) ON DELETE CASCADE,
    fund_name VARCHAR(255) NOT NULL,
    units NUMERIC(15, 4) NOT NULL,
    purchase_date DATE NOT NULL,
    purchase_nav NUMERIC(15, 4) NOT NULL
);

CREATE TABLE transactions (
    id VARCHAR(100) PRIMARY KEY,
    date DATE NOT NULL,
    merchant VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(15, 4) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    memo TEXT
);
