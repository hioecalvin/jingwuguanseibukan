export function isAikidoClass(name: string | null | undefined): boolean {
  return name?.trim().toLowerCase() === "aikido";
}

export function aikikaiForClass(
  className: string | null | undefined,
  registration: string | null | undefined,
): string | null {
  return isAikidoClass(className) ? registration ?? null : null;
}

export function isAikidoYudansha(
  className: string | null | undefined,
  level: string | null | undefined,
): boolean {
  return isAikidoClass(className) && level === "yudansha";
}
