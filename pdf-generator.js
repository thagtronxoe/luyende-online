/**
 * PDF Generator using PDFKit + CodeCogs API for LaTeX images
 * Fetches LaTeX formulas as images from CodeCogs for nice rendering
 */

const PDFDocument = require('pdfkit');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Fetch image from URL and return buffer
function fetchImage(url, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
        const protocol = url.startsWith('https') ? https : http;

        protocol.get(url, (response) => {
            clearTimeout(timer);
            if (response.statusCode === 301 || response.statusCode === 302) {
                fetchImage(response.headers.location, timeout).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }
            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        }).on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

// Get LaTeX image URL from CodeCogs
function getLatexImageUrl(latex) {
    const encoded = encodeURIComponent(latex);
    return `https://latex.codecogs.com/png.image?\\inline&space;\\dpi{120}${encoded}`;
}

// Extract LaTeX formulas from text
function extractLatex(text) {
    if (!text) return { parts: [{ type: 'text', content: '' }], hasLatex: false };

    const parts = [];
    const regex = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;
    let lastIndex = 0;
    let match;
    let hasLatex = false;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
        }
        const formula = match[1] || match[2];
        const isDisplay = !!match[1];
        parts.push({ type: 'latex', content: formula, display: isDisplay });
        hasLatex = true;
        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return { parts: parts.length > 0 ? parts : [{ type: 'text', content: text }], hasLatex };
}

