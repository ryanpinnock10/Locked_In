import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Users ---')
    const users = await prisma.user.findMany({
        include: {
            transactions: {
                orderBy: { createdAt: 'desc' },
                take: 5
            }
        }
    })
    console.log(JSON.stringify(users, null, 2))

    console.log('--- Recent Sessions ---')
    const sessions = await prisma.session.findMany({
        orderBy: { startTime: 'desc' },
        take: 5
    })
    console.log(JSON.stringify(sessions, null, 2))
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
