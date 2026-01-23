import { neon } from "@neondatabase/serverless";

// Get database connection string from environment variable
// Note: Vercel/serverless environments work best without channel_binding
const connectionString = process.env.DATABASE_URL || "";

const sql = neon(connectionString);

export default sql;
