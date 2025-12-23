/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * فئة مسؤولة عن تسجيل الأحداث (Logging) بنظام هيكلي.
 * تضمن هذه الفئة تتبع العمليات داخل النظام مع رسائل توضيحية باللغة العربية.
 */
export class Logger {
    private static getTime(): string {
        return new Date().toISOString();
    }

    /**
     * تسجيل رسائل المعلومات العامة.
     */
    public static info(message: string, context?: any): void {
        console.log(`[معلومات] [${this.getTime()}] ${message}`, context || "");
    }

    /**
     * تسجيل التحذيرات التي لا تعطل النظام ولكن تتطلب انتباهاً.
     */
    public static warn(message: string, context?: any): void {
        console.warn(`[تحذير] [${this.getTime()}] ${message}`, context || "");
    }

    /**
     * تسجيل الأخطاء الفادحة مع تفاصيل الاستثناء.
     */
    public static error(message: string, error?: any): void {
        let errorDetails = "";
        
        try {
            if (error instanceof Error) {
                errorDetails = JSON.stringify({ message: error.message, stack: error.stack }, null, 2);
            } else if (typeof error === 'object') {
                errorDetails = JSON.stringify(error, null, 2);
            } else {
                errorDetails = String(error);
            }
        } catch (e) {
            errorDetails = `Unserializable Error: ${String(error)}`;
        }

        console.error(`[خطأ فادح] [${this.getTime()}] ${message}\n التفاصيل: ${errorDetails}`);
    }
}