import { readJsonSafe, writeJson, isoNow } from "./utils.js";
const STATE_FILE = "state.json";

export const loadState = async () => {
  const s = await readJsonSafe(STATE_FILE, {});
  return { last_run_at: s.last_run_at || null };
};

export const saveState = async () => {
  await writeJson(STATE_FILE, { last_run_at: isoNow() });
};
