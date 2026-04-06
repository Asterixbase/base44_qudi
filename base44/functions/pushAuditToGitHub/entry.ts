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

    const owner = 'Asterixbase';
    const repo = 'qudi-app';
    const branch = 'main';

    // Files to commit with their paths and descriptions
    const filesToCommit = [
      {
        path: '__tests__/currencyConverter.test.js',
        message: 'Add currency converter unit tests'
      },
      {
        path: '__tests__/rateLimiter.test.js',
        message: 'Add rate limiter unit tests'
      },
      {
        path: '__tests__/validation.test.js',
        message: 'Add validation utility tests'
      },
      {
        path: 'jest.config.js',
        message: 'Add Jest configuration'
      },
      {
        path: 'jest.setup.js',
        message: 'Add Jest setup'
      },
      {
        path: 'TESTING_README.md',
        message: 'Add testing documentation'
      },
      {
        path: 'ARCHITECTURE_OVERVIEW.html',
        message: 'Add architecture overview'
      }
    ];

    const results = [];

    for (const file of filesToCommit) {
      try {
        // Get the file content from Base44
        const fileContent = await base44.asServiceRole.functions.invoke('getFileContent', { filePath: file.path });
        
        if (fileContent?.data?.content) {
          // Encode content to base64 for GitHub API
          const encodedContent = btoa(fileContent.data.content);

          // Check if file exists
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
            // File doesn't exist yet, that's fine
          }

          // Push file to GitHub
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
                message: file.message,
                content: encodedContent,
                branch: branch,
                sha: sha
              })
            }
          );

          if (pushResponse.ok) {
            results.push({ file: file.path, status: 'success', message: 'Pushed to GitHub' });
          } else {
            const error = await pushResponse.json();
            results.push({ file: file.path, status: 'error', message: error.message });
          }
        }
      } catch (error) {
        results.push({ file: file.path, status: 'error', message: error.message });
      }
    }

    return Response.json({
      success: true,
      repository: `${owner}/${repo}`,
      branch: branch,
      filesProcessed: filesToCommit.length,
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});