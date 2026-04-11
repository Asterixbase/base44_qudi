/**
 * pushPDFToGitHub
 *
 * Receives a base64-encoded PDF and commits it to the qudi-app GitHub repo.
 *
 * POST payload:
 *   {
 *     base64Content: string,   // pure base64 (no data: prefix)
 *     filePath:      string,   // e.g. "docs/Qudi-Handover.pdf"
 *     commitMessage: string    // optional
 *   }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const OWNER  = 'Asterixbase';
const REPO   = 'qudi-app';
const BRANCH = 'main';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { base64Content, filePath = 'docs/Qudi-Agency-Handover.pdf', commitMessage } = await req.json();

  if (!base64Content) {
    return Response.json({ error: 'base64Content is required' }, { status: 400 });
  }

  const accessToken = await base44.asServiceRole.connectors.getCurrentAppUserAccessToken('69d33066bb1428bbeeb208b4');

  // Check if file already exists (to get SHA for update)
  let sha = null;
  const checkRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`,
    { headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/vnd.github.v3+json' } }
  );
  if (checkRes.ok) {
    const existing = await checkRes.json();
    sha = existing.sha;
  }

  const body = {
    message: commitMessage || `docs: update handover PDF — ${new Date().toISOString().slice(0, 10)}`,
    content: base64Content,
    branch:  BRANCH,
  };
  if (sha) body.sha = sha;

  const pushRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`,
    {
      method:  'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept':        'application/vnd.github.v3+json',
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!pushRes.ok) {
    const err = await pushRes.json();
    return Response.json({ error: err.message }, { status: pushRes.status });
  }

  const data = await pushRes.json();
  return Response.json({
    success:    true,
    filePath,
    sha:        data.content?.sha,
    htmlUrl:    data.content?.html_url,
    commitUrl:  data.commit?.html_url,
  });
});