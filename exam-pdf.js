/**
 * Exam PDF Generator with LaTeX Support
 * Uses html2canvas to render KaTeX formulas as images
 */

// Create hidden render container
function createPDFRenderContainer() {
    let container = document.getElementById('pdfRenderContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'pdfRenderContainer';
        container.style.cssText = `
            position: fixed;
            left: -9999px;
            top: 0;
            width: 794px;
            background: white;
            padding: 40px 50px;
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.6;
            color: black;
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

    const examYear = examData.year || new Date().getFullYear();
    const subjectName = examData.subjectName || 'TOÁN';
    const duration = examData.duration || 90;

    let html = `
        <style>
            .pdf-content { font-family: 'Times New Roman', serif; }
            .header-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .header-left { text-align: left; }
            .header-right { text-align: right; }
            .center-title { text-align: center; font-weight: bold; font-size: 14pt; margin: 15px 0; }
            .student-info { margin: 10px 0; }
            .part-header { font-weight: bold; margin: 20px 0 10px 0; font-size: 12pt; }
            .question { margin: 10px 0; page-break-inside: avoid; }
            .question-num { font-weight: bold; }
            .options { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 20px; margin-left: 20px; }
            .option { display: flex; gap: 5px; }
            .option-label { font-weight: bold; min-width: 20px; }
            .tf-statements { margin-left: 20px; }
            .statement { margin: 3px 0; }
            .end-marker { text-align: center; margin-top: 20px; font-weight: bold; }
            .page-break { page-break-after: always; }
        </style>
        
        <div class="pdf-content">
            <!-- Header -->
            <div class="header-row">
                <div class="header-left"><strong>BỘ GIÁO DỤC VÀ ĐÀO TẠO</strong></div>
                <div class="header-right"><strong>KỲ THI TỐT NGHIỆP TRUNG HỌC PHỔ THÔNG NĂM ${examYear}</strong></div>
            </div>
            <div class="header-row">
                <div class="header-left"><strong>ĐỀ THI CHÍNH THỨC</strong></div>
                <div class="header-right"><strong>Môn thi: ${subjectName.toUpperCase()}</strong></div>
            </div>
            <div class="header-row">
                <div class="header-left"><em>(Đề thi có nhiều trang)</em></div>
                <div class="header-right"><em>Thời gian làm bài ${duration} phút, không kể thời gian phát đề</em></div>
            </div>
            
            <div class="student-info">
                <p>Họ, tên thí sinh: .................................................................</p>
                <p>Số báo danh: .....................................................................</p>
            </div>
    `;

    let questionNum = 1;

    // PHẦN I - Trắc nghiệm
    if (mcQuestions.length > 0) {
        html += `<div class="part-header">PHẦN I. Thí sinh trả lời từ câu 1 đến câu ${mcQuestions.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.</div>`;

        mcQuestions.forEach(q => {
            html += `
                <div class="question">
                    <span class="question-num">Câu ${questionNum}.</span> ${q.question}
                    <div class="options">
            `;

            const optionLabels = ['A', 'B', 'C', 'D'];
            (q.options || []).forEach((opt, i) => {
                html += `<div class="option"><span class="option-label">${optionLabels[i]}.</span> <span>${opt}</span></div>`;
            });

            html += `</div></div>`;
            questionNum++;
        });
    }

    // PHẦN II - Đúng sai
    if (tfQuestions.length > 0) {
        html += `<div class="part-header">PHẦN II. Thí sinh trả lời từ câu 1 đến câu ${tfQuestions.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.</div>`;

        tfQuestions.forEach((q, idx) => {
            html += `
                <div class="question">
                    <span class="question-num">Câu ${idx + 1}.</span> ${q.question}
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
        html += `<div class="part-header">PHẦN III. Thí sinh trả lời từ câu 1 đến câu ${fibQuestions.length}.</div>`;

        fibQuestions.forEach((q, idx) => {
            html += `
                <div class="question">
                    <span class="question-num">Câu ${idx + 1}.</span> ${q.question}
                </div>
            `;
        });
    }

    html += `
            <div class="end-marker">---------- HẾT ----------</div>
            <p><em>- Thí sinh không được sử dụng tài liệu;</em></p>
            <p><em>- Giám thị không giải thích gì thêm.</em></p>
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
        // Wait for KaTeX to finish rendering
        setTimeout(resolve, 500);
    });
}

// Generate PDF using html2canvas
async function generateExamPDFWithLaTeX(examData) {
    console.log('📄 Starting PDF generation with LaTeX support...');

    // Check dependencies
    if (!window.jspdf || !window.jspdf.jsPDF) {
        throw new Error('jsPDF not loaded');
    }
    if (!window.html2canvas) {
        throw new Error('html2canvas not loaded');
    }

    const { jsPDF } = window.jspdf;

    // Create container and render exam
    const container = createPDFRenderContainer();
    container.innerHTML = renderExamToHTML(examData);

    // Render KaTeX
    console.log('📄 Rendering KaTeX formulas...');
    await renderKaTeX(container);

    // Wait a bit more for fonts to load
    await new Promise(r => setTimeout(r, 300));

    // Capture with html2canvas
    console.log('📄 Capturing with html2canvas...');
    const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
    });

    // Calculate dimensions for A4
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageHeight = 297; // A4 height in mm

    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    let position = 0;
    let heightLeft = imgHeight;

    // Add image to PDF, splitting into pages if needed
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // First page
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Additional pages if content is long
    while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
    }

    // Clean up
    container.innerHTML = '';

    console.log('📄 PDF generated successfully!');
    return pdf;
}

// Main export function
async function generateAndDownloadExamPDF(examId) {
    console.log('📄 Starting PDF generation for examId:', examId);

    try {
        // Fetch exam data
        const token = localStorage.getItem('luyende_token');
        console.log('📄 Fetching exam data...');
        const response = await fetch(`/api/exams/${examId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Không thể tải đề thi');
        }

        const examData = await response.json();
        console.log('📄 Exam data loaded:', examData.title);

        // Get subject name
        const subject = typeof cachedSubjects !== 'undefined' ?
            cachedSubjects?.find(s => s.id === examData.subjectId) : null;
        examData.subjectName = subject?.name || 'TOÁN';

        // Generate PDF with LaTeX
        const pdf = await generateExamPDFWithLaTeX(examData);

        // Save
        const filename = `${examData.title || 'de-thi'}.pdf`.replace(/[^a-zA-Z0-9-_.\u00C0-\u024F]/g, '-');
        pdf.save(filename);

        console.log('📄 PDF saved as:', filename);
        alert('Đã tạo PDF thành công! Kiểm tra thư mục Downloads.');

    } catch (err) {
        console.error('📄 Error generating PDF:', err);
        alert('Lỗi tạo PDF: ' + err.message);
    }
}

// Export
window.generateAndDownloadExamPDF = generateAndDownloadExamPDF;
window.generateExamPDFWithLaTeX = generateExamPDFWithLaTeX;
