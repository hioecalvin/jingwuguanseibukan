const chineseClasses = new Set(["taijiquan", "xingyiquan", "kungfukids", "bagua", "baguazhang"]);

export function gradingCategoryLabel(
  className: string | null | undefined,
  level: string | null | undefined,
): string {
  if (level !== "mudansha" && level !== "yudansha") return "Grade";

  const discipline = className?.toLowerCase().replace(/[\s-]+/g, "") ?? "";
  const higher = level === "yudansha";
  if (discipline === "aikido" || discipline === "karate") {
    return higher ? "Yudansha (Dan)" : "Mudansha (Kyu)";
  }
  if (chineseClasses.has(discipline)) return higher ? "Shiwei" : "Shengwei";
  return higher ? "Higher category" : "Lower category";
}
