import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { Logger } from '../utils/Logger';
import { dbManager } from '../database/db';

// تعريف الثوابت لضمان دقة الأنواع
const LANGUAGES = ['typescript', 'css', 'json', 'html', 'javascript'] as const;

// تعريف مخطط التحقق من البيانات (Validation Schema)
const ProjectFileSchema = z.object({
    path: z.string(),
    content: z.string(),
    language: z.enum(LANGUAGES),
    lastModified: z.number().optional()
});

const ChatMessageSchema = z.object({
    role: z.enum(['user', 'model'] as const),
    text: z.string()
});

export const ProjectStateSchema = z.object({
    files: z.record(z.string(), ProjectFileSchema),
    history: z.array(ChatMessageSchema),
    prompt: z.string(),
    imageBase64: z.string().optional()
});

type ProjectState = z.infer<typeof ProjectStateSchema>;
type ProjectFile = z.infer<typeof ProjectFileSchema>;

/**
 * خدمة المعماري (Architect Service).
 * تحتوي على منطق التواصل مع الذكاء الاصطناعي وإدارة سياق المشروع بشكل آمن.
 */
export class ArchitectService {
    private client: GoogleGenAI | null = null;
    private readonly SESSION_ID = 'default-session';

    constructor() {
        // لا نقوم بتهيئة العميل هنا لتجنب تحطم الخادم عند البدء
    }

    private getClient(): GoogleGenAI {
        if (!this.client) {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error("تكوين غير صالح: مفتاح Gemini مفقود (GEMINI_API_KEY).");
            }
            this.client = new GoogleGenAI({ apiKey });
        }
        return this.client;
    }

    /**
     * استرجاع الحالة المحفوظة عند بدء التشغيل.
     */
    public async bootSession(): Promise<ProjectState | null> {
        return await dbManager.getLatestState();
    }

    /**
     * معالجة طلب المستخدم وتحديث البنية البرمجية.
     */
    public async processRequest(currentState: ProjectState): Promise<ProjectFile[]> {
        Logger.info('بدء معالجة طلب معماري جديد.', { prompt: currentState.prompt });

        // 1. بناء السياق للذكاء الاصطناعي
        const historyContext = currentState.history.length > 0
            ? "تاريخ المحادثة السابقة:\n" + currentState.history.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')
            : "لا يوجد سجل سابق.";

        let filesDump = "الملفات الحالية في المشروع:\n";
        Object.entries(currentState.files).forEach(([path, file]) => {
            const f = file as ProjectFile;
            filesDump += `--- FILE: ${path} (${f.language}) ---\n${f.content}\n\n`;
        });

        const systemInstruction = `
ROLE: You are "Nexus", a Principal Software Architect.
MANDATE: "Case Closed" standard. Produce production-grade, secure, and clean code.

DESIGN SYSTEM:
- Use Tailwind CSS for styling.
- Use a dark, professional aesthetic (Obsidian/Zinc palette).
- Ensure strict TypeScript typing.

TASK:
- Analyze the user request.
- Update existing files or create new ones to satisfy the requirement.
- RETURN ONLY A JSON ARRAY of file objects.
- NO explanatory text outside the JSON.
        `.trim();

        const finalPrompt = `
${systemInstruction}

CONTEXT:
${historyContext}

${filesDump}

USER REQUEST:
"${currentState.prompt}"

OUTPUT FORMAT:
[{"path": "index.html", "content": "...", "language": "html"}]
        `.trim();

        try {
            // 2. التواصل مع Gemini (يتم التحقق من المفتاح هنا)
            const aiClient = this.getClient();
            const contents: any = { parts: [{ text: finalPrompt }] };
            if (currentState.imageBase64) {
                contents.parts.push({
                    inlineData: { mimeType: 'image/png', data: currentState.imageBase64 }
                });
            }

            // Using gemini-3-pro-preview for complex coding tasks
            const response = await aiClient.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents,
                config: {
                    responseMimeType: 'application/json',
                    temperature: 0.1
                }
            });

            // 3. معالجة الرد
            const rawText = response.text || '[]';
            const cleanJson = rawText.replace(/^```json/i, '').replace(/```$/i, '').trim();
            
            let generatedFiles: ProjectFile[] = [];
            try {
                generatedFiles = JSON.parse(cleanJson);
            } catch (e) {
                Logger.error('فشل تحليل رد JSON من النموذج.', rawText);
                throw new Error("الرد الوارد من المعماري غير صالح.");
            }

            // 4. تحديث الحالة الدائمة وحفظها في قاعدة البيانات
            const updatedFilesMap = { ...currentState.files };
            generatedFiles.forEach(f => {
                updatedFilesMap[f.path] = f;
            });

            const newHistory = [
                ...currentState.history,
                { role: 'user', text: currentState.prompt } as const,
                { role: 'model', text: `تم تحديث ${generatedFiles.length} ملفات.` } as const
            ];

            const newState: ProjectState = {
                files: updatedFilesMap,
                history: newHistory,
                prompt: '' // إعادة تعيين الطلب
            };

            await dbManager.saveProjectState(newState);
            Logger.info(`تم إتمام العملية بنجاح. تم توليد ${generatedFiles.length} ملف.`);

            return generatedFiles;

        } catch (error) {
            Logger.error('حدث خطأ أثناء دورة حياة المعماري.', error);
            throw error;
        }
    }
}
