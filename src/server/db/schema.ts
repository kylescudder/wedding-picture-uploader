import { uuidv4 } from '@/lib/utils'
import { pgTableCreator, varchar, uuid } from 'drizzle-orm/pg-core'

export const createTable = pgTableCreator((name) => `${name}`)

export const guest = createTable('guest', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  forename: varchar('forename').notNull()
})
export type Guest = typeof guest.$inferSelect

export const image = createTable('guest-image', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  key: varchar('key', { length: 256 }).notNull(),
  guestId: uuid('guestId')
    .notNull()
    .references(() => guest.id, { onDelete: 'cascade' })
})
export type Image = typeof image.$inferSelect
