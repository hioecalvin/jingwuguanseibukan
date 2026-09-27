export function usePathname() { return window.location.pathname; }
const router = { replace: (href: string) => window.location.assign(href), refresh: () => {} };
export function useRouter() { return router; }
