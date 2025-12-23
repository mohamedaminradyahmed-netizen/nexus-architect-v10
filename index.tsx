/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { ProjectFile, ProjectState, ChatMessage } from './types';
import { architectApi } from './server/api';
import { Logger } from './server/Logger';
import DottedGlowBackground from './components/DottedGlowBackground';
import { ThinkingIcon, SparklesIcon, ArrowUpIcon, CodeIcon, GridIcon } from './components/Icons';

// تحميل مكتبة Prism للتظليل البرمجي
const PRISM_CDN = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js";
const PRISM_CSS = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css";

function App() {
    const [files, setFiles] = useState<ProjectFile[]>([]);
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentProcessingFile, setCurrentProcessingFile] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState('جاري تهيئة النظام...');
    const [image, setImage] = useState<{ data: string; mimeType: string } | null>(null);
    const [isExplorerOpen, setIsExplorerOpen] = useState(true);
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    
    const [isCreatingFile, setIsCreatingFile] = useState(false);
    const [newFileName, setNewFileName] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const codeRef = useRef<HTMLElement>(null);

    // تهيئة التطبيق واستعادة البيانات المحفوظة
    useEffect(() => {
        const initialize = async () => {
            const savedState = await architectApi.boot();
            if (savedState) {
                setFiles(Object.values(savedState.files));
                setHistory(savedState.history);
                Logger.info('تم استعادة حالة العمل بنجاح.');
            }
        };
        initialize();
    }, []);

    // تحميل وتنسيق كود التظليل
    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet'; link.href = PRISM_CSS;
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = PRISM_CDN; script.async = true;
        document.body.appendChild(script);
        
        return () => {
            document.head.removeChild(link);
            if (document.body.contains(script)) document.body.removeChild(script);
        };
    }, []);

    useEffect(() => {
        if (codeRef.current && (window as any).Prism) {
            (window as any).Prism.highlightElement(codeRef.current);
        }
    }, [selectedPath, files, isLoading]);

    useEffect(() => {
        if (files.length > 0 && !selectedPath) {
            const indexFile = files.find(f => f.path === 'index.html');
            setSelectedPath(indexFile ? 'index.html' : files[0].path);
        }
    }, [files, selectedPath]);

    // محاكاة مراحل التحليل المعماري برسائل عربية فصيحة
    useEffect(() => {
        let interval: any;
        if (isLoading) {
            const logicalSteps = [
                "جاري تحليل السياق العام للمشروع...",
                "تحسين أنظمة التصميم (Design System)...",
                "توليد المنطق البرمجي للمكونات...",
                "إكمال المخطط المعماري النهائي..."
            ];
            let step = 0;
            interval = setInterval(() => {
                const totalOptions = files.length + logicalSteps.length;
                const index = step % totalOptions;
                if (index < files.length) {
                    const fileName = files[index].path;
                    setCurrentProcessingFile(fileName);
                    setLoadingMessage(`جاري بناء ملف: ${fileName}...`);
                } else {
                    setCurrentProcessingFile(null);
                    setLoadingMessage(logicalSteps[index - files.length]);
                }
                step++;
            }, 1800);
        }
        return () => clearInterval(interval);
    }, [isLoading, files]);

    const handleSend = async () => {
        if ((!inputValue.trim() && !image) || isLoading) return;

        const currentPrompt = inputValue;
        setIsLoading(true);

        const currentState: ProjectState = {
            files: Object.fromEntries(files.map(f => [f.path, f])),
            history: history,
            prompt: currentPrompt,
            imageBase64: image?.data
        };

        try {
            const result = await architectApi.process(currentState);
            setFiles(result);
            setHistory(prev => [
                ...prev, 
                { role: 'user', text: currentPrompt },
                { role: 'model', text: `اكتملت عملية التوليف. تم تحديث المشروع بـ ${result.length} ملفات.` }
            ]);
            setInputValue('');
            setImage(null);
            Logger.info('تم تحديث حالة الواجهة الأمامية بنجاح.');
        } catch (err) {
            let msg = "حدث خطأ غير متوقع.";
            if (err instanceof Error) {
                // تحليل رسالة الخطأ لتحديد السبب وعرض رسالة عربية مناسبة
                const errMsg = err.message.toLowerCase();
                
                if (errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('connection refused')) {
                    msg = "تعذر الاتصال بالخادم. تأكد من أن الخادم الخلفي يعمل (Port 3001).";
                } else if (errMsg.includes('500') || errMsg.includes('server error')) {
                    msg = "خطأ في الخادم (500). يرجى التحقق من سجلات الخادم ومفتاح API.";
                } else if (errMsg.includes('400') || errMsg.includes('invalid request')) {
                    msg = "طلب غير صالح (400). قد يكون النص طويلاً جداً أو الصورة غير مدعومة.";
                } else if (errMsg.includes('json')) {
                    msg = "تلقى النظام استجابة غير صالحة من الخادم (JSON Parse Error).";
                } else if (errMsg.includes('timeout')) {
                    msg = "انتهت مهلة الطلب. الخادم يستغرق وقتاً طويلاً للاستجابة.";
                } else {
                    msg = `خطأ في النظام: ${err.message}`;
                }
            }
            
            Logger.error('خطأ في طلب المستخدم.', err);
            alert(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateFile = () => {
        if (!newFileName.trim()) { setIsCreatingFile(false); return; }
        const ext = newFileName.split('.').pop()?.toLowerCase() || '';
        let lang: any = 'typescript';
        if (['html', 'htm'].includes(ext)) lang = 'html';
        else if (['css'].includes(ext)) lang = 'css';
        else if (['json'].includes(ext)) lang = 'json';
        
        const newFile: ProjectFile = {
            path: newFileName,
            content: lang === 'html' ? '<!DOCTYPE html>\n<html>\n<body>\n  <h1>نموذج جديد</h1>\n</body>\n</html>' : '// مكون معماري جديد',
            language: lang,
            lastModified: Date.now()
        };
        setFiles(prev => [...prev, newFile]);
        setSelectedPath(newFileName);
        setNewFileName('');
        setIsCreatingFile(false);
    };

    const activeFile = files.find(f => f.path === selectedPath);
    const isHtml = activeFile?.language === 'html' || activeFile?.path.endsWith('.html');

    return (
        <div className="nexus-app">
            <DottedGlowBackground gap={32} radius={0.8} speedScale={0.2} opacity={0.3} />
            
            <header className="nexus-header">
                <div className="logo">NEXUS <span>ARCHITECT v4.0</span></div>
                <div className="header-actions">
                    <button className={`toggle-btn ${isExplorerOpen ? 'active' : ''}`} onClick={() => setIsExplorerOpen(!isExplorerOpen)}>
                        <GridIcon /> {isExplorerOpen ? 'إخفاء المتصفح' : 'المتصفح'}
                    </button>
                </div>
            </header>

            <main className={`nexus-stage ${isExplorerOpen ? 'explorer-open' : ''}`}>
                <aside className="project-explorer">
                    <div className="explorer-header">
                        <span>نطاق المشروع</span>
                        <div className="explorer-controls">
                            <button className="add-file-btn" onClick={() => setIsCreatingFile(true)} title="ملف جديد">
                                <SparklesIcon />
                            </button>
                            {isLoading && <div className="loading-pulse-small" />}
                        </div>
                    </div>

                    {isCreatingFile && (
                        <div className="new-file-input">
                            <input autoFocus type="text" placeholder="اسم_الملف.اللاحقة" value={newFileName}
                                onChange={(e) => setNewFileName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' ? handleCreateFile() : e.key === 'Escape' && setIsCreatingFile(false)}
                            />
                        </div>
                    )}

                    <div className="file-list">
                        {files.length === 0 && !isLoading && <div className="empty-files">في انتظار المخطط الأول...</div>}
                        {files.map(f => {
                            const isBeingProcessed = isLoading && (currentProcessingFile === f.path || currentProcessingFile === null);
                            return (
                                <div key={f.path} className={`file-item ${selectedPath === f.path ? 'active' : ''} ${isBeingProcessed ? 'processing' : ''}`}
                                    onClick={() => !isLoading && setSelectedPath(f.path)}>
                                    <div className="file-icon-wrapper">{isBeingProcessed ? <ThinkingIcon /> : <CodeIcon />}</div>
                                    <div className="file-info">
                                        <span className="file-name">{f.path}</span>
                                        <span className="file-meta">{f.language}</span>
                                    </div>
                                    {isBeingProcessed && <div className="file-loading-bar-granular" />}
                                </div>
                            );
                        })}
                    </div>
                </aside>

                <section className="preview-container">
                    {!activeFile && !isLoading ? (
                        <div className="welcome-screen">
                            <SparklesIcon />
                            <h1>بناء واجهات برمجية متطورة.</h1>
                            <p>صف رؤيتك البرمجية أو ارفع صورة مرجعية. سيقوم "نكسوس" بإنتاج كود جاهز للاستخدام وفق نظامك التصميمي المعتمد.</p>
                            <div className="quick-starts">
                                <button onClick={() => setInputValue("أنشئ لوحة تحكم سحابية مع رسوم بيانية")}>لوحة تحكم</button>
                                <button onClick={() => setInputValue("صمم واجهة دردشة ذكاء اصطناعي احترافية")}>واجهة دردشة</button>
                            </div>
                        </div>
                    ) : (
                        <div className="preview-pane">
                            <div className="preview-pane-header">
                                <div className="preview-tab">
                                    <CodeIcon />
                                    <span>{activeFile?.path || 'جاري المعالجة...'}</span>
                                    {isHtml && <span className="preview-badge">بيئة التشغيل</span>}
                                </div>
                                <div className="preview-actions">
                                    <div className="status-indicator">
                                        {isLoading ? (
                                            <span className="status-text loading"><ThinkingIcon /> {loadingMessage}</span>
                                        ) : (
                                            <span className="status-text ready">النظام جاهز</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="preview-pane-content">
                                {isLoading && (
                                    <div className="loading-overlay-granular">
                                        <div className="architect-loader-v3">
                                            <div className="loader-visual"><ThinkingIcon /><div className="scanning-line" /></div>
                                            <div className="loader-text-group">
                                                <p className="loading-primary">{loadingMessage}</p>
                                                <p className="loading-secondary">تطبيق أنماط Obsidian Tech المتقدمة...</p>
                                            </div>
                                            <div className="loader-progress-container"><div className="loader-progress-bar-fill" /></div>
                                        </div>
                                    </div>
                                )}
                                {activeFile ? (
                                    isHtml ? (
                                        <iframe srcDoc={activeFile.content} title="Nexus Runtime" className="nexus-iframe" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
                                    ) : (
                                        <div className="code-viewer-themed">
                                            <pre><code ref={codeRef} className={`language-${activeFile.language}`}>{activeFile.content}</code></pre>
                                        </div>
                                    )
                                ) : !isLoading && (
                                    <div className="empty-preview"><ThinkingIcon /><p>اختر ملفاً لمعاينته</p></div>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </main>

            <footer className="nexus-footer">
                <div className="input-container">
                    <div className={`nexus-input-box ${isLoading ? 'is-loading' : ''}`}>
                        <button className="attach-btn" onClick={() => fileInputRef.current?.click()} title="إرفاق صورة">
                            <SparklesIcon />
                        </button>
                        <input type="file" hidden ref={fileInputRef} accept="image/*" 
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const r = new FileReader();
                                r.onload = () => setImage({ data: (r.result as string).split(',')[1], mimeType: file.type });
                                r.readAsDataURL(file);
                            }} 
                        />
                        <input type="text" placeholder={isLoading ? "المعمار يفكر..." : "صف المكون الجديد أو اطلب تعديلاً شاملاً..."}
                            value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()} disabled={isLoading}
                        />
                        <button className="send-btn" onClick={handleSend} disabled={isLoading || (!inputValue.trim() && !image)}>
                            {isLoading ? <ThinkingIcon /> : <ArrowUpIcon />}
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);