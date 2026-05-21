import dotenv from 'dotenv';
dotenv.config();
function validateEnv() {
    const required = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME', 'SESSION_SECRET'];
    const missing = required.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
        console.error('\n❌ Missing required environment variables:');
        missing.forEach(varName => console.error(`   - ${varName}`));
        console.error('\nPlease check your .env file and ensure all required variables are set.\n');
        process.exit(1);
    }
    // Build DATABASE_URL from environment variables (encoding special characters)
    const encodedUser = encodeURIComponent(process.env.DB_USER);
    const encodedPass = encodeURIComponent(process.env.DB_PASS);
    const DATABASE_URL = `mysql://${encodedUser}:${encodedPass}@${process.env.DB_HOST}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME}`;
    return {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: parseInt(process.env.PORT || '3000', 10),
        DB_HOST: process.env.DB_HOST,
        DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
        DB_USER: process.env.DB_USER,
        DB_PASS: process.env.DB_PASS,
        DB_NAME: process.env.DB_NAME,
        DATABASE_URL,
        SESSION_SECRET: process.env.SESSION_SECRET,
        CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173'
    };
}
export const env = validateEnv();
//# sourceMappingURL=env.js.map