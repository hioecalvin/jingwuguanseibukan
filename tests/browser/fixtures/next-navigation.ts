export function usePathname() { return window.location.pathname; }
export function useRouter() {
  return { replace: (href: string) => window.location.assign(href), refresh: () => {} };
}
