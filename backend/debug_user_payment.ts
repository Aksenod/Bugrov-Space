
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const username = 'max';
    console.log(`Searching for user: ${username}`);

    const user = await prisma.user.findFirst({
        where: { username },
        include: {
            payments: true,
        },
    });

    if (!user) {
        console.log('User not found');
    } else {
        console.log('User found:', JSON.stringify(user, null, 2));
    }

    console.log('Searching for all payments...');
    const payments = await prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
    });
    console.log('Recent payments:', JSON.stringify(payments, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
