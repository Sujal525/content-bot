// Removes secrets, emails, URLs, and anonymizes client names
export const sanitize = (text, clientWords = []) => {
  if (!text) return "";
  let t = text;

  // Common secret patterns
  const patterns = [
    /\bAKIA[0-9A-Z]{16}\b/g,                                   // AWS Access Key
    /\bASIA[0-9A-Z]{16}\b/g,                                   // AWS STS Key
    /\b[A-Za-z0-9_\-]{20,}:[A-Za-z0-9_\-]{20,}\b/g,            // token:token
    /\bsk-[A-Za-z0-9]{20,}\b/g,                                // OpenAI keys
    /\bghp_[A-Za-z0-9]{20,}\b/g,                               // GitHub PAT
    /\b(?=.*\d)(?=.*[A-Za-z])[A-Za-z0-9_\-]{32,}\b/g,          // long random keys
    /secret\w*[:=]\s*["']?[\w\-]{12,}["']?/gi,
    /token\w*[:=]\s*["']?[\w\-]{12,}["']?/gi,
    /password\w*[:=]\s*["']?[^"'\s]{6,}["']?/gi,
    /api[-_\s]?key\w*[:=]\s*["']?[\w\-]{12,}["']?/gi
  ];
  for (const p of patterns) t = t.replace(p, "[redacted]");

  // Remove code pieces in summaries
  t = t.replace(/```[\s\S]*?```/g, "[code removed]");
  t = t.replace(/`[^`]+`/g, "[code]");

  // Emails / URLs
  t = t.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/gi, "[contact]");
  t = t.replace(/\bhttps?:\/\/\S+/gi, "[link]");

  // Client/org words → "customer"
  for (const w of clientWords) {
    if (!w) continue;
    const rx = new RegExp(`\\b${escapeRegExp(w)}\\b`, "gi");
    t = t.replace(rx, "customer");
  }
  return t.trim();
};

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
