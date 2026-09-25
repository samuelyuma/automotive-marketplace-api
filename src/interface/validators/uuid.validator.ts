import { FormatRegistry } from "@sinclair/typebox";
import { t } from "elysia";

import { databaseUuidPattern } from "../../domain/uuid";

const databaseUuidFormat = "database-uuid";

if (!FormatRegistry.Has(databaseUuidFormat))
  FormatRegistry.Set(databaseUuidFormat, (value) =>
    databaseUuidPattern.test(value),
  );

export const databaseUuidSchema = t.String({ format: databaseUuidFormat });
