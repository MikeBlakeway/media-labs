import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed initial data for the Media Labs application

  // Example: Create a user
  const user = await prisma.user.create({
    data: {
      email: 'user@example.com',
      name: 'Example User'
    }
  })

  console.log(`Created user: ${user.name} with email: ${user.email}`)

  // Add more seeding logic as needed
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
