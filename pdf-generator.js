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

// Convert LaTeX formula to readable text (simple conversion for common cases)
function latexToText(latex) {
    if (!latex) return '';

    let result = latex
        // Fractions
        .replace(/\\dfrac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
        // Square root
        .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
        .replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '∛($2)')
        // Subscripts and superscripts (simple)
        .replace(/\^2/g, '²')
        .replace(/\^3/g, '³')
        .replace(/\^n/g, 'ⁿ')
        .replace(/_\{([^}]+)\}/g, '[$1]')
        .replace(/\^\{([^}]+)\}/g, '^{$1}')
        // Greek letters
        .replace(/\\alpha/g, 'α')
        .replace(/\\beta/g, 'β')
        .replace(/\\gamma/g, 'γ')
        .replace(/\\delta/g, 'δ')
        .replace(/\\pi/g, 'π')
        .replace(/\\theta/g, 'θ')
        .replace(/\\lambda/g, 'λ')
        .replace(/\\sigma/g, 'σ')
        .replace(/\\omega/g, 'ω')
        .replace(/\\phi/g, 'φ')
        // Operators
        .replace(/\\times/g, '×')
        .replace(/\\div/g, '÷')
        .replace(/\\pm/g, '±')
        .replace(/\\leq/g, '≤')
        .replace(/\\geq/g, '≥')
        .replace(/\\neq/g, '≠')
        .replace(/\\approx/g, '≈')
        .replace(/\\infty/g, '∞')
        .replace(/\\in/g, '∈')
        .replace(/\\subset/g, '⊂')
        .replace(/\\cup/g, '∪')
        .replace(/\\cap/g, '∩')
        .replace(/\\forall/g, '∀')
        .replace(/\\exists/g, '∃')
        .replace(/\\rightarrow/g, '→')
        .replace(/\\leftarrow/g, '←')
        .replace(/\\overline\{([^}]+)\}/g, '$1̄')
        .replace(/\\vec\{([^}]+)\}/g, '$1⃗')
        // Remove remaining backslash commands
        .replace(/\\[a-zA-Z]+/g, '')
        // Clean up braces
        .replace(/\{/g, '')
        .replace(/\}/g, '')
        // Clean up extra spaces
        .replace(/\s+/g, ' ')
        .trim();

    return result;
}

// Process text: replace LaTeX formulas with readable text
function processLatexInText(text) {
    if (!text) return '';

    // Replace $$...$$ and $...$ with processed formula
    return text
        .replace(/\$\$([^$]+)\$\$/g, (match, formula) => latexToText(formula))
        .replace(/\$([^$]+)\$/g, (match, formula) => latexToText(formula));
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

            // Process question text with LaTeX conversion
            const questionText = processLatexInText(q.question || '');
            doc.fontSize(11).font('Vietnamese-Bold');
            doc.text(`Câu ${questionNum}. `, { continued: true });
            doc.font('Vietnamese');
            doc.text(questionText);

            // Options - process LaTeX and display in 2 rows
            const opts = (q.options || []).map(opt => processLatexInText(opt));
            if (opts.length >= 4) {
                doc.moveDown(0.2);
                doc.text(`     A. ${opts[0]}`);
                doc.text(`     B. ${opts[1]}`);
                doc.text(`     C. ${opts[2]}`);
                doc.text(`     D. ${opts[3]}`);
            } else {
                opts.forEach((opt, i) => {
                    const label = String.fromCharCode(65 + i); // A, B, C, D
                    doc.text(`     ${label}. ${opt}`);
                });
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
            const questionText = processLatexInText(q.question || '');
            doc.fontSize(11).font('Vietnamese-Bold');
            doc.text(`Câu ${idx + 1}. `, { continued: true });
            doc.font('Vietnamese');
            doc.text(questionText);

            const labels = ['a)', 'b)', 'c)', 'd)'];
            (q.options || []).forEach((opt, i) => {
                const optText = processLatexInText(opt);
                doc.text(`     ${labels[i]} ${optText}`);
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
            const questionText = processLatexInText(q.question || '');
            doc.fontSize(11).font('Vietnamese-Bold');
            doc.text(`Câu ${idx + 1}. `, { continued: true });
            doc.font('Vietnamese');
            doc.text(questionText);
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

module.exports = { generateExamPDF };
