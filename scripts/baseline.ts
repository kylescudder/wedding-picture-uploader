import { readMigrationFiles } from 'drizzle-orm/migrator'
import postgres from 'postgres'
import { z } from 'zod'

const databaseUrl = z.url().parse(process.env.DATABASE_URL)
const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} })
const [initialMigration] = readMigrationFiles({
  migrationsFolder: new URL('../drizzle', import.meta.url).pathname
})

try {
  await sql.begin(async (transaction) => {
    await transaction`SELECT pg_advisory_xact_lock(739150132)`
    const columns = await transaction`
      SELECT table_name || '.' || column_name || ':' || data_type || ':' ||
        COALESCE(character_maximum_length::text, '') || ':' || is_nullable || ':' ||
        COALESCE(column_default, '') AS signature
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name IN ('guest', 'guest-image')
    `
    const expectedColumns = [
      'guest.id:uuid::NO:',
      'guest.forename:character varying::NO:',
      'guest-image.id:uuid::NO:',
      'guest-image.key:character varying:256:NO:',
      'guest-image.guestId:uuid::NO:'
    ]
    if (
      JSON.stringify(columns.map((column) => column.signature).sort()) !==
      JSON.stringify(expectedColumns.sort())
    ) {
      throw new Error(
        'Existing schema does not match the initial migration; no changes made'
      )
    }
    await transaction`SET LOCAL search_path TO public`
    const constraints = await transaction`
      SELECT relation.relname || ':' || pg_get_constraintdef(constraint_row.oid) AS signature
      FROM pg_constraint constraint_row
      JOIN pg_class relation ON relation.oid = constraint_row.conrelid
      JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public' AND relation.relname IN ('guest', 'guest-image')
        AND constraint_row.contype IN ('p', 'f', 'u', 'c', 'x')
    `
    const expectedConstraints = [
      'guest:PRIMARY KEY (id)',
      'guest-image:PRIMARY KEY (id)',
      'guest-image:FOREIGN KEY ("guestId") REFERENCES guest(id) ON DELETE CASCADE'
    ]
    if (
      JSON.stringify(
        constraints.map((constraint) => constraint.signature).sort()
      ) !== JSON.stringify(expectedConstraints.sort())
    ) {
      throw new Error(
        'Existing schema does not match the initial migration; no changes made'
      )
    }
    await transaction`CREATE SCHEMA IF NOT EXISTS drizzle`
    await transaction`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id serial PRIMARY KEY, hash text NOT NULL, created_at bigint
    )`
    const applied =
      await transaction`SELECT hash FROM drizzle.__drizzle_migrations`
    if (applied.some((migration) => migration.hash === initialMigration.hash)) {
      console.log('Initial schema is already recorded')
      return
    }
    if (applied.length)
      throw new Error('Database already has a different migration history')

    await transaction`INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${initialMigration.hash}, ${initialMigration.folderMillis})`
    console.log('Existing schema recorded; guest and photo rows are unchanged')
  })
} finally {
  await sql.end()
}
