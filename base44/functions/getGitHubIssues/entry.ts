import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get GitHub access token using the qudi-app connector
    const accessToken = await base44.asServiceRole.connectors.getCurrentAppUserAccessToken('69d33066bb1428bbeeb208b4');

    // Fetch open issues from qudi-app repo
    const response = await fetch('https://api.github.com/repos/Asterixbase/qudi-app/issues?state=open&sort=updated&direction=desc', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      return Response.json({ error: `GitHub API error: ${response.status}` }, { status: response.status });
    }

    const issues = await response.json();
    return Response.json({ 
      total: issues.length,
      issues: issues.map(issue => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        state: issue.state,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        labels: issue.labels.map(l => l.name),
        url: issue.html_url
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});