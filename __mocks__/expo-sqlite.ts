/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * In-memory mock for expo-sqlite for Jest testing.
 * Supports basic CRUD, JOINs, and defaults.
 */

interface ColumnDef { name: string; type: string; hasDefault: boolean; defaultValue?: string }

interface Table {
  columns: ColumnDef[];
  rows: Record<string, any>[];
  autoIncrement: number;
}

const tables: Record<string, Table> = {};

function resetTables() {
  Object.keys(tables).forEach((key) => delete tables[key]);
}

function parseColumns(colDefs: string): ColumnDef[] {
  const result: ColumnDef[] = [];
  const parts = colDefs.split(',').map((c) => c.trim());
  for (const part of parts) {
    const upper = part.toUpperCase();
    if (upper.startsWith('FOREIGN KEY') || upper.startsWith('PRIMARY KEY') || upper.startsWith('UNIQUE')) {
      continue;
    }
    const words = part.split(/\s+/);
    const name = words[0];
    const type = words[1] || 'TEXT';
    const defaultIdx = words.findIndex((w) => w.toUpperCase() === 'DEFAULT');
    const hasDefault = defaultIdx !== -1;
    let defaultValue: string | undefined;
    if (hasDefault) {
      const afterDefault = words.slice(defaultIdx + 1).join(' ');
      let dv = afterDefault.replace(/^'(.+)'$/, '$1');
      dv = dv.replace(/^\((.+)\)$/, '$1');
      defaultValue = dv;
    }
    result.push({ name, type, hasDefault, defaultValue });
  }
  return result;
}

function getOrCreateTable(name: string, columnDefs?: ColumnDef[]): Table {
  if (!tables[name]) {
    tables[name] = { columns: columnDefs || [], rows: [], autoIncrement: 1 };
  }
  return tables[name];
}

function applyDefaults(table: Table, row: Record<string, any>): void {
  for (const col of table.columns) {
    if (row[col.name] === undefined && col.hasDefault) {
      if (col.name === 'created_at' || col.name === 'modified_at') {
        row[col.name] = new Date().toISOString();
      } else if (col.defaultValue === 'datetime(\'now\')') {
        row[col.name] = new Date().toISOString();
      } else if (col.defaultValue === '1.3') {
        row[col.name] = 1.3;
      } else if (col.defaultValue === '2.5') {
        row[col.name] = 2.5;
      } else if (col.defaultValue === '0') {
        row[col.name] = 0;
      } else if (col.defaultValue === '1970-01-01') {
        row[col.name] = '1970-01-01T00:00:00.000Z';
      } else if (col.defaultValue && col.defaultValue !== '') {
        row[col.name] = col.defaultValue;
      } else if (!col.hasDefault) {
        row[col.name] = '';
      }
    }
  }
}

function parseCreateTable(sql: string): { name: string; columnDefs: ColumnDef[] } | null {
  const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*)\)/i);
  if (!match) return null;
  return { name: match[1], columnDefs: parseColumns(match[2]) };
}

function parseInsert(sql: string, params: any[]): { table: string; values: Record<string, any>; autoId: boolean } | null {
  const match = sql.match(/INSERT (?:OR \w+ )?INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (!match) return null;
  const table = match[1];
  const cols = match[2].split(',').map((c) => c.trim());
  const valuePlaceholders = match[3].split(',').map((v) => v.trim());

  const values: Record<string, any> = {};
  let paramIdx = 0;

  for (let i = 0; i < cols.length; i++) {
    if (valuePlaceholders[i] === '?') {
      values[cols[i]] = params[paramIdx++];
    } else {
      values[cols[i]] = valuePlaceholders[i].replace(/^'(.*)'$/, '$1');
    }
  }

  const autoId = values.id === undefined;
  return { table, values, autoId };
}

function parseUpdate(sql: string, params: any[]): { table: string; updates: Record<string, any>; whereCol: string; whereVal: any } | null {
  const match = sql.match(/UPDATE (\w+) SET (.*) WHERE (\w+) = \?/i);
  if (!match) return null;
  const table = match[1];
  const setClause = match[2];
  const whereCol = match[3];

  const updates: Record<string, any> = {};
  const pairs = setClause.split(',').map((p) => p.trim());
  let usedParams = 0;

  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const col = pair.substring(0, eqIdx).trim();
    const val = pair.substring(eqIdx + 1).trim();
    if (val === '?') {
      updates[col] = params[usedParams++];
    } else {
      updates[col] = val.replace(/^'(.*)'$/, '$1');
    }
  }

  const whereVal = params[usedParams];
  return { table, updates, whereCol, whereVal };
}

