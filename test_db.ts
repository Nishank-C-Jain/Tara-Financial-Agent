import { Client } from "pg";

const combinations = [
  { port: 5050, user: "postgres", password: "123456", database: "provue_tara" },
  { port: 5432, user: "postgres", password: "123456", database: "provue_tara" },
  { port: 5050, user: "postgres", password: "Nishank!2004", database: "provue_tara" },
  { port: 5432, user: "postgres", password: "Nishank!2004", database: "provue_tara" },
  { port: 5050, user: "postgres", password: "123456", database: "postgres" },
  { port: 5432, user: "postgres", password: "123456", database: "postgres" },
  { port: 5050, user: "postgres", password: "Nishank!2004", database: "postgres" },
  { port: 5432, user: "postgres", password: "Nishank!2004", database: "postgres" },
];

async function testAll() {
  for (const config of combinations) {
    console.log(`Testing: host=localhost port=${config.port} user=${config.user} db=${config.database} password=${config.password}`);
    const client = new Client({
      host: "localhost",
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionTimeoutMillis: 3000,
    });

    try {
      await client.connect();
      console.log(`--> SUCCESS! Connected successfully to port ${config.port} with database ${config.database}`);
      const res = await client.query("SELECT version();");
      console.log(`Version: ${res.rows[0]?.version}`);
      await client.end();
      return; // Exit early if we found a working connection
    } catch (err: any) {
      console.log(`--> FAILED: ${err.message}`);
    }
  }
}

testAll();
