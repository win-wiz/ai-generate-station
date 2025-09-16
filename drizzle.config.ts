import { type Config } from "drizzle-kit";
import { env } from "@/env";

// Determine if we're using Cloudflare D1 remote
const isD1Remote = env.DATABASE_URL === "d1-remote";

let config: Config;

if (isD1Remote && env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_DATABASE_ID && env.CLOUDFLARE_D1_TOKEN) {
  // Production Cloudflare D1 database
  config = {
    schema: "./src/server/db/schema.ts",
    dialect: "sqlite",
    driver: "d1-http",
    dbCredentials: {
      accountId: env.CLOUDFLARE_ACCOUNT_ID,
      databaseId: env.CLOUDFLARE_DATABASE_ID,
      token: env.CLOUDFLARE_D1_TOKEN,
    },
    tablesFilter: ["ai-generate-station_*"],
    verbose: true,
    strict: true,
  };
} else {
  // Standard SQLite or LibSQL configuration (including local development)
  config = {
    schema: "./src/server/db/schema.ts",
    dialect: "sqlite",
    dbCredentials: {
      url: env.DATABASE_URL === "d1-local" ? "file:./db.sqlite" : env.DATABASE_URL,
    },
    tablesFilter: ["ai-generate-station_*"],
    verbose: true,
    strict: true,
  };
}

export default config;
