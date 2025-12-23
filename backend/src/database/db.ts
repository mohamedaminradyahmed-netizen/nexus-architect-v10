import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { Logger } from '../utils/Logger';

class DatabaseManager {
    private dbPromise: Promise<Database<sqlite3.Database, sqlite3.Statement>> | null = null;

    public async getConnection() {
        if (!this.dbPromise) {
            this.dbPromise = open({
                filename: './nexus.db',
                driver: sqlite3.Database
            });
            await this.initializeSchema();
        }
        return this.dbPromise;
    }

    private async initializeSchema() {
        const db = await this.dbPromise;
        if (!db) return;
        try {
            await db.exec(`
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    state TEXT NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            Logger.info('تم التحقق من هيكلية قاعدة البيانات بنجاح.');
        } catch (error) {
            Logger.error('فشل في تهيئة جداول قاعدة البيانات.', error);
            throw error;
        }
    }

    /**
     * حفظ حالة المشروع الحالية.
     */
    public async saveProjectState(state: any) {
        const db = await this.getConnection();
        // نستخدم ID ثابت 'current' للمشروع الحالي للتبسيط، أو يمكن توليد ID جديد لكل جلسة
        await db.run(
            `INSERT OR REPLACE INTO projects (id, state, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
            ['current_session', JSON.stringify(state)]
        );
    }

    /**
     * استرجاع آخر حالة محفوظة.
     */
    public async getLatestState() {
        const db = await this.getConnection();
        const result = await db.get('SELECT state FROM projects WHERE id = ?', 'current_session');
        return result ? JSON.parse(result.state) : null;
    }
}

export const dbManager = new DatabaseManager();