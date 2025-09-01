import { Client } from "pg";

async function main() {
  const client = new Client({
    connectionString: process.env.FORCE_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  console.log("Connected!");

  // Check last 5 users
  const res = await client.query(
    "SELECT id, email, created_at FROM public.users ORDER BY created_at DESC LIMIT 5;"
  );
  console.log("Users:", res.rows);

  await client.end();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
  