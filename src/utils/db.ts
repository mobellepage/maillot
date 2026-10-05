// Supabase data-access layer: the only code that talks to the database.
// Maps the app's camelCase shapes (types/domain.ts) to/from the snake_case
// rows in types/database.ts. Every function throws on error; callers decide
// whether a failure is user-visible. Split by domain under ./db/.
export * from './db/types.ts';
export * from './db/collection.ts';
export * from './db/market.ts';
export * from './db/orders.ts';
export * from './db/misc.ts';
export * from './db/photos.ts';
export * from './db/catalog.ts';
