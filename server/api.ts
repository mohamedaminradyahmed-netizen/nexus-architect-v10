import { ProjectFile, ProjectState } from '../types';
import { Logger } from './Logger';

/**
 * دالة مساعدة للانتظار (Sleep)
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * واجهة الاتصال بالخادم الخلفي (API Bridge).
 * تقوم هذه الوحدة بتوجيه الطلبات إلى الخادم وتعمل كطبقة تجريد.
 */
export const architectApi = {
    /**
     * استعادة حالة الجلسة من الخادم عند بدء التطبيق.
     * تتضمن آلية إعادة المحاولة (Retry Logic) لضمان الاتصال حتى لو تأخر الخادم في البدء.
     */
    async boot(): Promise<ProjectState | null> {
        let retries = 5;
        let delay = 1000;

        while (retries > 0) {
            try {
                const response = await fetch('/api/boot');
                
                if (!response.ok) {
                    const statusText = response.statusText;
                    let errorBody = "";
                    try { errorBody = await response.text(); } catch(e) {}
                    
                    // إذا كان الخطأ 404 من الخادم نفسه (وليس من البروكسي)، فهذا يعني أن المسار غير موجود
                    // ولكن إذا كان "File not found" فقد يكون البروكسي لم يعمل بعد
                    throw new Error(`HTTP Error: ${response.status} ${statusText} - ${errorBody.substring(0, 100)}`);
                }

                try {
                    const data = await response.json();
                    return data;
                } catch (jsonError) {
                    throw new Error("Invalid JSON response");
                }
                
            } catch (error) {
                retries--;
                if (retries === 0) {
                    Logger.error('فشل نهائي في تحميل حالة البداية من الخادم.', error);
                    return null;
                }
                Logger.warn(`فشل الاتصال بالخادم، جاري إعادة المحاولة... (متبقي ${retries} محاولات)`);
                await sleep(delay);
                delay *= 1.5; // زيادة وقت الانتظار تدريجياً
            }
        }
        return null;
    },

    /**
     * إرسال حالة المشروع الحالية للمعالجة في الخادم.
     */
    async process(state: ProjectState): Promise<ProjectFile[]> {
        try {
            const response = await fetch('/api/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state)
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errMsg = `Server Error: ${response.status}`;
                try {
                    const errData = JSON.parse(errorText);
                    errMsg = errData.error || errMsg;
                } catch(e) {
                    errMsg += ` - ${errorText.substring(0, 100)}`;
                }
                throw new Error(errMsg);
            }

            return await response.json();
        } catch (error: any) {
            Logger.error('خطأ أثناء التواصل مع واجهة المعماري.', error);
            throw error;
        }
    }
};