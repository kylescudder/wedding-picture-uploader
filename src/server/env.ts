import { createServerOnlyFn } from '@tanstack/react-start'
import { z } from 'zod'

const serverEnvironment = z.object({
  DATABASE_URL: z.url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development')
})

// Read and validate at runtime so builds don't need database credentials.
export const getServerEnv = createServerOnlyFn(() =>
  serverEnvironment.parse(process.env)
)
