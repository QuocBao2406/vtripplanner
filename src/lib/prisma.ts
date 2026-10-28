import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not configured. Add it to your environment variables.",
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    // Tăng pool để tránh query phải xếp hàng chờ nhau
    max: 10,
    min: 2,
    connectionTimeoutMillis: 8000,  // Tăng từ 1500 → 8000ms
    idleTimeoutMillis: 60000,       // Giữ idle connection lâu hơn
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development"
      ? [{ emit: "stdout", level: "warn" }, { emit: "stdout", level: "error" }]
      : [],
  });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
