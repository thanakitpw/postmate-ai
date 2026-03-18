#!/usr/bin/env node
/**
 * PostMate AI — Database Setup Script
 *
 * Runs the full schema migration and creates storage buckets.
 *
 * Usage (one of):
 *
 *   # Option 1: Use Supabase Personal Access Token (recommended)
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/setup-database.js
 *
 *   # Option 2: Use database connection string directly
 *   node scripts/setup-database.js --db-url "postgresql://postgres:[PASSWORD]@db.xkvuatexzcjdjkqfhpwi.supabase.co:6543/postgres"
 *
 * Get your access token at: https://supabase.com/dashboard/account/tokens
 * Get your database password at: Supabase Dashboard > Settings > Database > Connection string
 */

const fs = require("fs");
const path = require("path");

const PROJECT_REF = "xkvuatexzcjdjkqfhpwi";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const MANAGEMENT_API = "https://api.supabase.com";

function getServiceRoleKey() {
  try {
    const envPath = path.join(__dirname, "..", ".env.local");
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
    if (match) return match[1].trim();
  } catch (e) {
    // ignore
  }
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function getDbUrl() {
  const argIdx = process.argv.indexOf("--db-url");
  if (argIdx !== -1 && process.argv[argIdx + 1]) {
    return process.argv[argIdx + 1];
  }
  return process.env.DATABASE_URL;
}

function getMigrationSQL() {
  const migrationPath = path.join(
    __dirname,
    "..",
    "supabase",
    "migrations",
    "20260319000000_initial_schema.sql"
  );
  return fs.readFileSync(migrationPath, "utf-8");
}

// Method 1: Management API with PAT
async function runViaManagementAPI(accessToken) {
  console.log("\n[1/3] Running schema via Management API...\n");
  const sql = getMigrationSQL();

  const resp = await fetch(
    `${MANAGEMENT_API}/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Management API error (${resp.status}): ${err}`);
  }

  console.log("  Schema migration executed successfully via Management API.");
}

async function verifyRLSViaAPI(accessToken) {
  console.log("\n[2/3] Verifying RLS...\n");
  const query = `
    SELECT tablename, rowsecurity FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('user_profiles','clients','projects','project_sessions',
      'monthly_plan_configs','ai_series','posts','post_results')
    ORDER BY tablename;`;

  const resp = await fetch(
    `${MANAGEMENT_API}/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!resp.ok) {
    console.log("  Warning: Could not verify RLS.");
    return;
  }

  const rows = await resp.json();
  const expected = [
    "user_profiles", "clients", "projects", "project_sessions",
    "monthly_plan_configs", "ai_series", "posts", "post_results",
  ];
  let allOk = true;
  for (const row of rows) {
    const ok = row.rowsecurity;
    console.log(`  ${ok ? "[OK]" : "[!!]"} ${row.tablename}: RLS ${ok ? "ENABLED" : "DISABLED"}`);
    if (!ok) allOk = false;
  }
  const found = rows.map((r) => r.tablename);
  for (const t of expected) {
    if (!found.includes(t)) { console.log(`  [!!] ${t}: NOT FOUND`); allOk = false; }
  }
  if (allOk) console.log("\n  All tables have RLS enabled.");
}

// Method 2: Direct pg connection
async function runViaPG(dbUrl) {
  console.log("\n[1/3] Running schema via direct database connection...\n");
  const { Client } = require("pg");
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  console.log("  Connected to database.");
  await client.query(getMigrationSQL());
  console.log("  Schema migration executed successfully.");
  return client;
}

async function verifyRLSViaPG(client) {
  console.log("\n[2/3] Verifying RLS...\n");
  const expected = [
    "user_profiles", "clients", "projects", "project_sessions",
    "monthly_plan_configs", "ai_series", "posts", "post_results",
  ];
  const result = await client.query(
    `SELECT tablename, rowsecurity FROM pg_tables
     WHERE schemaname = 'public' AND tablename = ANY($1) ORDER BY tablename;`,
    [expected]
  );
  let allOk = true;
  for (const row of result.rows) {
    const ok = row.rowsecurity;
    console.log(`  ${ok ? "[OK]" : "[!!]"} ${row.tablename}: RLS ${ok ? "ENABLED" : "DISABLED"}`);
    if (!ok) allOk = false;
  }
  const found = result.rows.map((r) => r.tablename);
  for (const t of expected) {
    if (!found.includes(t)) { console.log(`  [!!] ${t}: NOT FOUND`); allOk = false; }
  }
  if (allOk) console.log("\n  All tables have RLS enabled.");
}

// Storage buckets
async function createStorageBuckets(serviceRoleKey) {
  console.log("\n[3/3] Creating storage buckets...\n");
  const buckets = [
    {
      id: "media", name: "media", public: true,
      file_size_limit: 52428800,
      allowed_mime_types: ["image/jpeg","image/png","image/gif","image/webp","video/mp4","video/quicktime"],
    },
    {
      id: "screenshots", name: "screenshots", public: false,
      file_size_limit: 10485760,
      allowed_mime_types: ["image/jpeg","image/png","image/webp"],
    },
  ];

  for (const bucket of buckets) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bucket),
      });
      const data = await resp.json();
      if (resp.ok) {
        console.log(`  [OK] Bucket "${bucket.id}" created (public: ${bucket.public})`);
      } else if (data.message && data.message.includes("already exists")) {
        console.log(`  [OK] Bucket "${bucket.id}" already exists`);
      } else {
        console.log(`  [!!] Bucket "${bucket.id}":`, data.message || JSON.stringify(data));
      }
    } catch (err) {
      console.log(`  [!!] Bucket "${bucket.id}":`, err.message);
    }
  }
}

async function main() {
  console.log("PostMate AI — Database Setup");
  console.log("============================");

  const serviceRoleKey = getServiceRoleKey();
  const dbUrl = getDbUrl();
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (!accessToken && !dbUrl) {
    console.error("\nError: No authentication method provided.\n");
    console.error("Option 1 (recommended): Set SUPABASE_ACCESS_TOKEN");
    console.error("  Get token: https://supabase.com/dashboard/account/tokens");
    console.error("  SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/setup-database.js\n");
    console.error("Option 2: Provide --db-url");
    console.error("  Find it: Supabase Dashboard > Settings > Database > Connection string");
    console.error('  node scripts/setup-database.js --db-url "postgresql://..."\n');
    console.error("Option 3: Copy SQL from supabase/migrations/20260319000000_initial_schema.sql");
    console.error("  Paste into: https://supabase.com/dashboard/project/xkvuatexzcjdjkqfhpwi/sql/new\n");
    process.exit(1);
  }

  let pgClient = null;
  try {
    if (accessToken) {
      await runViaManagementAPI(accessToken);
      await verifyRLSViaAPI(accessToken);
    } else {
      pgClient = await runViaPG(dbUrl);
      await verifyRLSViaPG(pgClient);
    }

    if (serviceRoleKey) {
      await createStorageBuckets(serviceRoleKey);
    } else {
      console.log("\n[3/3] Skipping buckets (no service role key).");
    }

    console.log("\n============================");
    console.log("Setup complete!");
  } catch (err) {
    console.error("\nSetup failed:", err.message);
    process.exit(1);
  } finally {
    if (pgClient) await pgClient.end().catch(() => {});
  }
}

main();
