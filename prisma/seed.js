const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const existingAdmin = await prisma.admin.findUnique({
    where: { email: 'admin@officerssaga.com' }
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Officers@2024', 10);
    const admin = await prisma.admin.create({
      data: {
        email: 'admin@officerssaga.com',
        password: passwordHash,
        name: 'Officers Saga Admin'
      }
    });
    console.log("Admin seeded successfully:", admin.email);
  } else {
    console.log("Admin already exists.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
