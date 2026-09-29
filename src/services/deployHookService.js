// backend-api/src/services/deployHookService.js
export const triggerDeploy = async () => {
  const url = process.env.CLOUDFLARE_DEPLOY_HOOK_URL;
  if (!url) return;
  try {
    await fetch(url, { method: 'POST', signal: AbortSignal.timeout(5000) });
  } catch (error) {
    console.error('Deploy hook failed:', error.message);
  }
};
