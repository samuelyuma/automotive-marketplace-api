import { FormatRegistry } from "@sinclair/typebox";
import { t } from "elysia";

import { PG_UUID_REGEX } from "../../domain/postgres";

const databaseUuidFormat = "database-uuid";

if (!FormatRegistry.Has(databaseUuidFormat))
  FormatRegistry.Set(databaseUuidFormat, (value) => PG_UUID_REGEX.test(value));

export const databaseUuidSchema = t.String({ format: databaseUuidFormat });
