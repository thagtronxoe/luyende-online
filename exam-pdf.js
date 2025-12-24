/**
 * Exam PDF Generator - Per-Question Capture Approach
 * Uses html2canvas to capture each question individually, then combines into PDF
 * This avoids clipping issues by rendering each element separately
 */

// Default PDF settings
let pdfSettings = {
    headerLeft1: 'LUYỆN ĐỀ ONLINE',
    headerRight1: 'ĐỀ ÔN TẬP',
    showDuration: true,
    showStudentInfo: true,
    footerNote: '- Thí sinh KHÔNG được sử dụng tài liệu.'
};

// Load PDF settings from server
async function loadPDFSettings() {
    try {
        const response = await fetch('/api/settings/pdf');
        if (response.ok) {
            pdfSettings = { ...pdfSettings, ...await response.json() };
        }
    } catch (err) {
        console.log('Using default PDF settings');
    }
}

// Fetch exam data for PDF generation
async function fetchExamForPDF(examId) {
    const token = localStorage.getItem('luyende_token');
    const response = await fetch(`/api/exams/${examId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Không thể tải đề thi');
    return await response.json();
}

// Create a single question element for capture
function createQuestionElement(questionNum, question, type) {
    const div = document.createElement('div');
    div.className = 'pdf-question';
    div.style.cssText = `
        padding: 10px 20px;
        font-family: 'Times New Roman', serif;
        font-size: 14px;
        line-height: 1.6;
        background: white;
        width: 750px;
    `;

    let html = `<div style="margin-bottom: 8px;"><strong>Câu ${questionNum}.</strong> <span class="question-text">${question.question || ''}</span></div>`;

    const options = question.options || [];
    if (type === 'multiple-choice' || type === 'single' || type === 'multiple_choice') {
        const labels = ['A', 'B', 'C', 'D'];
        options.forEach((opt, i) => {
            html += `<div style="margin-left: 20px; margin-bottom: 4px;"><strong>${labels[i]}.</strong> <span class="option-text">${opt}</span></div>`;
        });
    } else if (type === 'true-false' || type === 'true_false') {
        const labels = ['a)', 'b)', 'c)', 'd)'];
        options.forEach((opt, i) => {
            html += `<div style="margin-left: 20px; margin-bottom: 4px;">${labels[i]} <span class="option-text">${opt}</span></div>`;
        });
    }

    div.innerHTML = html;
    return div;
}

// Create header element
function createHeaderElement(examData) {
    const div = document.createElement('div');
    div.className = 'pdf-header';
    div.style.cssText = `
        padding: 20px;
        font-family: 'Times New Roman', serif;
        background: white;
        width: 750px;
    `;

    const semester = examData.semester || '';
    let semesterText = 'ĐỀ ÔN TẬP';
    if (semester === 'gk1') semesterText = 'ĐỀ ÔN TẬP GIỮA HỌC KÌ 1';
    else if (semester === 'ck1') semesterText = 'ĐỀ ÔN TẬP CUỐI HỌC KÌ 1';
    else if (semester === 'gk2') semesterText = 'ĐỀ ÔN TẬP GIỮA HỌC KÌ 2';
    else if (semester === 'ck2') semesterText = 'ĐỀ ÔN TẬP CUỐI HỌC KÌ 2';

    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <div>
                <div style="font-weight: bold; font-size: 16px;">LUYỆN ĐỀ ONLINE</div>
                <div style="font-size: 12px; color: #666;">luyendeonline.io.vn</div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: bold;">${semesterText}</div>
                <div>Môn: ${(examData.subjectName || 'TOÁN').toUpperCase()}</div>
            </div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #666; margin-bottom: 15px;">
            <div>(Đề thi có nhiều trang)</div>
            <div>Thời gian: ${examData.duration || 90} phút</div>
        </div>
        <h2 style="text-align: center; margin: 20px 0; font-size: 18px;">${(examData.title || 'ĐỀ THI').toUpperCase()}</h2>
        <div style="margin: 15px 0; font-size: 14px;">
            Họ, tên thí sinh: .................................................... Số báo danh: ..................
        </div>
    `;
    return div;
}

// Create section title element
function createSectionElement(title) {
    const div = document.createElement('div');
    div.className = 'pdf-section';
    div.style.cssText = `
        padding: 10px 20px;
        font-family: 'Times New Roman', serif;
        font-size: 14px;
        font-weight: bold;
        background: white;
        width: 750px;
    `;
    div.textContent = title;
    return div;
}

// Create footer element
function createFooterElement() {
    const div = document.createElement('div');
    div.className = 'pdf-footer';
    div.style.cssText = `
        padding: 20px;
        font-family: 'Times New Roman', serif;
        font-size: 14px;
        background: white;
        width: 750px;
        text-align: center;
    `;
    div.innerHTML = `
        <div style="font-weight: bold; margin: 20px 0;">---------- HẾT ----------</div>
        <div style="text-align: left; font-size: 12px; color: #666;">
            <div>- Thí sinh KHÔNG được sử dụng tài liệu.</div>
            <div>- Giám thị không giải thích gì thêm.</div>
        </div>
    `;
    return div;
}

// Render KaTeX in element
async function renderKaTeX(element) {
    if (typeof renderMathInElement === 'function') {
        renderMathInElement(element, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: true }
            ],
            throwOnError: false
        });
    }
    // Wait for KaTeX to render
    await new Promise(r => setTimeout(r, 100));
}