function parseDelete(sql: string, params: any[]): { table: string; whereCol: string; whereVal: any } | null {
  const match = sql.match(/DELETE FROM (\w+) WHERE (\w+) = \?/i);
  if (!match) return null;
  return { table: match[1], whereCol: match[2], whereVal: params[0] };
}

function evalOp(val: any, target: any, operator: string): boolean {
  if (operator === '<=') {
    const v1 = new Date(val).getTime();
    const v2 = new Date(target).getTime();
    if (!isNaN(v1) && !isNaN(v2)) return v1 <= v2;
  }
  if (operator === '=') {
    return String(val) === String(target);
  }
  if (operator === '<') {
    return Number(val) < Number(target);
  }
  if (operator === '>') {
    return Number(val) > Number(target);
  }
  return String(val) === String(target);
}

class MockDatabase {
  execAsync(sql: string): Promise<void> {
    const createTableMatches = sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/gi);
    for (const match of createTableMatches) {
      const colStr = match[2];
      const name = match[1];
      const existing = tables[name];
      if (!existing) {
        tables[name] = { columns: parseColumns(colStr), rows: [], autoIncrement: 1 };
      }
    }
    return Promise.resolve();
  }

  runAsync(sql: string, params: any[] = []): Promise<{ lastInsertRowId: number; changes: number }> {
    if (/INSERT/i.test(sql)) {
      const parsed = parseInsert(sql, params);
      if (parsed) {
        const table = getOrCreateTable(parsed.table);
        const row = { ...parsed.values };
        applyDefaults(table, row);
        if (parsed.autoId) {
          row.id = table.autoIncrement++;
        }
        table.rows.push(row);
        return Promise.resolve({ lastInsertRowId: row.id, changes: 1 });
      }
    }

    if (/UPDATE/i.test(sql)) {
      const parsed = parseUpdate(sql, params);
      if (parsed) {
        const table = getOrCreateTable(parsed.table);
        let changes = 0;
        for (const row of table.rows) {
          if (String(row[parsed.whereCol]) === String(parsed.whereVal)) {
            Object.assign(row, parsed.updates);
            changes++;
          }
        }
        return Promise.resolve({ lastInsertRowId: 0, changes });
      }
    }

    if (/DELETE/i.test(sql)) {
      const parsed = parseDelete(sql, params);
      if (parsed) {
        const table = getOrCreateTable(parsed.table);
        const before = table.rows.length;
        const deletedIds = table.rows
          .filter((r) => String(r[parsed.whereCol]) === String(parsed.whereVal))
          .map((r) => r.id);
        table.rows = table.rows.filter(
          (r) => String(r[parsed.whereCol]) !== String(parsed.whereVal)
        );

        // Cascade delete: remove rows from child tables
        if (parsed.table === 'decks') {
          for (const childTable of ['cards', 'reviews']) {
            if (tables[childTable]) {
              tables[childTable].rows = tables[childTable].rows.filter(
                (r) => !deletedIds.includes(r.deck_id) && !deletedIds.includes(r.card_id)
              );
            }
          }
        }
        if (parsed.table === 'cards') {
          if (tables['reviews']) {
            tables['reviews'].rows = tables['reviews'].rows.filter(
              (r) => !deletedIds.includes(r.card_id)
            );
          }
        }

        return Promise.resolve({ lastInsertRowId: 0, changes: before - table.rows.length });
      }
    }

    return Promise.resolve({ lastInsertRowId: 0, changes: 0 });
  }

  getAllAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
    const isJoin = /INNER JOIN/i.test(sql);

    if (isJoin) {
      const table1Match = sql.match(/FROM (\w+)/i);
      const joinMatch = sql.match(/INNER JOIN (\w+)/i);
      const onMatch = sql.match(/ON (\w+)\.(\w+) = (\w+)\.(\w+)/i);

      if (table1Match && joinMatch && onMatch) {
        const table1 = table1Match[1];
        const table2 = joinMatch[1];
        const t1Col = onMatch[2];
        const t2Col = onMatch[4];
        const t1 = tables[table1] || { rows: [] };
        const t2 = tables[table2] || { rows: [] };

        let results: any[] = [];
        for (const r1 of t1.rows) {
          for (const r2 of t2.rows) {
            if (String(r1[t1Col]) === String(r2[t2Col])) {
              results.push({ ...r1, ...r2 });
            }
          }
        }

        // Apply WHERE clauses - handle compound conditions with AND
        const whereMatches = [...sql.matchAll(/(?:r\.|c\.)?(\w+)\s*([><=]+)\s*\?/gi)];
        for (const wm of whereMatches) {
          const [, col, op] = wm;
          const val = params.shift();
          results = results.filter((r) => evalOp(r[col], val, op));
        }

        // Handle compound WHERE with AND (like `c.deck_id = ? AND ...`)
        const deckIdMatch_ = sql.match(/c\.deck_id = \?/i);
        if (deckIdMatch_ && params.length > 0) {
          const deckIdVal = params.shift();
          results = results.filter((r) => String(r.deck_id) === String(deckIdVal));
        }

        // ORDER BY
        const orderMatch = sql.match(/ORDER BY (?:r\.)?(\w+) (\w+)/i);
        if (orderMatch) {
          const [, col, dir] = orderMatch;
          results.sort((a, b) => {
            const va = String(a[col] || '');
            const vb = String(b[col] || '');
            return dir.toUpperCase() === 'ASC' ? va.localeCompare(vb) : vb.localeCompare(va);
          });
        }

        // LIMIT
        const limitMatch = sql.match(/LIMIT (\d+)/i);
        if (limitMatch) {
          results = results.slice(0, parseInt(limitMatch[1]));
        }

        return Promise.resolve(results as T[]);
      }
    }

    // Simple SELECT
    const fromMatch = sql.match(/FROM (\w+)/i);
    if (!fromMatch) return Promise.resolve([]);
    const tableName = fromMatch[1];
    const table = getOrCreateTable(tableName);

    const isCount = /COUNT\(\*\) as count/i.test(sql);

    if (isCount) {
      // Check for WHERE on deck_id
      const countWhereMatch = sql.match(/WHERE (\w+)\.(\w+) = \?/i) || sql.match(/WHERE (\w+) = \?/i);
      let countRows = table.rows;
      if (countWhereMatch && params.length > 0) {
        const col = countWhereMatch[2] || countWhereMatch[1];
        countRows = countRows.filter((r) => String(r[col]) === String(params[0]));
      }
      // Handle JOIN in COUNT query
      const countJoin = sql.match(/INNER JOIN (\w+) \w+ ON (?:c|c\.\w+|\w+)\.(\w+) = (?:r|r\.\w+|\w+)\.(\w+)/i);
      if (countJoin) {
        const joinTable = tables[countJoin[1]] || { rows: [] };
        const col1 = countJoin[2];
        const col2 = countJoin[3];
        countRows = [];
        for (const r1 of table.rows) {
          for (const r2 of joinTable.rows) {
            if (String(r1[col1]) === String(r2[col2])) {
              countRows.push({ ...r1, ...r2 });
            }
          }
        }
        // Filter by deck_id
        if (countWhereMatch && params.length > 0) {
          const filterCol = countWhereMatch[2] || countWhereMatch[1];
          countRows = countRows.filter((r) => String(r[filterCol]) === String(params[0]));
        }
        // Check for additional conditions like `last_review_date IS NULL`
        if (/last_review_date IS NULL/i.test(sql)) {
          countRows = countRows.filter((r) => r.last_review_date === null || r.last_review_date === undefined);
        }
        // Check for due date condition
        const dueMatch = sql.match(/next_review_date <= \?/i);
        if (dueMatch && params.length > 0) {
          countRows = countRows.filter((r) => evalOp(r.next_review_date, params[0], '<='));
        }
      }
      return Promise.resolve([{ count: countRows.length }] as unknown as T[]);
    }

    let result = [...table.rows];

    const whereMatch = sql.match(/WHERE (\w+)\.(\w+) = \?/) || sql.match(/WHERE (\w+) = \?/i);
    if (whereMatch && params.length > 0) {
      const col = whereMatch[2] || whereMatch[1];
      const val = params[0];
      result = result.filter((r) => String(r[col]) === String(val));
    }

    const orderMatch = sql.match(/ORDER BY (\w+) (\w+)/i);
    if (orderMatch) {
      const [, col, dir] = orderMatch;
      result.sort((a, b) => {
        const va = String(a[col] || '');
        const vb = String(b[col] || '');
        return dir.toUpperCase() === 'ASC' ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }

    const limitMatch = sql.match(/LIMIT (\d+)/i);
    if (limitMatch) {
      result = result.slice(0, parseInt(limitMatch[1]));
    }

    return Promise.resolve(result as T[]);
  }

  getFirstAsync<T>(sql: string, params: any[] = []): Promise<T | null> {
    const fromMatch = sql.match(/FROM (\w+)/i);
    if (!fromMatch) return Promise.resolve(null);
    const tableName = fromMatch[1];
    const table = getOrCreateTable(tableName);

    const isCount = /COUNT\(\*\) as count/i.test(sql);
    if (isCount) {
      let countRows = table.rows;

      // Handle COUNT with JOIN
      const countJoin = sql.match(/INNER JOIN (\w+) \w+ ON (?:c\.)?(\w+) = (?:r\.)?(\w+)/i);
      if (countJoin) {
        const joinTable = tables[countJoin[1]] || { rows: [] };
        const col1 = countJoin[2];
        const col2 = countJoin[3];
        countRows = [];
        for (const r1 of table.rows) {
          for (const r2 of joinTable.rows) {
            if (String(r1[col1]) === String(r2[col2])) {
              countRows.push({ ...r1, ...r2 });
            }
          }
        }
      }

      // Apply WHERE
      const whereMatch = sql.match(/WHERE (?:c\.)?(\w+) = \?/i) || sql.match(/WHERE (\w+)\.(\w+) = \?/i);
      if (whereMatch && params.length > 0) {
        const col = whereMatch[2] || whereMatch[1];
        countRows = countRows.filter((r) => String(r[col]) === String(params[0]));
      }

      // Check for IS NULL/IS NOT NULL
      if (/last_review_date IS NULL/i.test(sql)) {
        countRows = countRows.filter((r) => r.last_review_date === null || r.last_review_date === undefined);
      }
      if (/last_review_date IS NOT NULL/i.test(sql)) {
        countRows = countRows.filter((r) => r.last_review_date !== null && r.last_review_date !== undefined);
      }

      // Check for next_review_date <= ?
      const dueMatch = sql.match(/next_review_date <= \?/i);
      if (dueMatch && params.length > 0) {
        countRows = countRows.filter((r) => evalOp(r.next_review_date, params[0], '<='));
      }

      return Promise.resolve({ count: countRows.length } as unknown as T);
    }

    let result = table.rows;

    const whereMatch = sql.match(/WHERE (\w+)\.(\w+) = \?/) || sql.match(/WHERE (\w+) = \?/i);
    if (whereMatch && params.length > 0) {
      const col = whereMatch[2] || whereMatch[1];
      const val = params[0];
      result = result.filter((r) => String(r[col]) === String(val));
    }

    return Promise.resolve((result.length > 0 ? result[0] : null) as T | null);
  }
}

const dbInstances: Record<string, MockDatabase> = {};

export function openDatabaseAsync(name: string): Promise<MockDatabase> {
  if (!dbInstances[name]) {
    dbInstances[name] = new MockDatabase();
    resetTables();
  }
  return Promise.resolve(dbInstances[name]);
}

export const SQLiteDatabase = MockDatabase;
