/**
 * Exam PDF Generator with LaTeX Support
 * Uses html2canvas to render KaTeX formulas as images
 * Supports customizable header from admin settings
 */

// Default PDF settings (can be overridden by admin)
let pdfSettings = {
    headerLeft1: 'LUYỆN ĐỀ ONLINE',
    headerRight1: 'ĐỀ LUYỆN TẬP',
    headerLeft2: 'ĐỀ THI THỬ',
    showPageCount: true,
    showDuration: true,
    showStudentInfo: true,
    footerNote: '- Thí sinh được sử dụng tài liệu cá nhân.'
};

// Load PDF settings from server
async function loadPDFSettings() {
    try {
        const response = await fetch('/api/settings/pdf');
        if (response.ok) {
            const settings = await response.json();
            pdfSettings = { ...pdfSettings, ...settings };
        }
    } catch (err) {
        console.log('Using default PDF settings');
    }
}

// Create hidden render container with proper A4 sizing
function createPDFRenderContainer() {
    let container = document.getElementById('pdfRenderContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'pdfRenderContainer';
        container.style.cssText = `
            position: fixed;
            left: -9999px;
            top: 0;
            width: 700px;
            background: white;
            padding: 30px 40px;
            font-family: 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.5;
            color: black;
            box-sizing: border-box;
        `;
        document.body.appendChild(container);
    }
    return container;
}

// Render exam content to HTML with KaTeX
function renderExamToHTML(examData) {
    const questions = examData.questions || [];
    const mcQuestions = questions.filter(q => q.type === 'multiple-choice');
    const tfQuestions = questions.filter(q => q.type === 'true-false');
    const fibQuestions = questions.filter(q => q.type === 'fill-in-blank');

    const subjectName = examData.subjectName || 'TOÁN';
    const duration = examData.duration || 90;
    const examTitle = examData.title || 'Đề thi';

    let html = `
        <style>
            .pdf-content { 
                font-family: 'Times New Roman', serif; 
                font-size: 11pt;
                width: 100%;
            }
            .header-row { 
                width: 100%;
                margin-bottom: 3px;
                font-size: 11pt;
            }
            .header-row::after { content: ""; display: table; clear: both; }
            .header-left { float: left; text-align: left; }
            .header-right { float: right; text-align: right; }
            .exam-title {
                text-align: center;
                font-weight: bold;
                font-size: 14pt;
                margin: 12px 0;
                text-transform: uppercase;
                clear: both;
            }
            .student-info { margin: 8px 0; font-size: 10pt; clear: both; }
            .part-header { 
                font-weight: bold; 
                margin: 15px 0 10px 0; 
                font-size: 11pt;
                clear: both;
            }
            .question { 
                margin: 8px 0; 
                font-size: 11pt;
                clear: both;
            }
            .question-num { font-weight: bold; }
            .question-text { margin-bottom: 5px; }
            .options-table { 
                width: 100%;
                margin: 5px 0 5px 20px;
                font-size: 10.5pt;
                border-collapse: collapse;
            }
            .options-table td {
                width: 50%;
                padding: 2px 10px 2px 0;
                vertical-align: top;
            }
            .option-label { font-weight: bold; }
            .tf-statements { margin-left: 20px; font-size: 10.5pt; }
            .statement { margin: 3px 0; }
            .end-marker { 
                text-align: center; 
                margin-top: 20px; 
                font-weight: bold;
                font-size: 11pt;
                clear: both;
            }
            .footer-note {
                margin-top: 10px;
                font-style: italic;
                font-size: 10pt;
            }
            /* Formula sizing */
            .katex { font-size: 1em !important; }
            .katex-display { margin: 5px 0 !important; }
        </style>
        
        <div class="pdf-content">
            <!-- Header -->
            <div class="header-row">
                <div class="header-left"><strong>${pdfSettings.headerLeft1}</strong></div>
                <div class="header-right"><strong>${pdfSettings.headerRight1}</strong></div>
            </div>
            <div class="header-row">
                <div class="header-left"><strong>${pdfSettings.headerLeft2}</strong></div>
                <div class="header-right"><strong>Môn: ${subjectName.toUpperCase()}</strong></div>
            </div>
    `;

    if (pdfSettings.showDuration) {
        html += `
            <div class="header-row">
                <div class="header-left"><em>(Đề thi có nhiều trang)</em></div>
                <div class="header-right"><em>Thời gian: ${duration} phút</em></div>
            </div>
        `;
    }

    // Exam title
    html += `<div class="exam-title">${examTitle}</div>`;

    if (pdfSettings.showStudentInfo) {
        html += `
            <div class="student-info">
                <p>Họ, tên thí sinh: ................................................ Số báo danh: .................</p>
            </div>
        `;
    }

    let questionNum = 1;

    // PHẦN I - Trắc nghiệm
    if (mcQuestions.length > 0) {
        html += `<div class="part-header">PHẦN I. Thí sinh trả lời từ câu 1 đến câu ${mcQuestions.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.</div>`;

        mcQuestions.forEach(q => {
            const optionLabels = ['A', 'B', 'C', 'D'];
            const opts = q.options || [];

            html += `
                <div class="question">
                    <div class="question-text"><span class="question-num">Câu ${questionNum}.</span> ${q.question}</div>
                    <table class="options-table">
                        <tr>
                            <td><span class="option-label">A.</span> ${opts[0] || ''}</td>
                            <td><span class="option-label">B.</span> ${opts[1] || ''}</td>
                        </tr>
                        <tr>
                            <td><span class="option-label">C.</span> ${opts[2] || ''}</td>
                            <td><span class="option-label">D.</span> ${opts[3] || ''}</td>
                        </tr>
                    </table>
                </div>
            `;
            questionNum++;
        });
    }

    // PHẦN II - Đúng sai
    if (tfQuestions.length > 0) {
        html += `<div class="part-header">PHẦN II. Đúng sai - ${tfQuestions.length} câu.</div>`;

        tfQuestions.forEach((q, idx) => {
            html += `
                <div class="question">
                    <span class="question-num">Câu ${idx + 1}.</span> <span class="question-content">${q.question}</span>
                    <div class="tf-statements">
            `;

            const labels = ['a)', 'b)', 'c)', 'd)'];
            (q.options || []).forEach((opt, i) => {
                html += `<div class="statement">${labels[i]} ${opt}</div>`;
            });

            html += `</div></div>`;
        });
    }

    // PHẦN III - Điền số
    if (fibQuestions.length > 0) {
        html += `<div class="part-header">PHẦN III. Điền đáp án - ${fibQuestions.length} câu.</div>`;

        fibQuestions.forEach((q, idx) => {
            html += `
                <div class="question">
                    <span class="question-num">Câu ${idx + 1}.</span> <span class="question-content">${q.question}</span>
                </div>
            `;
        });
    }

    html += `
            <div class="end-marker">---------- HẾT ----------</div>
            <div class="footer-note">${pdfSettings.footerNote}</div>
        </div>
    `;

    return html;
}

