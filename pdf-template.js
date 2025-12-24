// PDF Template Generator
// Generates complete HTML document for Puppeteer PDF rendering

function generateExamPDFHTML(examData, pdfSettings = {}) {
    const examTitle = examData.title || 'Đề thi';
    const subjectName = examData.subjectName || 'TOÁN';
    const duration = examData.duration || 90;
    const grade = examData.grade || '12';

    // Semester detection
    const semester = examData.semester || '';
    let semesterText = 'ĐỀ ÔN TẬP';
    if (semester === 'gk1') semesterText = 'ĐỀ ÔN TẬP GIỮA HỌC KÌ 1';
    else if (semester === 'ck1') semesterText = 'ĐỀ ÔN TẬP CUỐI HỌC KÌ 1';
    else if (semester === 'gk2') semesterText = 'ĐỀ ÔN TẬP GIỮA HỌC KÌ 2';
    else if (semester === 'ck2') semesterText = 'ĐỀ ÔN TẬP CUỐI HỌC KÌ 2';

    // Question categorization
    const questions = examData.questions || [];
    const mcQuestions = questions.filter(q => q.type === 'multiple_choice' || q.type === 'single');
    const tfQuestions = questions.filter(q => q.type === 'true_false');
    const fibQuestions = questions.filter(q => q.type === 'fill_in_blank' || q.type === 'fill');

    let questionsHTML = '';
    let questionNum = 1;

    // PHẦN I - Trắc nghiệm
    if (mcQuestions.length > 0) {
        questionsHTML += `<div class="part-header">PHẦN I. Thí sinh trả lời từ câu 1 đến câu ${mcQuestions.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.</div>`;

        mcQuestions.forEach(q => {
            const opts = q.options || [];
            questionsHTML += `
                <div class="question">
                    <div class="question-text"><span class="question-num">Câu ${questionNum}.</span> ${q.question}</div>
                    <div class="options">
                        <div class="option-row">
                            <span class="option"><span class="option-label">A.</span> ${opts[0] || ''}</span>
                            <span class="option"><span class="option-label">B.</span> ${opts[1] || ''}</span>
                        </div>
                        <div class="option-row">
                            <span class="option"><span class="option-label">C.</span> ${opts[2] || ''}</span>
                            <span class="option"><span class="option-label">D.</span> ${opts[3] || ''}</span>
                        </div>
                    </div>
                </div>
            `;
            questionNum++;
        });
    }

    // PHẦN II - Đúng sai
    if (tfQuestions.length > 0) {
        questionsHTML += `<div class="part-header">PHẦN II. Đúng sai - ${tfQuestions.length} câu.</div>`;

        tfQuestions.forEach((q, idx) => {
            const labels = ['a)', 'b)', 'c)', 'd)'];
            let statementsHTML = '';
            (q.options || []).forEach((opt, i) => {
                statementsHTML += `<div class="statement">${labels[i]} ${opt}</div>`;
            });

            questionsHTML += `
                <div class="question">
                    <div class="question-text"><span class="question-num">Câu ${idx + 1}.</span> ${q.question}</div>
                    <div class="tf-statements">${statementsHTML}</div>
                </div>
            `;
        });
    }

    // PHẦN III - Điền số
    if (fibQuestions.length > 0) {
        questionsHTML += `<div class="part-header">PHẦN III. Điền đáp án - ${fibQuestions.length} câu.</div>`;

        fibQuestions.forEach((q, idx) => {
            questionsHTML += `
                <div class="question">
                    <div class="question-text"><span class="question-num">Câu ${idx + 1}.</span> ${q.question}</div>
                </div>
            `;
        });
    }

    const footerNote = pdfSettings.footerNote || 'KHÔNG được sử dụng tài liệu cá nhân.';

    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${examTitle}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
    <style>
        @page {
            size: A4;
            margin: 15mm;
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            line-height: 1.5;
            color: black;
            background: white;
            margin: 0;
            padding: 0;
        }
        
        .container {
            max-width: 180mm;
            margin: 0 auto;
        }
        
        .header-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 11pt;
        }
        
        .header-left {
            text-align: left;
        }
        
        .header-right {
            text-align: right;
        }
        
        .header-logo {
            font-weight: bold;
            font-size: 14pt;
            color: #1e40af;
        }
        
        .header-website {
            font-size: 10pt;
            color: #666;
        }
        
        .exam-title {
            text-align: center;
            font-weight: bold;
            font-size: 14pt;
            margin: 15px 0;
            text-transform: uppercase;
        }
        
        .student-info {
            margin: 10px 0;
            font-size: 11pt;
        }
        
        .part-header {
            font-weight: bold;
            margin: 15px 0 10px 0;
            font-size: 11pt;
        }
        
        .question {
            margin: 12px 0;
            font-size: 11pt;
            page-break-inside: avoid;
        }
        
        .question-num {
            font-weight: bold;
        }
        
        .question-text {
            margin-bottom: 8px;
        }
        
        .options {
            margin-left: 20px;
        }
        
        .option-row {
            display: flex;
            margin: 4px 0;
        }
        
        .option {
            width: 50%;
            padding-right: 10px;
        }
        
        .option-label {
            font-weight: bold;
            margin-right: 5px;
        }
        
        .tf-statements {
            margin-left: 20px;
            margin-top: 8px;
        }
        
        .statement {
            margin: 6px 0;
            line-height: 1.5;
        }
        
        .end-marker {
            text-align: center;
            margin-top: 25px;
            font-weight: bold;
            font-size: 11pt;
        }
        
        .footer-note {
            margin-top: 10px;
            font-style: italic;
            font-size: 10pt;
        }
        
        /* KaTeX styling */
        .katex { font-size: 1em !important; }
        .katex-display { margin: 5px 0 !important; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header-row">
            <div class="header-left">
                <div class="header-logo">LUYỆN ĐỀ ONLINE</div>
                <div class="header-website">luyendeonline.io.vn</div>
            </div>
            <div class="header-right">
                <div><strong>${semesterText}</strong></div>
                <div><strong>Môn: ${subjectName.toUpperCase()}</strong></div>
            </div>
        </div>
        
        <div class="header-row">
            <div class="header-left"><em>(Đề thi có nhiều trang)</em></div>
            <div class="header-right"><em>Thời gian: ${duration} phút</em></div>
        </div>
        
        <!-- Title -->
        <div class="exam-title">${examTitle}</div>
        
        <!-- Student Info -->
        <div class="student-info">
            <p>Họ, tên thí sinh: ................................................ Số báo danh: .................</p>
        </div>
        
        <!-- Questions -->
        ${questionsHTML}
        
        <!-- End -->
        <div class="end-marker">---------- HẾT ----------</div>
        <div class="footer-note">${footerNote}</div>
        <div class="footer-note">- Giám thị không giải thích gì thêm.</div>
    </div>
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof renderMathInElement === 'function') {
                renderMathInElement(document.body, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false},
                        {left: '\\\\(', right: '\\\\)', display: false},
                        {left: '\\\\[', right: '\\\\]', display: true}
                    ],
                    throwOnError: false
                });
            }
        });
    </script>
</body>
</html>`;
}

module.exports = { generateExamPDFHTML };
