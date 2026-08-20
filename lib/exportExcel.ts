import * as XLSX from "xlsx";


export type ExcelColumn<T> = {
  header: string;
  key: keyof T | string;

  value?: (
    row: T
  ) => unknown;
};


type ExportExcelOptions<T> = {
  filename: string;

  sheetName?: string;

  title?: string;

  columns: ExcelColumn<T>[];

  data: T[];
};


function safeFilename(
  value: string
) {
  return value
    .trim()
    .replace(
      /[<>:"/\\|?*\x00-\x1F]/g,
      "-"
    )
    .replace(
      /\s+/g,
      " "
    );
}


function safeSheetName(
  value: string
) {
  return value
    .replace(
      /[:\\/?*\[\]]/g,
      "-"
    )
    .slice(
      0,
      31
    );
}


function getNestedValue(
  object: unknown,
  path: string
) {
  if (
    !object ||
    typeof object !==
      "object"
  ) {
    return "";
  }


  return path
    .split(".")
    .reduce<unknown>(
      (
        current,
        key
      ) => {
        if (
          !current ||
          typeof current !==
            "object"
        ) {
          return "";
        }


        return (
          current as
            Record<
              string,
              unknown
            >
        )[key];
      },
      object
    );
}


function normalizeCellValue(
  value: unknown
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return "";
  }


  if (
    value instanceof
    Date
  ) {
    return value;
  }


  if (
    typeof value ===
      "boolean"
  ) {
    return value
      ? "Yes"
      : "No";
  }


  if (
    typeof value ===
      "number"
  ) {
    return value;
  }


  if (
    typeof value ===
      "object"
  ) {
    return JSON.stringify(
      value
    );
  }


  return String(
    value
  );
}


export function exportToExcel<T>({
  filename,
  sheetName = "Export",
  title,
  columns,
  data,
}: ExportExcelOptions<T>) {
  if (
    data.length ===
    0
  ) {
    throw new Error(
      "There is no data to export."
    );
  }


  /*
   * Convert app data into a clean
   * Excel-friendly table.
   */

  const rows =
    data.map(
      (
        row
      ) => {
        const output:
          Record<
            string,
            unknown
          > =
          {};


        for (
          const column
          of columns
        ) {
          const rawValue =
            column.value
              ? column.value(
                  row
                )
              : getNestedValue(
                  row,
                  String(
                    column.key
                  )
                );


          output[
            column.header
          ] =
            normalizeCellValue(
              rawValue
            );
        }


        return output;
      }
    );


  /*
   * Create worksheet.
   */

  const worksheet =
    XLSX.utils.json_to_sheet(
      rows,
      {
        origin:
          title
            ? "A3"
            : "A1",
      }
    );


  /*
   * Optional report title.
   */

  if (
    title
  ) {
    XLSX.utils.sheet_add_aoa(
      worksheet,
      [
        [
          title,
        ],
        [
          `Generated: ${new Date().toLocaleString(
            "en-AU"
          )}`,
        ],
      ],
      {
        origin:
          "A1",
      }
    );


    if (
      columns.length >
        1
    ) {
      worksheet[
        "!merges"
      ] = [
        {
          s: {
            r: 0,
            c: 0,
          },

          e: {
            r: 0,
            c:
              columns.length -
              1,
          },
        },
      ];
    }
  }


  /*
   * Automatically size columns.
   */

  worksheet[
    "!cols"
  ] =
    columns.map(
      (
        column
      ) => {
        const values =
          [
            column.header,

            ...rows.map(
              (
                row
              ) =>
                String(
                  row[
                    column.header
                  ] ??
                    ""
                )
            ),
          ];


        const width =
          Math.min(
            Math.max(
              ...values.map(
                (
                  value
                ) =>
                  value.length
              ),
              10
            ) +
              2,
            45
          );


        return {
          wch:
            width,
        };
      }
    );


  /*
   * Enable Excel filtering.
   */

  const headerRow =
    title
      ? 2
      : 0;


  worksheet[
    "!autofilter"
  ] = {
    ref:
      XLSX.utils.encode_range(
        {
          r:
            headerRow,
          c:
            0,
        },
        {
          r:
            headerRow +
            data.length,
          c:
            columns.length -
            1,
        }
      ),
  };


  /*
   * Freeze header.
   */

  (
    worksheet as
      XLSX.WorkSheet &
      {
        "!freeze"?: {
          xSplit?: number;
          ySplit?: number;
        };
      }
  )[
    "!freeze"
  ] = {
    ySplit:
      title
        ? 3
        : 1,
  };


  /*
   * Create workbook.
   */

  const workbook =
    XLSX.utils.book_new();


  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    safeSheetName(
      sheetName
    )
  );


  const finalFilename =
    safeFilename(
      filename.endsWith(
        ".xlsx"
      )
        ? filename
        : `${filename}.xlsx`
    );


  XLSX.writeFile(
    workbook,
    finalFilename
  );
}