// Generate PDF from exam data
async function generateExamPDF(examData, pdfSettings = {}) {
    const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 50, right: 50 }
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));

    // Use Windows system fonts for Vietnamese
    const fontPath = 'C:/Windows/Fonts/times.ttf';
    const fontPathBold = 'C:/Windows/Fonts/timesbd.ttf';

    if (fs.existsSync(fontPath)) {
        doc.registerFont('VN', fontPath);
        doc.registerFont('VN-Bold', fontPathBold);
    } else {
        const arialPath = 'C:/Windows/Fonts/arial.ttf';
        if (fs.existsSync(arialPath)) {
            doc.registerFont('VN', arialPath);
            doc.registerFont('VN-Bold', 'C:/Windows/Fonts/arialbd.ttf');
        }
    }

    const normalFont = fs.existsSync(fontPath) ? 'VN' : 'Helvetica';
    const boldFont = fs.existsSync(fontPath) ? 'VN-Bold' : 'Helvetica-Bold';

    doc.font(normalFont);

    const examTitle = examData.title || 'Đề thi';
    const subjectName = examData.subjectName || 'TOÁN';
    const duration = examData.duration || 90;

    // Semester text
    const semester = examData.semester || '';
    let semesterText = 'ĐỀ ÔN TẬP';
    if (semester === 'gk1') semesterText = 'ĐỀ ÔN TẬP GIỮA HỌC KÌ 1';
    else if (semester === 'ck1') semesterText = 'ĐỀ ÔN TẬP CUỐI HỌC KÌ 1';
    else if (semester === 'gk2') semesterText = 'ĐỀ ÔN TẬP GIỮA HỌC KÌ 2';
    else if (semester === 'ck2') semesterText = 'ĐỀ ÔN TẬP CUỐI HỌC KÌ 2';

    // Header
    doc.fontSize(14).font(boldFont);
    doc.text('LUYỆN ĐỀ ONLINE', 50, 40);
    doc.fontSize(10).font(normalFont);
    doc.text('luyendeonline.io.vn', 50, 58);

    doc.fontSize(12).font(boldFont);
    doc.text(semesterText, 350, 40, { width: 200, align: 'right' });
    doc.text(`Môn: ${subjectName.toUpperCase()}`, 350, 58, { width: 200, align: 'right' });

    doc.fontSize(10).font(normalFont);
    doc.text('(Đề thi có nhiều trang)', 50, 80);
    doc.text(`Thời gian: ${duration} phút`, 350, 80, { width: 200, align: 'right' });

    // Title
    doc.moveDown(1);
    doc.fontSize(16).font(boldFont);
    doc.text(examTitle.toUpperCase(), 50, doc.y, { align: 'center', width: 495 });

    // Student info
    doc.moveDown(0.5);
    doc.fontSize(11).font(normalFont);
    doc.text('Họ, tên thí sinh: .............................................. Số báo danh: .................', 50);

    // Questions
    const questions = examData.questions || [];
    const mcQuestions = questions.filter(q => q.type === 'multiple_choice' || q.type === 'single' || q.type === 'multiple-choice');
    const tfQuestions = questions.filter(q => q.type === 'true_false' || q.type === 'true-false');
    const fibQuestions = questions.filter(q => q.type === 'fill_in_blank' || q.type === 'fill-in-blank' || q.type === 'fill');

    let questionNum = 1;

    // Helper to render text with LaTeX images
    async function renderText(text, x, options = {}) {
        const { parts, hasLatex } = extractLatex(text);

        if (!hasLatex) {
            doc.text(text, x, doc.y, options);
            return;
        }

        let currentX = x;
        const startY = doc.y;

        for (const part of parts) {
            if (part.type === 'text') {
                const width = doc.widthOfString(part.content);
                doc.text(part.content, currentX, startY, { continued: false });
                currentX += width;
            } else {
                try {
                    const imgUrl = getLatexImageUrl(part.content);
                    const imgBuffer = await fetchImage(imgUrl);
                    doc.image(imgBuffer, currentX, startY - 3, { height: 14 });
                    currentX += 50; // Approximate width
                } catch (err) {
                    // Fallback to text
                    doc.text(`[${part.content}]`, currentX, startY);
                }
            }
        }
        doc.moveDown(0.3);
    }

    // Helper for simple text (no LaTeX processing - faster)
    function simpleText(text, options = {}) {
        doc.text(text, 50, doc.y, { width: 495, ...options });
    }

    // PHẦN I - MC
    if (mcQuestions.length > 0) {
        doc.moveDown(1);
        doc.font(boldFont).fontSize(11);
        simpleText(`PHẦN I. Thí sinh trả lời từ câu 1 đến câu ${mcQuestions.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.`);

        for (const q of mcQuestions) {
            doc.moveDown(0.3);
            doc.font(boldFont).fontSize(12);
            doc.text(`Câu ${questionNum}. `, 50, doc.y, { continued: true });
            doc.font(normalFont).fontSize(11);

            // Simple text without LaTeX image fetching for speed
            const questionText = (q.question || '').replace(/\$\$?([^$]+)\$\$?/g, '$1');
            doc.text(questionText);

            // Options - 2 per row
            const opts = q.options || [];
            const allShort = opts.every(o => (o || '').length < 20);

            if (opts.length >= 4) {
                doc.fontSize(11).font(normalFont);
                const optA = (opts[0] || '').replace(/\$\$?([^$]+)\$\$?/g, '$1');
                const optB = (opts[1] || '').replace(/\$\$?([^$]+)\$\$?/g, '$1');
                const optC = (opts[2] || '').replace(/\$\$?([^$]+)\$\$?/g, '$1');
                const optD = (opts[3] || '').replace(/\$\$?([^$]+)\$\$?/g, '$1');

                if (allShort) {
                    doc.text(`     A. ${optA}     B. ${optB}     C. ${optC}     D. ${optD}`, 50);
                } else {
                    doc.text(`     A. ${optA}          B. ${optB}`, 50);
                    doc.text(`     C. ${optC}          D. ${optD}`, 50);
                }
            }
            questionNum++;
        }
    }

    // PHẦN II - TF
    if (tfQuestions.length > 0) {
        doc.moveDown(1);
        doc.font(boldFont).fontSize(11);
        simpleText(`PHẦN II. Đúng sai - ${tfQuestions.length} câu.`);

        tfQuestions.forEach((q, idx) => {
            doc.moveDown(0.3);
            doc.font(boldFont).fontSize(12);
            doc.text(`Câu ${idx + 1}. `, 50, doc.y, { continued: true });
            doc.font(normalFont).fontSize(11);
            const qText = (q.question || '').replace(/\$\$?([^$]+)\$\$?/g, '$1');
            doc.text(qText);

            const labels = ['a)', 'b)', 'c)', 'd)'];
            (q.options || []).forEach((opt, i) => {
                const optText = (opt || '').replace(/\$\$?([^$]+)\$\$?/g, '$1');
                doc.text(`     ${labels[i]} ${optText}`, 50);
            });
        });
    }

    // PHẦN III - Fill
    if (fibQuestions.length > 0) {
        doc.moveDown(1);
        doc.font(boldFont).fontSize(11);
        simpleText(`PHẦN III. Điền đáp án - ${fibQuestions.length} câu.`);

        fibQuestions.forEach((q, idx) => {
            doc.moveDown(0.3);
            doc.font(boldFont).fontSize(12);
            doc.text(`Câu ${idx + 1}. `, 50, doc.y, { continued: true });
            doc.font(normalFont).fontSize(11);
            const qText = (q.question || '').replace(/\$\$?([^$]+)\$\$?/g, '$1');
            doc.text(qText);
        });
    }

    // End
    doc.moveDown(2);
    doc.font(boldFont).fontSize(11);
    doc.text('---------- HẾT ----------', 50, doc.y, { align: 'center', width: 495 });

    doc.moveDown(0.5);
    doc.font(normalFont).fontSize(10);
    doc.text('- Thí sinh KHÔNG được sử dụng tài liệu.', 50);
    doc.text('- Giám thị không giải thích gì thêm.', 50);

    doc.end();

    return new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(buffers)));
    });
}

// Generate and save PDF to file
async function generateAndSavePDF(examData, pdfSettings, outputPath) {
    const pdfBuffer = await generateExamPDF(examData, pdfSettings);
    fs.writeFileSync(outputPath, pdfBuffer);
    return outputPath;
}

module.exports = { generateExamPDF, generateAndSavePDF };
