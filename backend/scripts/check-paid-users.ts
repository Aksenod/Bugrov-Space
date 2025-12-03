import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== Проверка пользователей с оплаченными подписками ===\n');

    try {
        // Получаем всех пользователей с isPaid = true
        const paidUsers = await prisma.user.findMany({
            where: {
                isPaid: true,
            },
            select: {
                id: true,
                username: true,
                isPaid: true,
                subscriptionExpiresAt: true,
                createdAt: true,
                payments: {
                    where: {
                        status: 'succeeded',
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 1,
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        console.log(`Найдено пользователей с оплаченными подписками: ${paidUsers.length}\n`);

        if (paidUsers.length === 0) {
            console.log('❌ Нет пользователей с isPaid = true в базе данных!');
            console.log('\nПроверяем всех пользователей...\n');
            
            const allUsers = await prisma.user.findMany({
                select: {
                    id: true,
                    username: true,
                    isPaid: true,
                    subscriptionExpiresAt: true,
                    payments: {
                        where: {
                            status: 'succeeded',
                        },
                        orderBy: {
                            createdAt: 'desc',
                        },
                        take: 1,
                        select: {
                            id: true,
                            status: true,
                            amount: true,
                            createdAt: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            console.log(`Всего пользователей в базе: ${allUsers.length}\n`);
            
            allUsers.forEach((user, index) => {
                console.log(`${index + 1}. ${user.username}:`);
                console.log(`   isPaid: ${user.isPaid}`);
                console.log(`   subscriptionExpiresAt: ${user.subscriptionExpiresAt || 'null'}`);
                if (user.payments.length > 0) {
                    const payment = user.payments[0];
                    console.log(`   Последний успешный платеж: ${payment.amount} RUB, статус: ${payment.status}, дата: ${payment.createdAt}`);
                } else {
                    console.log(`   Успешных платежей нет`);
                }
                console.log('');
            });

            // Проверяем все платежи
            console.log('\n=== Все платежи в базе ===\n');
            const allPayments = await prisma.payment.findMany({
                orderBy: {
                    createdAt: 'desc',
                },
                take: 10,
                include: {
                    user: {
                        select: {
                            username: true,
                            isPaid: true,
                        },
                    },
                },
            });

            console.log(`Последние ${allPayments.length} платежей:\n`);
            allPayments.forEach((payment, index) => {
                console.log(`${index + 1}. Платеж ${payment.id}:`);
                console.log(`   Пользователь: ${payment.user.username}`);
                console.log(`   Сумма: ${payment.amount} ${payment.currency}`);
                console.log(`   Статус: ${payment.status}`);
                console.log(`   YooKassa ID: ${payment.yookassaId}`);
                console.log(`   Дата: ${payment.createdAt}`);
                console.log(`   isPaid у пользователя: ${payment.user.isPaid}`);
                console.log('');
            });

        } else {
            paidUsers.forEach((user, index) => {
                console.log(`${index + 1}. ${user.username}:`);
                console.log(`   ID: ${user.id}`);
                console.log(`   isPaid: ${user.isPaid}`);
                console.log(`   subscriptionExpiresAt: ${user.subscriptionExpiresAt}`);
                console.log(`   Дата регистрации: ${user.createdAt}`);
                if (user.payments.length > 0) {
                    const payment = user.payments[0];
                    console.log(`   Последний успешный платеж: ${payment.amount} RUB, дата: ${payment.createdAt}`);
                }
                console.log('');
            });
        }

        // Проверяем структуру данных, которые возвращает adminUsers endpoint
        console.log('\n=== Проверка данных для adminUsers endpoint ===\n');
        const usersForAdmin = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                createdAt: true,
                isPaid: true,
                subscriptionExpiresAt: true,
                _count: {
                    select: {
                        projects: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        console.log(`Всего пользователей: ${usersForAdmin.length}\n`);
        usersForAdmin.forEach((user, index) => {
            console.log(`${index + 1}. ${user.username}:`);
            console.log(`   isPaid: ${user.isPaid} (тип: ${typeof user.isPaid})`);
            console.log(`   subscriptionExpiresAt: ${user.subscriptionExpiresAt} (тип: ${user.subscriptionExpiresAt ? typeof user.subscriptionExpiresAt : 'null'})`);
            console.log(`   Проектов: ${user._count.projects}`);
            console.log('');
        });

    } catch (error: any) {
        console.error('Ошибка при проверке:', error);
        if (error.message?.includes('isPaid')) {
            console.error('\n❌ ОШИБКА: Поле isPaid не найдено в базе данных!');
            console.error('Возможно, нужно применить миграцию: npx prisma migrate deploy');
        }
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

