import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- إعدادات المستخدم (عدل هنا حسب رغبتك) ---
const CONFIG = {
    outputFile: 'project_full_code.md', // الامتداد md أفضل للذكاء الاصطناعي
    rootPaths: ['./'], // المجلدات التي تريد مسحها (نقطة تعني المجلد الحالي كاملاً)
    respectGitIgnore: true, // قراءة ملف .gitignore وتطبيقه
    addTokenCount: true, // إضافة تقدير لعدد التوكنات
    
    // ملفات ومجلدات إضافية للتجاهل (حتى لو لم تكن في gitignore)
    extraIgnores: [
        '.git', 'node_modules', 'dist', 'build', 'coverage', 
        'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
        'project_full_code.txt', 'project_full_code.md', // تجاهل ملفات الخرج
        'collect.js', 'collect_smart.js' // تجاهل السكريبتات
    ],

    // الامتدادات المسموح بها (فارغ = الكل ما عدا الثنائية)
    // مثال: ['.ts', '.tsx', '.css']
    includeExtensions: [], 
};

// --- ثوابت النظام ---
const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = process.cwd();

// الامتدادات الثنائية التي يجب تجاهلها دائماً
const BINARY_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
    '.mp3', '.mp4', '.wav', '.pdf', '.doc', '.docx', '.zip', 
    '.exe', '.dll', '.bin', '.sqlite', '.db', '.woff', '.woff2', '.ttf'
]);

// --- دوال مساعدة ---

/** قراءة ملف .gitignore وتحويله لمصفوفة */
function getGitIgnoreRules() {
    if (!CONFIG.respectGitIgnore) return [];
    const gitIgnorePath = path.join(ROOT_DIR, '.gitignore');
    if (!fs.existsSync(gitIgnorePath)) return [];
    
    const content = fs.readFileSync(gitIgnorePath, 'utf8');
    return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => line.replace(/^\//, '').replace(/\/$/, '')); // تنظيف المسارات
}

/** التحقق هل يجب تجاهل الملف/المجلد */
function shouldIgnore(entryName, relativePath, gitIgnoreRules) {
    // 1. التحقق من القائمة الإضافية
    if (CONFIG.extraIgnores.includes(entryName)) return true;
    if (CONFIG.extraIgnores.some(rule => relativePath.includes(rule))) return true;

    // 2. التحقق من قواعد gitignore (تحقق بسيط)
    if (CONFIG.respectGitIgnore) {
        if (gitIgnoreRules.includes(entryName)) return true;
        // تحقق جزئي للمجلدات
        if (gitIgnoreRules.some(rule => relativePath.startsWith(rule) || relativePath.split(path.sep).includes(rule))) return true;
    }

    return false;
}

/** التحقق هل الملف نصي */
function isTextFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) return false;
    if (CONFIG.includeExtensions.length > 0 && !CONFIG.includeExtensions.includes(ext)) return false;
    return true;
}

/** تقدير عدد التوكنات (تقريبي: 4 حروف = 1 توكن) */
function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}

// --- المحرك الرئيسي ---

function scanDirectory(dir, gitIgnoreRules, fileList = [], treeLines = [], depth = 0) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) { return { fileList, treeLines }; }

    // ترتيب المجلدات أولاً ثم الملفات
    entries.sort((a, b) => {
        if (a.isDirectory() === b.isDirectory()) return a.name.localeCompare(b.name);
        return a.isDirectory() ? -1 : 1;
    });

    entries.forEach((entry, index) => {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(ROOT_DIR, fullPath);
        
        // التحقق من التجاهل
        if (shouldIgnore(entry.name, relativePath, gitIgnoreRules)) return;

        // بناء الشجرة
        const prefix = '  '.repeat(depth) + (index === entries.length - 1 ? '└── ' : '├── ');
        treeLines.push(`${prefix}${entry.name}`);

        if (entry.isDirectory()) {
            scanDirectory(fullPath, gitIgnoreRules, fileList, treeLines, depth + 1);
        } else if (entry.isFile() && isTextFile(entry.name)) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                fileList.push({
                    path: relativePath,
                    ext: path.extname(entry.name).replace('.', ''),
                    content: content
                });
            } catch (err) {
                console.error(`⚠️ Error reading: ${relativePath}`);
            }
        }
    });

    return { fileList, treeLines };
}

// --- التنفيذ ---

(function main() {
    console.log('🚀 Starting Smart Collection...');
    const start = Date.now();
    const gitIgnoreRules = getGitIgnoreRules();

    let allFiles = [];
    let fullTree = [];

    // مسح المسارات المحددة
    CONFIG.rootPaths.forEach(rootPath => {
        const targetDir = path.resolve(ROOT_DIR, rootPath);
        const result = scanDirectory(targetDir, gitIgnoreRules);
        allFiles = [...allFiles, ...result.fileList];
        fullTree = [...fullTree, ...result.treeLines];
    });

    // بناء المحتوى النهائي بصيغة Markdown
    let outputContent = `# Project Code Dump\nGenerated: ${new Date().toLocaleString()}\n\n`;

    // 1. قسم الشجرة
    outputContent += `## 🌳 Project Structure\n\`\`\`text\n${fullTree.join('\n')}\n\`\`\`\n\n`;

    // 2. قسم الملفات
    outputContent += `## 📄 File Contents\n`;
    
    let totalChars = 0;

    allFiles.forEach(file => {
        outputContent += `\n### File: \`${file.path}\`\n`;
        // استخدام الامتداد لتلوين الكود (tsx, json, css, etc)
        outputContent += `\`\`\`${file.ext || 'txt'}\n`; 
        outputContent += file.content;
        outputContent += `\n\`\`\`\n`;
        outputContent += `---\n`;
        totalChars += file.content.length;
    });

    // 3. الإحصائيات في نهاية الملف
    if (CONFIG.addTokenCount) {
        const tokens = estimateTokens(outputContent);
        const stats = `\n## 📊 Stats\n- Total Files: ${allFiles.length}\n- Total Characters: ${outputContent.length}\n- Estimated Tokens: ~${tokens.toLocaleString()} (GPT-4 Context)\n`;
        outputContent += stats;
        console.log(stats);
    }

    // الحفظ
    try {
        fs.writeFileSync(CONFIG.outputFile, outputContent);
        console.log(`\n✅ Done! File saved to: ${CONFIG.outputFile}`);
        console.log(`⏱️ Time: ${((Date.now() - start) / 1000).toFixed(2)}s`);
    } catch (e) {
        console.error('❌ Write failed:', e);
    }
})();