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
    console.log("Admin admin@officerssaga.com already exists.");
  }

  // Seed user requested admin
  const gmailAdmin = await prisma.admin.findUnique({
    where: { email: 'admin@gmail.com' }
  });

  if (!gmailAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    const admin = await prisma.admin.create({
      data: {
        email: 'admin@gmail.com',
        password: passwordHash,
        name: 'Teacher Admin'
      }
    });
    console.log("Teacher admin seeded successfully:", admin.email);
  } else {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.admin.update({
      where: { email: 'admin@gmail.com' },
      data: { password: passwordHash }
    });
    console.log("Teacher admin password updated successfully.");
  }

  // Seed new teacher credentials (officers@gmail.com)
  const officersAdmin = await prisma.admin.findUnique({
    where: { email: 'officers@gmail.com' }
  });

  if (!officersAdmin) {
    const passwordHash = await bcrypt.hash('officers@123', 10);
    const admin = await prisma.admin.create({
      data: {
        email: 'officers@gmail.com',
        password: passwordHash,
        name: 'Teacher Admin'
      }
    });
    console.log("Teacher admin officers@gmail.com seeded successfully:", admin.email);
  } else {
    const passwordHash = await bcrypt.hash('officers@123', 10);
    await prisma.admin.update({
      where: { email: 'officers@gmail.com' },
      data: { password: passwordHash }
    });
    console.log("Teacher admin officers@gmail.com password updated/verified successfully.");
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
