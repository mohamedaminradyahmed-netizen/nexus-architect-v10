import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { ArchitectService, ProjectStateSchema } from './services/ArchitectService';
import { Logger } from './utils/Logger';
import { dbManager } from './database/db'; // استيراد مدير قاعدة البيانات

dotenv.config();
const app = express();
// فرض استخدام المنفذ 3001 للتوافق مع إعدادات العميل
const port = 3001;

// استخدام any لتجاوز مشاكل توافق الأنواع في بعض بيئات TypeScript
app.use(helmet() as any);
app.use(cors() as any);
app.use(express.json({ limit: '50mb' }) as any);

// تهيئة الخدمة عند الطلب (Singleton Pattern)
let architectInstance: ArchitectService | null = null;
function getArchitect() {
    if (!architectInstance) {
        architectInstance = new ArchitectService();
    }
    return architectInstance;
}

// نقطة فحص الصحة
app.get('/', (req, res) => {
    res.json({ status: 'online', system: 'Nexus Architect Backend (TS)' });
});

// نقطة استعادة الجلسة
app.get('/api/boot', async (req, res) => {
    try {
        const state = await dbManager.getLatestState();
        if (state) {
            Logger.info('تم استرجاع حالة الجلسة السابقة.');
            res.json(state);
        } else {
            // لا يوجد محتوى محفوظ، نرسل null ليقوم الفرونت ببدء جلسة جديدة
            res.json(null);
        }
    } catch (error: any) {
        Logger.error('فشل في استعادة الحالة.', error);
        res.status(500).json({ error: 'Failed to boot system' });
    }
});

// معالجة الطلبات
app.post('/api/process', async (req, res) => {
    try {
        const validation = ProjectStateSchema.safeParse(req.body);
        
        if (!validation.success) {
            return res.status(400).json({ 
                error: 'Invalid Request Format', 
                details: validation.error.issues 
            });
        }

        const architect = getArchitect();
        
        // 1. معالجة الطلب عبر Gemini
        const resultFiles = await architect.processRequest(validation.data);
        
        // 2. تحديث الحالة وحفظها في قاعدة البيانات
        const updatedFiles = { ...validation.data.files };
        resultFiles.forEach(f => {
            updatedFiles[f.path] = f;
        });

        const newState = {
            ...validation.data,
            files: updatedFiles,
            history: [
                ...validation.data.history,
                { role: 'model', text: `تم تحديث ${resultFiles.length} ملفات.` }
            ]
        };

        await dbManager.saveProjectState(newState);

        res.json(resultFiles);

    } catch (error: any) {
        Logger.error('خطأ غير متوقع في الخادم.', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

app.listen(port, '0.0.0.0', () => {
    Logger.info(`تم تشغيل الخادم الخلفي بنجاح على http://0.0.0.0:${port}`);
});