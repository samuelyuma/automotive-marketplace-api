// PostgreSQL's uuid type accepts canonical 128-bit values regardless of version or variant bits.
export const PG_UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Max value of a PostgreSQL `integer` column (2^31 - 1)
export const PG_INT32_MAX = 2_147_483_647;

// PostgreSQL OID for the `text` type, used to type-hint array parameters for postgres.js.
export const PG_TEXT_TYPE_OID = 25;
