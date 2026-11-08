type DojoGroupRow = { dojo_name: string; class_name: string };

export function dojoGroupName(row: DojoGroupRow): string | null {
  const name = row.dojo_name.trim().toLowerCase().replace(/\s+/g, " ").replace(/ dojo$/, "");
  const discipline = row.class_name.trim().toLowerCase().replace(/\s+/g, " ");
  if (name === "chushin" && ["aikido", "karate"].includes(discipline)) return "Chushin";
  if (name === "zhongxin" && ["taijiquan", "taiji", "xingyiquan", "xingyi", "kungfu kids", "kungfukids"].includes(discipline)) return "Zhongxin";
  return null;
}

export function dojoGroupKey(row: DojoGroupRow & { dojo_id: string }): string {
  const name = dojoGroupName(row);
  return name ? `location-${name}` : row.dojo_id;
}
