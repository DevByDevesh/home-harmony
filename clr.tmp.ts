import { PrismaClient } from "@prisma/client"; const p = new PrismaClient(); await p.rateLimit.deleteMany(); await p.$disconnect();
