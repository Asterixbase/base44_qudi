import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = await base44.asServiceRole.connectors.getCurrentAppUserAccessToken('69d33066bb1428bbeeb208b4');
    const owner = 'Asterixbase';
    const repo = 'qudi-app';

    // List root level files
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch repo contents' }, { status: 500 });
    }

    const files = await response.json();
    const fileList = files.map(f => ({
      name: f.name,
      type: f.type,
      path: f.path
    }));

    // Check for key audit files
    const targetFiles = [
      '__tests__',
      'jest.config.js',
      'jest.setup.js',
      'TESTING_README.md',
      'ARCHITECTURE_OVERVIEW.html'
    ];

    const found = targetFiles.filter(target => 
      fileList.some(f => f.name === target)
    );

    const missing = targetFiles.filter(target =>
      !fileList.some(f => f.name === target)
    );

    return Response.json({
      owner,
      repo,
      totalFiles: fileList.length,
      allFiles: fileList,
      targetFiles: { found, missing },
      status: missing.length === 0 ? 'All files present' : `Missing: ${missing.join(', ')}`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});