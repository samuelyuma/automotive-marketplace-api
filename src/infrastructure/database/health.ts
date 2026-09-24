import { sql } from "./client";

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await sql`select 1`;
    return true;
  } catch {
    return false;
  }
}
