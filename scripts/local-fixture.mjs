import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Tests can use an independently created local Supabase project without touching
// an existing developer database. Never accept a hosted database URL here.
export const localWorkdir = resolve(
  process.env.SIGNALWORD_LOCAL_WORKDIR ||
    fileURLToPath(new URL("..", import.meta.url)),
);
const config = readFileSync(
  resolve(localWorkdir, "supabase/config.toml"),
  "utf8",
);
const project = /^project_id\s*=\s*"([A-Za-z0-9_-]+)"/m.exec(config)?.[1];
if (!project) throw Error("LOCAL_PROJECT_ID_REQUIRED");
export const localContainer = `supabase_db_${project}`;
export const localRestContainer = `supabase_rest_${project}`;
