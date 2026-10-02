/*
 * =====================================================
 * JINGWUGUAN SEIBUKAN
 * GLOBAL DATE FORMATTING
 *
 * Display standard:
 * DD/MM/YYYY
 *
 * Database values remain:
 * YYYY-MM-DD
 * =====================================================
 */


/*
 * Example:
 *
 * 2026-08-19
 * ->
 * 19/08/2026
 */

export function formatDate(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "-";
  }


  /*
   * PostgreSQL DATE
   *
   * Avoid timezone conversion.
   */

  const dateOnly =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );


  if (dateOnly) {
    const [
      ,
      year,
      month,
      day,
    ] = dateOnly;


    return `${day}/${month}/${year}`;
  }


  /*
   * Timestamp
   */

  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }


  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}


/*
 * =====================================================
 * DATE + TIME
 *
 * Example:
 *
 * 2026-08-19T14:35:00
 * ->
 * 19/08/2026, 14:35
 * =====================================================
 */

export function formatDateTime(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "-";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }


  return date.toLocaleString(
    "en-GB",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",

      hour: "2-digit",
      minute: "2-digit",

      hour12: false,
    }
  );
}


/*
 * =====================================================
 * DATE FOR HTML INPUT
 *
 * <input type="date" />
 *
 * Browser requires:
 * YYYY-MM-DD
 * =====================================================
 */

export function formatDateForInput(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "";
  }


  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return value;
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }


  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );


  return `${year}-${month}-${day}`;
}


/*
 * =====================================================
 * OPTIONAL LONG DATE
 *
 * Useful for certificates:
 *
 * 19 August 2026
 * =====================================================
 */

export function formatLongDate(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "-";
  }


  const dateOnly =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );


  let date: Date;


  if (dateOnly) {
    const [
      ,
      year,
      month,
      day,
    ] = dateOnly;


    date =
      new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
      );
  } else {
    date =
      new Date(value);
  }


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }


  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}


/*
 * =====================================================
 * LAST TRAINING SESSION
 *
 * `daysAgo` is calculated by PostgreSQL using the Jakarta
 * business date. The browser only chooses the agreed display.
 * =====================================================
 */

export function formatTrainingSessionRecency(
  trainingDate:
    | string
    | null
    | undefined,
  daysAgo:
    | number
    | null
    | undefined
) {
  if (!trainingDate) {
    return "Not recorded";
  }

  if (
    typeof daysAgo !== "number" ||
    !Number.isInteger(daysAgo) ||
    daysAgo < 0 ||
    daysAgo >= 30
  ) {
    return formatDate(trainingDate);
  }

  if (daysAgo === 0) {
    return "Today";
  }

  if (daysAgo === 1) {
    return "1 day ago";
  }

  return `${daysAgo} days ago`;
}
