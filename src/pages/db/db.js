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