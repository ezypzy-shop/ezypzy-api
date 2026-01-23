import { neon } from "@neondatabase/serverless";

// Production database connection string
const connectionString = "postgresql://neondb_owner:npg_5ev1cNbqophf@ep-rapid-paper-ahe6gt1w-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(connectionString);

export default sql;
