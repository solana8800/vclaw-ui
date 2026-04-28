
import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  console.log("Checking Order model fields...")
  // @ts-ignore
  const orderFields = Object.keys(prisma.order.fields || {})
  console.log("Order fields:", orderFields)
  
  // Try to find if fulfillmentStatus exists in the type definition (not runtime)
  // We can't easily do that here, but we can check if the generated client has it.
}

main()
