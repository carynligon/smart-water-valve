import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 moved the Migrate/introspection connection URL out of schema.prisma.
// The runtime PrismaClient gets its connection via a driver adapter (see lib/prisma.ts).
// We read process.env directly (not the throwing `env()` helper) so `prisma generate`
// works without a DB; `prisma migrate` requires DATABASE_URL to be set.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
