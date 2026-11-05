/** Local migrations support ordinary SQL plus slash-terminated CREATE TRIGGER blocks. */
export function splitMigration(sql: string): string[] {
  const statements: string[] = [];
  let buffer = '';
  let trigger = false;
  const flushSql = () => {
    let statement = '', quote = false, lineComment = false, blockComment = false;
    for (let index = 0; index < buffer.length; index += 1) {
      const char = buffer[index], next = buffer[index + 1];
      if (lineComment) { if (char === '\n') { lineComment = false; statement += '\n'; } continue; }
      if (blockComment) { if (char === '*' && next === '/') { blockComment = false; index += 1; statement += ' '; } continue; }
      if (!quote && char === '-' && next === '-') { lineComment = true; index += 1; continue; }
      if (!quote && char === '/' && next === '*') { blockComment = true; index += 1; continue; }
      if (char === "'") {
        if (quote && next === "'") { statement += "''"; index += 1; continue; }
        quote = !quote;
      }
      if (char === ';' && !quote) { if (statement.trim()) statements.push(statement.trim()); statement = ''; }
      else statement += char;
    }
    if (quote || blockComment) throw new Error('Literal o comentario SQL incompleto.');
    if (statement.trim()) statements.push(statement.trim());
    buffer = '';
  };
  for (const line of sql.split(/\r?\n/)) {
    if (!trigger && /^\s*CREATE\s+(OR\s+REPLACE\s+)?TRIGGER\b/i.test(line)) { flushSql(); trigger = true; }
    if (trigger && line.trim() === '/') { statements.push(buffer.trim()); buffer = ''; trigger = false; }
    else buffer += `${line}\n`;
  }
  if (trigger) throw new Error('El trigger debe terminar con / en una línea propia.');
  flushSql();
  return statements;
}
