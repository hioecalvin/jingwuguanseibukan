import assert from "node:assert/strict";
import test from "node:test";

import { loadRoute } from "./load-route-test.mjs";

function exporter() {
  const calls = [];
  const xlsx = {
    utils: {
      json_to_sheet(rows, options) {
        calls.push({ name: "json_to_sheet", rows, options });
        return {};
      },
      sheet_add_aoa(worksheet, rows, options) {
        calls.push({ name: "sheet_add_aoa", worksheet, rows, options });
      },
      encode_range(start, end) {
        return `${start.r}:${start.c}-${end.r}:${end.c}`;
      },
      book_new() {
        return { sheets: [] };
      },
      book_append_sheet(workbook, worksheet, name) {
        workbook.sheets.push({ worksheet, name });
        calls.push({ name: "book_append_sheet", workbook, worksheet, sheetName: name });
      },
    },
    writeFile(workbook, filename) {
      calls.push({ name: "writeFile", workbook, filename });
    },
  };

  return {
    ...loadRoute("lib/exportExcel.ts", { xlsx }),
    calls,
  };
}

test("administrative exports preserve numbers but neutralize formula-like text", () => {
  const route = exporter();

  route.exportToExcel({
    filename: "payments",
    columns: [
      { header: "Member", key: "member.name" },
      { header: "Reference", key: "reference" },
      { header: "Amount", key: "amount" },
      { header: "Enabled", key: "enabled" },
    ],
    data: [
      {
        member: { name: "=HYPERLINK(\"https://example.invalid\")" },
        reference: "  +SUM(1,1)",
        amount: -250,
        enabled: true,
      },
    ],
  });

  const rows = route.calls.find((call) => call.name === "json_to_sheet").rows;
  assert.equal(rows[0].Member, "'=HYPERLINK(\"https://example.invalid\")");
  assert.equal(rows[0].Reference, "'  +SUM(1,1)");
  assert.equal(rows[0].Amount, -250);
  assert.equal(rows[0].Enabled, "Yes");
});

test("all common spreadsheet formula prefixes are exported as literal text", () => {
  const route = exporter();
  const values = ["=1+1", "+1+1", "-1+1", "@SUM(1,1)", "\t=1+1", "ordinary"];

  route.exportToExcel({
    filename: "audit.xlsx",
    columns: [{ header: "Value", key: "value" }],
    data: values.map((value) => ({ value })),
  });

  const rows = route.calls.find((call) => call.name === "json_to_sheet").rows;
  assert.deepEqual(
    rows.map((row) => row.Value),
    ["'=1+1", "'+1+1", "'-1+1", "'@SUM(1,1)", "'\t=1+1", "ordinary"],
  );
});

test("report titles are literal and workbook names remain sanitized", () => {
  const route = exporter();

  route.exportToExcel({
    filename: "settlement:history",
    sheetName: "settlement/history[2026]",
    title: "=WEBSERVICE(\"https://example.invalid\")",
    columns: [{ header: "Status", key: "status" }],
    data: [{ status: "submitted" }],
  });

  const titleRows = route.calls.find((call) => call.name === "sheet_add_aoa").rows;
  assert.equal(titleRows[0][0], "'=WEBSERVICE(\"https://example.invalid\")");
  assert.equal(
    route.calls.find((call) => call.name === "book_append_sheet").sheetName,
    "settlement-history-2026-",
  );
  assert.equal(
    route.calls.find((call) => call.name === "writeFile").filename,
    "settlement-history.xlsx",
  );
});

test("exports fail closed when data or column definitions are empty", () => {
  const route = exporter();

  assert.throws(
    () => route.exportToExcel({ filename: "empty", columns: [{ header: "Name", key: "name" }], data: [] }),
    /There is no data to export/,
  );
  assert.throws(
    () => route.exportToExcel({ filename: "invalid", columns: [], data: [{ name: "Member" }] }),
    /There are no columns to export/,
  );
  assert.deepEqual(route.calls, []);
});
