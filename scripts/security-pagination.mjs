export async function allVisibleMembers(client) {
  const rows = [];
  let expectedCount;
  const pageSize = 100;
  do {
    const { data, error, count } = await client
      .from("admin_visible_members")
      .select("*", { count: "exact" })
      .order("membership_id", { nullsFirst: true })
      .order("user_id")
      .range(rows.length, rows.length + pageSize - 1);
    if (error) {
      throw new Error(
        `Member view query failed: ${error.code ?? "unknown error"} ${error.message ?? ""}`.trim()
      );
    }
    if (!Number.isSafeInteger(count) || count < 0 || count > 100000) {
      throw new Error("Member view returned an invalid or unbounded row count");
    }
    if (expectedCount !== undefined && count !== expectedCount) {
      throw new Error("Member view changed during the test; rerun with stable fixtures");
    }
    expectedCount = count;
    if (!Array.isArray(data) || (data.length === 0 && rows.length < count)) {
      throw new Error("Member view was truncated before all visible rows were checked");
    }
    rows.push(...data);
  } while (rows.length < expectedCount);
  if (rows.length !== expectedCount) throw new Error("Member view row count mismatch");
  return rows;
}
