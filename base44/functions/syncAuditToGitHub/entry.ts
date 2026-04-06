import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const FILES_TO_SYNC = [
  { path: '__tests__/currencyConverter.test.js', name: 'currencyConverter.test.js' },
  { path: '__tests__/rateLimiter.test.js', name: 'rateLimiter.test.js' },
  { path: '__tests__/validation.test.js', name: 'validation.test.js' },
  { path: 'jest.config.js', name: 'jest.config.js' },
  { path: 'jest.setup.js', name: 'jest.setup.js' },
  { path: 'TESTING_README.md', name: 'TESTING_README.md' },
  { path: 'ARCHITECTURE_OVERVIEW.html', name: 'ARCHITECTURE_OVERVIEW.html' },
  { path: 'lib/currencyConverter.js', name: 'currencyConverter.js' },
  { path: 'lib/rateLimiter.js', name: 'rateLimiter.js' },
  { path: 'lib/validation.js', name: 'validation.js' },
  { path: 'lib/auditLog.js', name: 'auditLog.js' },
  { path: 'lib/transactionRetry.js', name: 'transactionRetry.js' },
  { path: '.eslintrc.json', name: '.eslintrc.json' }
];

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
    const branch = 'main';

    const results = [];
    let successCount = 0;

    for (const file of FILES_TO_SYNC) {
      try {
        // Read file from src directory
        const filePath = `./src/${file.path}`;
        let content;
        
        try {
          content = await Deno.readTextFile(filePath);
        } catch {
          results.push({
            file: file.path,
            status: 'skipped',
            message: 'File not found locally'
          });
          continue;
        }

        const encodedContent = btoa(content);

        // Check if file exists on GitHub
        let sha = null;
        try {
          const existingFile = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            }
          );
          if (existingFile.ok) {
            const fileData = await existingFile.json();
            sha = fileData.sha;
          }
        } catch {
          // File doesn't exist, that's ok
        }

        // Push to GitHub
        const pushResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: `Update ${file.name} - audit and testing infrastructure`,
              content: encodedContent,
              branch: branch,
              sha: sha || undefined
            })
          }
        );

        if (pushResponse.ok) {
          results.push({
            file: file.path,
            status: 'success',
            message: sha ? 'Updated' : 'Created'
          });
          successCount++;
        } else {
          const error = await pushResponse.json();
          results.push({
            file: file.path,
            status: 'error',
            message: error.message || 'Push failed'
          });
        }
      } catch (error) {
        results.push({
          file: file.path,
          status: 'error',
          message: error.message
        });
      }
    }

    return Response.json({
      success: successCount > 0,
      repository: `${owner}/${repo}`,
      branch: branch,
      filesProcessed: FILES_TO_SYNC.length,
      filesSynced: successCount,
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});