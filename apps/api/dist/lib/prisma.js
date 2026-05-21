import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import { logger } from './logger.js';
import { runMigrations } from './migrations.js';
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: env.DATABASE_URL
        }
    },
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});
export async function initDatabase() {
    try {
        // Run migrations first to ensure schema is correct
        await runMigrations();
        await prisma.$connect();
        logger.info('✓ Database connected successfully');
        // Test the connection
        await prisma.$queryRaw `SELECT 1`;
        logger.info('✓ Database initialized successfully');
    }
    catch (error) {
        logger.error('\n❌ Database initialization error:');
        if (error.code === 'P1001') {
            logger.error('   Cannot reach database server');
            logger.error(`   Host: ${env.DB_HOST}`);
            logger.error('   Please check DB_HOST in your .env file\n');
        }
        else if (error.code === 'P1002') {
            logger.error('   Database server connection timeout');
            logger.error('   Please check your network and database host\n');
        }
        else if (error.code === 'P1003') {
            logger.error(`   Database "${env.DB_NAME}" does not exist`);
            logger.error('   Please create the database first\n');
        }
        else if (error.code === 'P1008') {
            logger.error('   Connection timeout');
            logger.error('   Please check DB_HOST and DB_PORT in your .env file\n');
        }
        else if (error.message?.includes('Access denied')) {
            logger.error('   Access denied - Please check your database credentials');
            logger.error(`   User: ${env.DB_USER}`);
            logger.error(`   Host: ${env.DB_HOST}`);
            logger.error('   Verify DB_USER and DB_PASS in your .env file\n');
        }
        else {
            logger.error(`   ${error.message}\n`);
        }
        throw error;
    }
}
export default prisma;
//# sourceMappingURL=prisma.js.map