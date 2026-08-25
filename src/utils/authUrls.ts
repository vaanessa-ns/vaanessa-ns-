/**
 * Helper to generate correct redirect URLs for Supabase Auth flows
 * Supports production (https://vaanessa-ns.vercel.app), custom domains, and local development.
 */
export function getAuthRedirectUrl(path: string = ''): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    // If running in development or custom preview
    if (origin && !origin.includes('about:blank')) {
      return `${origin}${normalizedPath}`;
    }
  }

  // Production fallback
  const prodUrl = 'https://vaanessa-ns.vercel.app';
  return `${prodUrl}${normalizedPath}`;
}