// Capture element to canvas
async function captureElement(element) {
    // Append to body temporarily for rendering
    document.body.appendChild(element);
    await renderKaTeX(element);

    const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
    });

    document.body.removeChild(element);
    return canvas;
}

// Main PDF generation function - captures each question individually
async function generateExamPDFPerQuestion(examData) {
    console.log('📄 Starting per-question PDF generation...');

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    let currentY = margin;
    let pageNum = 1;

    // Helper to add image to PDF with page break handling
    const addImageToPDF = (imgData, imgWidth, imgHeight) => {
        // Scale to fit content width
        const scale = contentWidth / imgWidth;
        const scaledHeight = imgHeight * scale;

        // Check if need new page
        if (currentY + scaledHeight > pageHeight - margin) {
            pdf.addPage();
            pageNum++;
            currentY = margin;
        }

        pdf.addImage(imgData, 'PNG', margin, currentY, contentWidth, scaledHeight);
        currentY += scaledHeight + 2; // 2mm spacing between elements
    };

    // 1. Capture and add header
    console.log('📄 Capturing header...');
    const headerElement = createHeaderElement(examData);
    const headerCanvas = await captureElement(headerElement);
    addImageToPDF(headerCanvas.toDataURL('image/png'), headerCanvas.width / 2, headerCanvas.height / 2);

    // 2. Process questions by type
    const questions = examData.questions || [];
    const mcQuestions = questions.filter(q => q.type === 'multiple_choice' || q.type === 'single' || q.type === 'multiple-choice');
    const tfQuestions = questions.filter(q => q.type === 'true_false' || q.type === 'true-false');
    const fibQuestions = questions.filter(q => q.type === 'fill_in_blank' || q.type === 'fill-in-blank' || q.type === 'fill');

    // PHẦN I - Multiple Choice
    if (mcQuestions.length > 0) {
        console.log(`📄 Capturing ${mcQuestions.length} multiple choice questions...`);

        const sectionEl = createSectionElement(`PHẦN I. Thí sinh trả lời từ câu 1 đến câu ${mcQuestions.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.`);
        const sectionCanvas = await captureElement(sectionEl);
        addImageToPDF(sectionCanvas.toDataURL('image/png'), sectionCanvas.width / 2, sectionCanvas.height / 2);

        for (let i = 0; i < mcQuestions.length; i++) {
            const q = mcQuestions[i];
            const questionEl = createQuestionElement(i + 1, q, q.type);
            const questionCanvas = await captureElement(questionEl);
            addImageToPDF(questionCanvas.toDataURL('image/png'), questionCanvas.width / 2, questionCanvas.height / 2);

            console.log(`📄 Question ${i + 1}/${mcQuestions.length} captured`);
        }
    }

    // PHẦN II - True/False
    if (tfQuestions.length > 0) {
        console.log(`📄 Capturing ${tfQuestions.length} true/false questions...`);

        const sectionEl = createSectionElement(`PHẦN II. Đúng sai - ${tfQuestions.length} câu.`);
        const sectionCanvas = await captureElement(sectionEl);
        addImageToPDF(sectionCanvas.toDataURL('image/png'), sectionCanvas.width / 2, sectionCanvas.height / 2);

        for (let i = 0; i < tfQuestions.length; i++) {
            const q = tfQuestions[i];
            const questionEl = createQuestionElement(i + 1, q, q.type);
            const questionCanvas = await captureElement(questionEl);
            addImageToPDF(questionCanvas.toDataURL('image/png'), questionCanvas.width / 2, questionCanvas.height / 2);
        }
    }

    // PHẦN III - Fill in blank
    if (fibQuestions.length > 0) {
        console.log(`📄 Capturing ${fibQuestions.length} fill-in questions...`);

        const sectionEl = createSectionElement(`PHẦN III. Điền đáp án - ${fibQuestions.length} câu.`);
        const sectionCanvas = await captureElement(sectionEl);
        addImageToPDF(sectionCanvas.toDataURL('image/png'), sectionCanvas.width / 2, sectionCanvas.height / 2);

        for (let i = 0; i < fibQuestions.length; i++) {
            const q = fibQuestions[i];
            const questionEl = createQuestionElement(i + 1, q, q.type);
            const questionCanvas = await captureElement(questionEl);
            addImageToPDF(questionCanvas.toDataURL('image/png'), questionCanvas.width / 2, questionCanvas.height / 2);
        }
    }

    // 3. Capture and add footer
    console.log('📄 Capturing footer...');
    const footerEl = createFooterElement();
    const footerCanvas = await captureElement(footerEl);
    addImageToPDF(footerCanvas.toDataURL('image/png'), footerCanvas.width / 2, footerCanvas.height / 2);

    console.log(`📄 PDF generation complete: ${pageNum} pages`);
    return pdf;
}

// Preview PDF in new tab
async function previewExamPDF(examId) {
    console.log('📄 Creating PDF preview...');
    try {
        const examData = await fetchExamForPDF(examId);
        const pdf = await generateExamPDFPerQuestion(examData);

        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');

        console.log('📄 Preview opened successfully');
    } catch (err) {
        console.error('📄 Error creating preview:', err);
        alert('Lỗi xem trước PDF: ' + err.message);
    }
}

// Download PDF
async function generateAndDownloadExamPDF(examId) {
    console.log('📄 Starting PDF download...');
    try {
        const examData = await fetchExamForPDF(examId);
        const pdf = await generateExamPDFPerQuestion(examData);

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
