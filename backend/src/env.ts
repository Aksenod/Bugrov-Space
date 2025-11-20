import dotenv from 'dotenv';

dotenv.config();

const required = ['JWT_SECRET', 'OPENAI_API_KEY'] as const;

for (const key of required) {
  if (!process.env[key] || process.env[key]?.length === 0) {
    console.warn(`[env] Missing environment variable: ${key}`);
  }
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? '',
  openAiApiKey: process.env.OPENAI_API_KEY ?? '',
};


