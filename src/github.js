import axios from "axios";
const GH_API = "https://api.github.com";

const gh = (token) => axios.create({
  baseURL: GH_API,
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json"
  }
});

export const fetchCommits = async ({ token, owner, repo, since }) => {
  const client = gh(token);
  const per_page = 100;
  let page = 1, all = [];
  while (true) {
    const { data } = await client.get(`/repos/${owner}/${repo}/commits`, {
      params: { since, per_page, page }
    });
    all = all.concat(data);
    if (data.length < per_page) break;
    page++;
  }
  return all.map(c => ({
    sha: c.sha,
    message: c.commit?.message || "",
    author: c.commit?.author?.name || c.author?.login || "unknown",
    date: c.commit?.author?.date || null,
    url: c.html_url
  }));
};

export const upsertIssue = async ({ token, owner, repo, title, body }) => {
  const client = gh(token);
  // find open issue with same title
  const { data: issues } = await client.get(`/repos/${owner}/${repo}/issues`, {
    params: { state: "open", per_page: 100 }
  });
  const existing = issues.find(i => i.title === title);
  if (existing) {
    const { data } = await client.patch(`/repos/${owner}/${repo}/issues/${existing.number}`, { body });
    return data.html_url;
  }
  const { data } = await client.post(`/repos/${owner}/${repo}/issues`, {
    title, body, labels: ["auto-draft"]
  });
  return data.html_url;
};
