// Role-based access guard for admin & sensitive screens
export async function checkAdminRole() {
  try {
    const user = await window.__base44?.auth.me?.();
    return user?.role === 'admin';
  } catch {
    return false;
  }
}

export function useRoleGuard(requiredRole = 'admin') {
  // Hook for components to enforce role checks
  if (typeof window !== 'undefined' && !window.__base44) {
    console.warn('Base44 SDK not initialized');
  }
  return { checkAdminRole };
}