export function usePathname() { return window.location.pathname; }
const router = { push: (href: string) => window.location.assign(href), replace: (href: string) => window.location.assign(href), refresh: () => {} };
export function useRouter() { return router; }
const searchParams = new URLSearchParams(window.location.search);
export function useSearchParams() { return searchParams; }
