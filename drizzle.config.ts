import { defineConfig } from 'drizzle-kit'
import 'dotenv/config'

export default defineConfig({
  out: './drizzle',
  dialect: 'postgresql',
  schema: './src/server/db/schema.ts',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? ''
  }
})
