import axios from "axios";
import { ensureRange } from "./utils.js";
import { sanitize } from "./sanitize.js";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

const constrainAndSanitize = (txt, min, max) => {
  const cleaned = sanitize(txt || "", []);
  return ensureRange(cleaned, min, max);
};

export const buildDraft = async ({ openaiKey, commitPoints }) => {
  const bulletList = commitPoints.map(p => `• ${p}`).join("\n");

  if (!openaiKey) {
    const summary = commitPoints.join("; ");
    const x = constrainAndSanitize(
      `Shipped updates over the last few days: ${summary}. Focus: incremental improvements, cleaner flows, and smoother UX. #buildinpublic`,
      180, 260
    );
    const li = constrainAndSanitize(
      `Dev update: Over the last few days I focused on ${summary}. Goal: clearer journeys, improved reliability, and quality-of-life wins. Next up: iterate on feedback and simplify further. #software #buildinpublic`,
      400, 700
    );
    return { bulletList, x, li };
  }

  const prompt = [
    { role: "system", content: "Create concise posts from commit bullets. No secrets, no raw code, no URLs." },
    { role: "user",
      content:
`Turn these commit bullets into two versions:

Bullets:
${bulletList}

Constraints:
- X-version: 180–260 characters, friendly, include 1 relevant hashtag, no raw code or links.
- LinkedIn-version: 400–700 characters, outcome-focused, 2–4 relevant hashtags, no raw code or links.
Return JSON with keys: x, linkedin.`
    }
  ];

  try {
    const { data } = await axios.post(
      OPENAI_URL,
      { model: MODEL, messages: prompt, temperature: 0.5 },
      { headers: { Authorization: `Bearer ${openaiKey}` } }
    );
    const text = data?.choices?.[0]?.message?.content || "";
    let x = "", li = "";
    try {
      const parsed = JSON.parse(text);
      x = parsed.x || "";
      li = parsed.linkedin || "";
    } catch {
      const xMatch = text.match(/"x"\s*:\s*"([\s\S]*?)"/);
      const liMatch = text.match(/"linkedin"\s*:\s*"([\s\S]*?)"/);
      x = xMatch?.[1] || "";
      li = liMatch?.[1] || "";
    }
    x = constrainAndSanitize(x, 180, 260);
    li = constrainAndSanitize(li, 400, 700);
    return { bulletList, x, li };
  } catch {
    // fallback if API fails
    const summary = commitPoints.join("; ");
    const x = constrainAndSanitize(
      `Shipped updates over the last few days: ${summary}. Focus: incremental improvements, cleaner flows, and smoother UX. #buildinpublic`,
      180, 260
    );
    const li = constrainAndSanitize(
      `Dev update: Over the last few days I focused on ${summary}. Goal: clearer journeys, improved reliability, and quality-of-life wins. Next up: iterate on feedback and simplify further. #software #buildinpublic`,
      400, 700
    );
    return { bulletList, x, li };
  }
};
