class Table {
    constructor(tableName) {
        this.tableName = tableName;
    }


    async insert(data) {
        const keys = Object.keys(data).join(", ");
        const placeholders = Object.keys(data).map(() => "?").join(", ");
        const values = Object.values(data);
        const sql = `INSERT INTO ${this.tableName} (${keys}) VALUES (${placeholders})`;
        return await window.api.dbQuery(sql, values);
    }

    async select(whereClause = "", orderBy = "", limit = "") {
        let sql = `SELECT * FROM ${this.tableName}`;
        let values = [];
        if (whereClause) {
            Object.keys(whereClause).map(k => `${k} = ?`).join(" AND ");
            sql += ` WHERE ${whereClause}`;
            values.push(...Object.values(whereClause));
        }
        if (orderBy) sql += ` ORDER BY ${orderBy}`;
        if (limit) sql += ` LIMIT ${limit}`;
        return await window.api.dbQuery(sql, values);
    }

    async update(where, data) {
        const setKeys = Object.keys(data).map(k => `${k} = ?`).join(',');
        const setValues = Object.values(data);

        const whereKeys = Object.keys(where).map(k => `${k} = ?`).join(' AND ');
        const whereValues = Object.values(where);

        const sql = `UPDATE ${this.tableName} SET ${setKeys} WHERE ${whereKeys}`;
        return await window.api.dbQuery(sql, [...setValues, ...whereValues]);
    }

    async delete(where) {
        const whereKeys = Object.keys(where).map(k => `${k} = ?`).join(' AND ');
        const whereValues = Object.values(where);
        const sql = `DELETE FROM ${this.tableName} WHERE ${whereKeys}`;
        return await window.api.dbQuery(sql, whereValues);
    }

    /**
     * 全文搜索 - 基于 FTS5 虚拟表
     * @param {string} keyword - 搜索关键词
     * @returns {Promise<Array>} 搜索结果，包含 id 和 content
     */
    async search(keyword) {
        const sql = `
            SELECT notes.id, notes.name, notes_fts.content
            FROM notes_fts
            JOIN notes ON notes_fts.rowid = notes.rowid
            WHERE notes_fts.content MATCH ?
        `;
        // 使用 FTS5 语法，支持前缀匹配
        const searchPattern = `${keyword}`;
        return await window.api.dbQuery(sql, [searchPattern]);
    }
}
class Database {
    constructor(tables = []) {
        for (const tableName of tables) {
            this[tableName] = new Table(tableName);
        }
    }
}

const db = new Database(['notes']);

export default db;