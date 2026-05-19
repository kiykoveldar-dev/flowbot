import { createClient, type Client } from "@libsql/client";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import fs from "fs";
import path from "path";
import { config } from "../shared/config";

export interface SqlDriver {
  exec(schema: string): Promise<void>;
  get<T>(query: string, ...params: unknown[]): Promise<T | undefined>;
  all<T>(query: string, ...params: unknown[]): Promise<T[]>;
  run(query: string, ...params: unknown[]): Promise<void>;
  runInsert(query: string, ...params: unknown[]): Promise<number>;
  runChanges(query: string, ...params: unknown[]): Promise<number>;
}

let driver: SqlDriver | null = null;

function rowFromLibsql(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = value;
  }
  return out;
}

function createTursoDriver(): SqlDriver {
  const client: Client = createClient({
    url: config.tursoUrl,
    authToken: config.tursoToken,
  });

  return {
    async exec(schema: string) {
      const statements = schema
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      for (const sql of statements) {
        await client.execute(sql);
      }
    },
    async get<T>(query: string, ...params: unknown[]) {
      const result = await client.execute({
        sql: query,
        args: params as (string | number | null)[],
      });
      if (result.rows.length === 0) return undefined;
      return rowFromLibsql(result.rows[0] as Record<string, unknown>) as T;
    },
    async all<T>(query: string, ...params: unknown[]) {
      const result = await client.execute({
        sql: query,
        args: params as (string | number | null)[],
      });
      return result.rows.map((r) =>
        rowFromLibsql(r as Record<string, unknown>)
      ) as T[];
    },
    async run(query: string, ...params: unknown[]) {
      await client.execute({
        sql: query,
        args: params as (string | number | null)[],
      });
    },
    async runInsert(query: string, ...params: unknown[]) {
      const result = await client.execute({
        sql: `${query} RETURNING id`,
        args: params as (string | number | null)[],
      });
      const id = result.rows[0]?.id;
      if (id === undefined) throw new Error("Insert failed");
      return Number(id);
    },
    async runChanges(query: string, ...params: unknown[]) {
      const result = await client.execute({
        sql: `${query} RETURNING id`,
        args: params as (string | number | null)[],
      });
      return result.rows.length;
    },
  };
}

function createLocalDriver(): SqlDriver {
  let db: DatabaseSync | null = null;

  function getDb(): DatabaseSync {
    if (!db) {
      const dir = path.dirname(config.databasePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      db = new DatabaseSync(config.databasePath);
      db.exec("PRAGMA foreign_keys = ON");
    }
    return db;
  }

  function toParams(params: unknown[]): SQLInputValue[] {
    return params as SQLInputValue[];
  }

  return {
    async exec(schema: string) {
      getDb().exec(schema);
    },
    async get<T>(query: string, ...params: unknown[]) {
      return getDb().prepare(query).get(...toParams(params)) as T | undefined;
    },
    async all<T>(query: string, ...params: unknown[]) {
      return getDb().prepare(query).all(...toParams(params)) as T[];
    },
    async run(query: string, ...params: unknown[]) {
      getDb().prepare(query).run(...toParams(params));
    },
    async runInsert(query: string, ...params: unknown[]) {
      const row = getDb()
        .prepare(`${query} RETURNING id`)
        .get(...toParams(params)) as { id: number } | undefined;
      if (!row) throw new Error("Insert failed");
      return row.id;
    },
    async runChanges(query: string, ...params: unknown[]) {
      const rows = getDb()
        .prepare(`${query} RETURNING id`)
        .all(...toParams(params)) as { id: number }[];
      return rows.length;
    },
  };
}

export function getDriver(): SqlDriver {
  if (!driver) {
    driver = config.useTurso ? createTursoDriver() : createLocalDriver();
  }
  return driver;
}
