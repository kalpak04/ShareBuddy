import type { Config } from "drizzle-kit";
export default {
  schema: "./shared/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: false,
  strict: true,
  introspect: {
    casing: "preserve",
  },
} satisfies Config;
