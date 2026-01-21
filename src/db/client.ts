import { PrismaClient } from '../generated/prisma/client.js';

export const prisma = new PrismaClient();

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
