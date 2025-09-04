import fs from "fs-extra";

export const ensureDir = async (p) => fs.ensureDir(p);

export const isoNow = () => new Date().toISOString();

export const daysAgoISO = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - Number(days || 3));
  return d.toISOString();
};

export const writeFile = async (path, content) => fs.writeFile(path, content, "utf8");

export const readJsonSafe = async (path, def = {}) => {
  try { return await fs.readJson(path); } catch { return def; }
};

export const writeJson = async (path, data) => fs.writeJson(path, data, { spaces: 2 });

export const formatDate = (d = new Date()) => new Date(d).toISOString().slice(0,10);

export const trimTo = (text, min, max) => {
  if (!text) return "";
  let t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cutoff = t.lastIndexOf(".", max);
  if (cutoff > min) return (t.slice(0, cutoff + 1)).trim();
  return (t.slice(0, max - 1) + "…");
};

export const ensureRange = (text, min, max, tail = " Continuing to iterate and improve.") => {
  let t = trimTo(text, Math.max(0, min - 1), max);
  if (t.length >= min) return t;
  const spaceLeft = max - t.length;
  const addition = tail.slice(0, Math.max(0, spaceLeft));
  t = (t + addition).replace(/\s+/g, " ").trim();
  if (t.length < min && t.length < max) {
    const extra = " #buildinpublic";
    if (t.length + extra.length <= max) t += extra;
  }
  return t;
};
