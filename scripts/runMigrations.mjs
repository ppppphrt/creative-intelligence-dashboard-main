#!/usr/bin/env node

/**
 * Database Migration Runner
 * Applies pending migrations to the database
 */

import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  let connection;

  try {
    // Parse DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL environment variable not set");
    }

    // Handle both mysql:// and mysql+ssl:// URLs
    let urlString = dbUrl;
    if (dbUrl.startsWith("mysql+ssl://")) {
      urlString = dbUrl.replace("mysql+ssl://", "mysql://");
    }
    const url = new URL(urlString);
    
    console.log(`[Migration] Connecting to database: ${url.hostname}`);

    const isTiDB = url.hostname.includes("tidbcloud.com");
    connection = await mysql.createConnection({
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      port: parseInt(url.port || "3306"),
      ssl: isTiDB ? {} : { rejectUnauthorized: false },
    });

    console.log("[Migration] Connected successfully");

    // Read migration files
    const migrationsDir = path.join(__dirname, "../drizzle");
    const sqlFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    console.log(`[Migration] Found ${sqlFiles.length} migration files`);

    for (const file of sqlFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf-8");

      console.log(`[Migration] Executing: ${file}`);

      // Split by statement-breakpoint and execute each statement
      const statements = sql
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        try {
          await connection.execute(statement);
          console.log(`[Migration] ✓ Statement executed`);
        } catch (error) {
          if (error.code === "ER_TABLE_EXISTS_ERROR") {
            console.log(`[Migration] ℹ Table already exists (skipping)`);
          } else if (error.code === "ER_DUP_FIELDNAME") {
            console.log(`[Migration] ℹ Column already exists (skipping)`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log("[Migration] ✓ All migrations completed successfully");
    return { success: true };
  } catch (error) {
    console.error("[Migration] ✗ Error:", error.message);
    return { success: false, error: error.message };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migrations
runMigrations().then((result) => {
  process.exit(result.success ? 0 : 1);
});
