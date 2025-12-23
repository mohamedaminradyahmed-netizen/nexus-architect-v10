/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * فئة التسجيل الموحدة (Logger).
 * تهدف هذه الفئة إلى توحيد مخرجات النظام وتسهيل تتبع الأخطاء باستخدام اللغة العربية.
 */
export class Logger {
    /**
     * الحصول على الطابع الزمني الحالي بتنسيق ISO.
     */
    private static getTime(): string {
        return new Date().toISOString();
    }

    /**
     * تسجيل المعلومات التشغيلية العادية.
     * @param message الرسالة التوضيحية
     * @param context أي بيانات سياقية إضافية (اختياري)
     */
    public static info(message: string, context?: any): void {
        console.log(`[معلومات] [${this.getTime()}] ${message}`, context ? JSON.stringify(context, null, 2) : '');
    }

    /**
     * تسجيل التحذيرات الأمنية أو التشغيلية.
     */
    public static warn(message: string, context?: any): void {
        console.warn(`[تحذير] [${this.getTime()}] ${message}`, context || '');
    }

    /**
     * تسجيل الأخطاء البرمجية أو الاستثناءات.
     */
    public static error(message: string, error?: any): void {
        console.error(`[خطأ] [${this.getTime()}] ${message}`, {
            message: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined
        });
    }
}