import { uuidv4 } from '@/lib/utils'
import {
    pgTableCreator,
    varchar,
    uuid
} from 'drizzle-orm/pg-core'

export const createTable = pgTableCreator((name) => `${name}`)

export const image = createTable('image', {
    id: uuid('id')
        .primaryKey()
        .$defaultFn(() => uuidv4()),
    key: varchar('key', { length: 256 }).notNull()
})
export type Image = typeof image.$inferSelect