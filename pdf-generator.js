/**
 * PDF Generator using PDFKit + CodeCogs API for LaTeX
 * No external software required - pure Node.js
 */

const PDFDocument = require('pdfkit');
const https = require('https');
const http = require('http');

// Fetch image from URL and return buffer
function fetchImage(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Follow redirect
                fetchImage(response.headers.location).then(resolve).catch(reject);
                return;
            }
            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        }).on('error', reject);
    });
}

// Convert LaTeX formula to image URL using CodeCogs
function latexToImageUrl(latex) {
    const encoded = encodeURIComponent(latex);
    return `https://latex.codecogs.com/png.image?\\dpi{150}${encoded}`;
}

// Parse text and extract LaTeX formulas
function parseContent(text) {
    if (!text) return [{ type: 'text', content: '' }];

    const parts = [];
    // Match $...$ (inline) and $$...$$ (display)
    const regex = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Add text before formula
        if (match.index > lastIndex) {
            parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
        }
        // Add formula
        const formula = match[1] || match[2]; // $$...$$ or $...$
        const isDisplay = !!match[1];
        parts.push({ type: 'latex', content: formula, display: isDisplay });
        lastIndex = regex.lastIndex;
    }
    // Add remaining text
    if (lastIndex < text.length) {
        parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}

