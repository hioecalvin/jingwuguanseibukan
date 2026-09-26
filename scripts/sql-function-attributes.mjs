// A lexical attribute check, NOT a PostgreSQL parser or migration dry run.
// Mask comments and dollar-quoted bodies before finding function declarations;
// body text must not satisfy an attribute check on an unsafe function.
export function functionDeclarations(sql) {
  let visible = "";
  let index = 0;
  while (index < sql.length) {
    const rest = sql.slice(index);
    if (rest.startsWith("--")) {
      const end = sql.indexOf("\n", index);
      index = end < 0 ? sql.length : end;
      visible += " ";
    } else if (rest.startsWith("/*")) {
      let depth = 1;
      index += 2;
      while (depth > 0 && index < sql.length) {
        if (sql.startsWith("/*", index)) { depth++; index += 2; }
        else if (sql.startsWith("*/", index)) { depth--; index += 2; }
        else index++;
      }
      if (depth) throw new Error("Unterminated SQL comment");
      visible += " ";
    } else {
      const tag = rest.match(/^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/)?.[0];
      if (tag) {
        const end = sql.indexOf(tag, index + tag.length);
        if (end < 0) throw new Error("Unterminated dollar-quoted SQL body");
        visible += " __body__ ";
        index = end + tag.length;
      } else if (["'", '"'].includes(sql[index])) {
        const quote = sql[index++];
        let value = quote;
        let closed = false;
        while (index < sql.length) {
          const char = sql[index++];
          value += char;
          if (char === quote) {
            if (sql[index] === quote) { value += sql[index++]; }
            else { closed = true; break; }
          }
        }
        if (!closed) throw new Error("Unterminated SQL literal");
        // Only simple identifiers may participate in search_path matching.
        visible += /^['"][A-Za-z_][A-Za-z_0-9]*['"]$/.test(value) ? value : " __literal__ ";
      } else {
        visible += sql[index++];
      }
    }
  }
  return [...visible.matchAll(/\bcreate\s+(?:or\s+replace\s+)?function\s+([^;]+)/gi)]
    .map((match) => match[0]);
}

export function hasFixedPublicSearchPath(declaration) {
  return /\bset\s+search_path\s*(?:=|to)\s*(?:public|'public'|"public")(?:\s*,\s*(?:pg_temp|'pg_temp'|"pg_temp"))?(?=\s+(?:as|language|stable|volatile|immutable|security|parallel|cost|rows|set)\b|\s*$)/i.test(declaration);
}
