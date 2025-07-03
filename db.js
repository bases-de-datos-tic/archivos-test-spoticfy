import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
    host: "xxx",
    user: "yyyr",
    password: "zzz",
    database: "spoticfy",
    port: 5432,
    ssl: {
        rejectUnauthorized: false,
    },
});

export const dbController = {
  pool: pool,
};

export const query = async (text, params = []) => {
  const client = await dbController.pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};