// Generate PDF from exam data
async function generateExamPDF(examData, pdfSettings = {}) {
    const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 50, right: 50 }
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));

    // Use Windows system fonts with Vietnamese Unicode support
    const path = require('path');
    const fontPath = 'C:/Windows/Fonts/times.ttf';  // Times New Roman with Vietnamese
    const fontPathBold = 'C:/Windows/Fonts/timesbd.ttf';  // Times New Roman Bold

    // Register fonts (with fallback to built-in if file not found)
    const fs = require('fs');
    if (fs.existsSync(fontPath)) {
        doc.registerFont('Vietnamese', fontPath);
        doc.registerFont('Vietnamese-Bold', fontPathBold);
        doc.font('Vietnamese');
    } else {
        // Fallback - try Arial which also has Vietnamese support
        const arialPath = 'C:/Windows/Fonts/arial.ttf';
        if (fs.existsSync(arialPath)) {
            doc.registerFont('Vietnamese', arialPath);
            doc.registerFont('Vietnamese-Bold', 'C:/Windows/Fonts/arialbd.ttf');
            doc.font('Vietnamese');
        } else {
            console.log('Warning: No Vietnamese font found, using default');
            doc.font('Helvetica');
        }
    }

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
    doc.fontSize(14).font('Vietnamese-Bold');
    doc.text('LUYỆN ĐỀ ONLINE', 50, 40);
    doc.fontSize(10).font('Vietnamese');
    doc.text('luyendeonline.io.vn', 50, 58);

    doc.fontSize(12).font('Vietnamese-Bold');
    doc.text(semesterText, 350, 40, { width: 200, align: 'right' });
    doc.text(`Môn: ${subjectName.toUpperCase()}`, 350, 58, { width: 200, align: 'right' });

    doc.fontSize(10).font('Vietnamese');
    doc.text('(Đề thi có nhiều trang)', 50, 80);
    doc.text(`Thời gian: ${duration} phút`, 350, 80, { width: 200, align: 'right' });

    // Title
    doc.moveDown(1);
    doc.fontSize(16).font('Vietnamese-Bold');
    doc.text(examTitle.toUpperCase(), { align: 'center' });

    // Student info
    doc.moveDown(0.5);
    doc.fontSize(11).font('Vietnamese');
    doc.text('Họ, tên thí sinh: .............................................. Số báo danh: .................');

    // Questions
    const questions = examData.questions || [];
    const mcQuestions = questions.filter(q => q.type === 'multiple_choice' || q.type === 'single' || q.type === 'multiple-choice');
    const tfQuestions = questions.filter(q => q.type === 'true_false' || q.type === 'true-false');
    const fibQuestions = questions.filter(q => q.type === 'fill_in_blank' || q.type === 'fill-in-blank' || q.type === 'fill');

    let questionNum = 1;

    // PHẦN I - Trắc nghiệm
    if (mcQuestions.length > 0) {
        doc.moveDown(1);
        doc.fontSize(11).font('Vietnamese-Bold');
        doc.text(`PHẦN I. Thí sinh trả lời từ câu 1 đến câu ${mcQuestions.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.`);

        for (const q of mcQuestions) {
            doc.moveDown(0.5);
            doc.fontSize(11).font('Vietnamese-Bold');
            doc.text(`Câu ${questionNum}. `, { continued: true });
            doc.font('Vietnamese');

            // Render question text (with LaTeX if present)
            await renderTextWithLatex(doc, q.question || '');

            // Options
            const opts = q.options || [];
            if (opts.length >= 4) {
                doc.moveDown(0.3);
                doc.text(`    A. ${opts[0]}          B. ${opts[1]}`);
                doc.text(`    C. ${opts[2]}          D. ${opts[3]}`);
            }

            questionNum++;
        }
    }

    // PHẦN II - Đúng sai
    if (tfQuestions.length > 0) {
        doc.moveDown(1);
        doc.fontSize(11).font('Vietnamese-Bold');
        doc.text(`PHẦN II. Đúng sai - ${tfQuestions.length} câu.`);

        tfQuestions.forEach((q, idx) => {
            doc.moveDown(0.5);
            doc.fontSize(11).font('Vietnamese-Bold');
            doc.text(`Câu ${idx + 1}. `, { continued: true });
            doc.font('Vietnamese');
            doc.text(q.question || '');

            const labels = ['a)', 'b)', 'c)', 'd)'];
            (q.options || []).forEach((opt, i) => {
                doc.text(`    ${labels[i]} ${opt}`);
            });
        });
    }

    // PHẦN III - Điền số
    if (fibQuestions.length > 0) {
        doc.moveDown(1);
        doc.fontSize(11).font('Vietnamese-Bold');
        doc.text(`PHẦN III. Điền đáp án - ${fibQuestions.length} câu.`);

        fibQuestions.forEach((q, idx) => {
            doc.moveDown(0.5);
            doc.fontSize(11).font('Vietnamese-Bold');
            doc.text(`Câu ${idx + 1}. `, { continued: true });
            doc.font('Vietnamese');
            doc.text(q.question || '');
        });
    }

    // End marker
    doc.moveDown(2);
    doc.fontSize(11).font('Vietnamese-Bold');
    doc.text('---------- HẾT ----------', { align: 'center' });

    // Footer note
    doc.moveDown(0.5);
    doc.fontSize(10).font('Vietnamese');
    doc.text(pdfSettings.footerNote || '- Thí sinh KHÔNG được sử dụng tài liệu.');
    doc.text('- Giám thị không giải thích gì thêm.');

    doc.end();

    return new Promise((resolve) => {
        doc.on('end', () => {
            resolve(Buffer.concat(buffers));
        });
    });
}

// Render text with embedded LaTeX formulas
async function renderTextWithLatex(doc, text) {
    const parts = parseContent(text);

    for (const part of parts) {
        if (part.type === 'text') {
            doc.text(part.content, { continued: parts.indexOf(part) < parts.length - 1 });
        } else if (part.type === 'latex') {
            try {
                const imageUrl = latexToImageUrl(part.content);
                const imageBuffer = await fetchImage(imageUrl);
                doc.image(imageBuffer, { height: 15, continued: !part.display });
            } catch (err) {
                // Fallback: just show the formula as text
                doc.text(`[${part.content}]`, { continued: parts.indexOf(part) < parts.length - 1 });
            }
        }
    }
}

module.exports = { generateExamPDF };