// Render KaTeX in container
async function renderKaTeX(container) {
    return new Promise((resolve) => {
        if (typeof renderMathInElement === 'function') {
            renderMathInElement(container, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ],
                throwOnError: false
            });
        }
        setTimeout(resolve, 500);
    });
}

// Generate PDF using html2canvas
async function generateExamPDFWithLaTeX(examData) {
    console.log('📄 Starting PDF generation with LaTeX support...');

    if (!window.jspdf || !window.jspdf.jsPDF) {
        throw new Error('jsPDF chưa được tải');
    }
    if (!window.html2canvas) {
        throw new Error('html2canvas chưa được tải');
    }

    // Load settings
    await loadPDFSettings();

    const { jsPDF } = window.jspdf;

    const container = createPDFRenderContainer();
    container.innerHTML = renderExamToHTML(examData);

    console.log('📄 Rendering KaTeX formulas...');
    await renderKaTeX(container);
    await new Promise(r => setTimeout(r, 300));

    console.log('📄 Capturing with html2canvas...');
    const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
    });

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageHeight = 297;

    const pdf = new jsPDF('p', 'mm', 'a4');
    let position = 0;
    let heightLeft = imgHeight;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
    }

    container.innerHTML = '';

    console.log('📄 PDF generated successfully!');
    return pdf;
}

// Preview PDF in modal
async function previewExamPDF(examId) {
    console.log('📄 Creating PDF preview...');

    try {
        const token = localStorage.getItem('luyende_token');
        const response = await fetch(`/api/exams/${examId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Không thể tải đề thi');

        const examData = await response.json();
        const subject = typeof cachedSubjects !== 'undefined' ?
            cachedSubjects?.find(s => s.id === examData.subjectId) : null;
        examData.subjectName = subject?.name || 'TOÁN';

        const pdf = await generateExamPDFWithLaTeX(examData);

        // Open in new tab for preview
        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');

    } catch (err) {
        console.error('📄 Error previewing PDF:', err);
        alert('Lỗi xem trước PDF: ' + err.message);
    }
}

// Download PDF
async function generateAndDownloadExamPDF(examId) {
    console.log('📄 Starting PDF generation for examId:', examId);

    try {
        const token = localStorage.getItem('luyende_token');
        const response = await fetch(`/api/exams/${examId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Không thể tải đề thi');

        const examData = await response.json();
        const subject = typeof cachedSubjects !== 'undefined' ?
            cachedSubjects?.find(s => s.id === examData.subjectId) : null;
        examData.subjectName = subject?.name || 'TOÁN';

        const pdf = await generateExamPDFWithLaTeX(examData);

        const filename = `${examData.title || 'de-thi'}.pdf`.replace(/[^a-zA-Z0-9-_.\u00C0-\u024F]/g, '-');
        pdf.save(filename);

        console.log('📄 PDF saved as:', filename);

    } catch (err) {
        console.error('📄 Error generating PDF:', err);
        alert('Lỗi tạo PDF: ' + err.message);
    }
}

// Export
window.generateAndDownloadExamPDF = generateAndDownloadExamPDF;
window.previewExamPDF = previewExamPDF;
window.pdfSettings = pdfSettings;
window.loadPDFSettings = loadPDFSettings;
