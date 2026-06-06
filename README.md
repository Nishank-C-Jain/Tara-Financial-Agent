# Tara Financial Agent 🤖💼

Welcome to **Tara**, an intelligent financial assistant designed to help you analyze your portfolio, track transactions, check mutual fund NAVs, and query your financial data seamlessly through natural language.

The application leverages a **PostgreSQL** database backend, a **TypeScript/Node.js** service layer, and an **Express HTTP API server** to expose query capabilities.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **PostgreSQL** instance running locally or on a cloud service

### 2. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory and configure your PostgreSQL connection settings:
```ini
DB_USER=your_postgres_user
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=your_database_name
DB_PASSWORD=your_database_password
PORT=3000
```

### 4. Database Setup & Data Ingestion
Populate your database with the sample financial data:
```bash
# Ingest data from the default directory (./data/sample_a)
npm run ingest

# Or specify a different dataset directory:
npx tsx scripts/ingest.ts ./data/sample_b
```
This script runs `scripts/schema.sql` to initialize/reset the tables and then bulk inserts the data.

### 5. Running the Application
You can run Tara in two different modes:

#### A. Interactive Command Line Interface (CLI)
To start a direct chat session with Tara in your terminal:
```bash
npx tsx src/agent/tara.agent.ts
```

#### B. HTTP API Server
To start the Express server and expose endpoints for integration:
```bash
npm start
```
By default, the server runs on `http://localhost:3000`.

---

## 🛠️ API Endpoints

### 1. Health Check
- **URL**: `/health`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "status": "healthy",
    "agent": "tara"
  }
  ```

### 2. Query Agent
- **URL**: `/ask`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "query": "What is my portfolio worth?"
  }
  ```
- **Response**:
  ```json
  {
    "response": "Your portfolio is currently worth ₹1,245,670.00."
  }
  ```

---

## 🗣️ Supported Natural Language Queries

Tara supports various queries regarding your transactions, mutual funds, and portfolio:

| Category | Example Queries |
|---|---|
| **Portfolio** | `"What is my portfolio worth?"`, `"Total investment value"`, `"Show my portfolio summary"` |
| **Transactions** | `"What is my biggest expense?"`, `"What are my top 5 merchants?"`, `"How much did I spend in January 2024?"` |
| **Categories** | `"How much did I spend on food?"`, `"Spend on travel"` |
| **Ranges** | `"How much did I spend between 2024-01-01 and 2024-01-15?"` |
| **Mutual Funds** | `"What is the current NAV of fund_bluechip?"`, `"What is the return of fund_silver?"` |
| **Best Performance** | `"Which fund performed best?"`, `"What is my best holding?"` |

Type `help` in the CLI or send `"help"` to the API to receive a complete list of commands.

---

## 🧪 Testing & Evaluation
To run the evaluation script and verify that database queries are 100% aligned with the JSON source files:
```bash
# Run evaluations on the default sample data
npm run evaluate

# Run evaluations on a specific sample dataset
npx tsx scripts/evaluate.ts ./data/sample_b
```
The script will output assertion results showing a `✓ [PASS]` or `✗ [FAIL]` for all service layers (transactions, funds, and portfolio).
