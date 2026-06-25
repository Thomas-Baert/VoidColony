// prisma.config.ts — minimal, no Accelerate
// DATABASE_URL is read directly from .env by Prisma CLI and PrismaClient
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
});
