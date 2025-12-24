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
    footerNote: '- Thí sinh KHÔNG được sử dụng tài liệu.'
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


// Helper to manage page breaks in DOM before rendering
function adjustPageLayout(container) {
    // Constants for A4
    const PDF_PAGE_HEIGHT_MM = 297;
    const PDF_MARGIN_TOP_MM = 10;
    const PDF_MARGIN_BOTTOM_MM = 10;
    const PDF_PRINT_HEIGHT_MM = PDF_PAGE_HEIGHT_MM - PDF_MARGIN_TOP_MM - PDF_MARGIN_BOTTOM_MM; // 277mm

    // Container is 800px wide, mapped to 190mm (210 - 20) printable width
    const CONTAINER_WIDTH_PX = 800;
    const PRINTABLE_WIDTH_MM = 190;

    // Calculate Page Height in Layout Pixels
    // Ratio: px / mm = 800 / 190
    const PX_PER_MM = CONTAINER_WIDTH_PX / PRINTABLE_WIDTH_MM;
    const PAGE_HEIGHT_PX = Math.floor(PDF_PRINT_HEIGHT_MM * PX_PER_MM) - 5; // -5px safety buffer

    console.log(`📄 Page Layout Config: ${PX_PER_MM.toFixed(2)} px/mm, Page Limit: ${PAGE_HEIGHT_PX}px`);

    const contentDiv = container.querySelector('.pdf-content');
    if (!contentDiv) return;

    const children = Array.from(contentDiv.children);
    let currentPageY = 0;

    children.forEach(child => {
        // Skip absolutely positioned elements if any, or existing spacers
        if (child.classList.contains('page-break-spacer')) return;

        const style = window.getComputedStyle(child);
        const height = child.offsetHeight;
        const marginTop = parseFloat(style.marginTop) || 0;
        const marginBottom = parseFloat(style.marginBottom) || 0;

        // Total space this element takes vertically
        const elementTotalHeight = height + marginTop + marginBottom;

        // Logic:
        // If adding this element exceeds the page height...
        if (currentPageY + elementTotalHeight > PAGE_HEIGHT_PX) {
            // ...insert a spacer to consume the rest of the current page
            // so this element starts fresh on the next page
            const remainingSpace = PAGE_HEIGHT_PX - currentPageY;

            if (remainingSpace > 0) {
                const spacer = document.createElement('div');
                spacer.className = 'page-break-spacer';
                spacer.style.height = remainingSpace + 'px';
                spacer.style.width = '100%';
                // spacer.style.background = 'red'; // Debug: visualize breaks

                contentDiv.insertBefore(spacer, child);
            }

            // Reset Y for new page
            currentPageY = elementTotalHeight;
            console.log(`📄 Page break inserted. New page starts with element height ${elementTotalHeight}`);
        } else {
            // Fits on current page
            currentPageY += elementTotalHeight;
        }
    });
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
            width: 800px; /* Increased width for better resolution */
            background: white;
            padding: 30px 40px;
            font-family: 'Times New Roman', serif;
            font-size: 13pt; /* Larger internal font, scales down nicely */
            line-height: 1.4;
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
    const grade = examData.grade || '12';

    // Semester detection for header
    const semester = examData.semester || '';
    let semesterText = '';
    if (semester === 'gk1') semesterText = 'ĐỀ ÔN TẬP GIỮA HỌC KÌ 1';
    else if (semester === 'ck1') semesterText = 'ĐỀ ÔN TẬP CUỐI HỌC KÌ 1';
    else if (semester === 'gk2') semesterText = 'ĐỀ ÔN TẬP GIỮA HỌC KÌ 2';
    else if (semester === 'ck2') semesterText = 'ĐỀ ÔN TẬP CUỐI HỌC KÌ 2';
    else semesterText = 'ĐỀ ÔN TẬP';

    // Low-res workaround: Use simple text header if logo fails, handled by CSS/HTML structure
    // Logo URL (keeping variable but user said not needed, we use text header primarily now)
    const logoUrl = window.location.origin + '/luyen_de_logo_blue.svg';

    let html = `
        <style>
            .pdf-content { 
                font-family: 'Times New Roman', serif; 
                font-size: 13pt;
                width: 100%;
            }
            .header-row { 
                width: 100%;
                margin-bottom: 5px;
                font-size: 13pt;
            }
            .header-row::after { content: ""; display: table; clear: both; }
            .header-left { float: left; text-align: left; }
            .header-right { float: right; text-align: right; }
            .exam-title {
                text-align: center;
                font-weight: bold;
                font-size: 16pt;
                margin: 15px 0;
                text-transform: uppercase;
                clear: both;
            }
            .student-info { margin: 10px 0; font-size: 12pt; clear: both; }
            .part-header { 
                font-weight: bold; 
                margin: 15px 0 8px 0; 
                font-size: 13pt;
                clear: both;
            }
            .question { 
                margin: 10px 0; 
                font-size: 13pt;
                clear: both;
                page-break-inside: avoid; /* Attempt to keep questions together */
            }
            .question-num { font-weight: bold; }
            .question-text { margin-bottom: 8px; }
            .options-table { 
                width: 98%;
                margin: 5px 0 8px 15px;
                font-size: 13pt;
                border-collapse: separate;
                border-spacing: 0 8px; /* Space between rows */
            }
            .options-table td {
                width: 50%;
                padding: 4px 10px 4px 0; /* More right padding */
                vertical-align: top;
            }
            .option-label { 
                font-weight: bold; 
                margin-right: 5px;
                font-size: 0.9em; /* Slightly smaller label A. B. */
            }
            .tf-statements { margin-left: 15px; font-size: 13pt; }
            .statement { margin: 6px 0; }
            .end-marker { 
                text-align: center; 
                margin-top: 25px; 
                font-weight: bold;
                font-size: 13pt;
                clear: both;
            }
            .footer-note {
                margin-top: 15px;
                font-style: italic;
                font-size: 11pt;
            }
            /* Formula sizing */
            .katex { font-size: 1.05em !important; }
            .katex-display { margin: 5px 0 !important; font-size: 1.05em !important; }
        </style>
        
        <div class="pdf-content">
            <!-- Header with Text Logo -->
            <div class="header-row">
                <div class="header-left">
                    <div style="font-weight: bold; font-size: 16pt; color: #1e40af;">LUYỆN ĐỀ ONLINE</div>
                    <div style="font-size: 11pt; color: #666;">luyendeonline.io.vn</div>
                </div>
                <div class="header-right">
                    <div><strong>${semesterText}</strong></div>
                    <div><strong>Môn: ${subjectName.toUpperCase()}</strong></div>
                </div>
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
            <div class="footer-note">- Giám thị không giải thích gì thêm.</div>
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

// Generate PDF using Simple Single-Container + Image Slicing
async function generateExamPDFWithLaTeX(examData) {
    console.log('📄 Starting PDF generation (Simple approach)...');

    if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('jsPDF chưa được tải');
    if (!window.html2canvas) throw new Error('html2canvas chưa được tải');

    await loadPDFSettings();
    const { jsPDF } = window.jspdf;

    // Create single container for ALL content
    let container = document.getElementById('pdfRenderContainer');
    if (container) container.remove();

    container = document.createElement('div');
    container.id = 'pdfRenderContainer';
    container.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: 794px;
        background: white;
        padding: 40px 50px;
        font-family: 'Times New Roman', serif;
        font-size: 12pt;
        line-height: 1.5;
        color: black;
        box-sizing: border-box;
    `;
    document.body.appendChild(container);

    // Render ALL content at once
    container.innerHTML = renderExamToHTML(examData);

    console.log('📄 Rendering KaTeX...');
    await renderKaTeX(container);
    await new Promise(r => setTimeout(r, 500));

    console.log('📄 Capturing with html2canvas...');
    const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff'
    });

    // A4 dimensions with margins
    const pdfWidth = 210;
    const pdfHeight = 297;
    const margin = 10; // 10mm margins on all sides

    // Printable area (inside margins)
    const printableWidth = pdfWidth - (margin * 2); // 190mm
    const printableHeight = pdfHeight - (margin * 2); // 277mm

    // Calculate image dimensions that fit printable area
    const imgWidth = printableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    // Pagination with margins
    let position = 0; // Current position in the image (mm)
    let pageNum = 0;

    while (position < imgHeight) {
        if (pageNum > 0) {
            pdf.addPage();
        }

        // Add image with proper margin positioning
        // x = margin (left margin)
        // y = margin - position (top margin, shifted up for subsequent pages)
        pdf.addImage(
            imgData,
            'JPEG',
            margin,              // X: left margin
            margin - position,   // Y: top margin, shifted up by current position
            imgWidth,
            imgHeight
        );

        // Move to next page worth of content
        position += printableHeight;
        pageNum++;
    }

    // Cleanup
    container.remove();

    console.log(`📄 PDF generated: ${pageNum} pages`);
    return pdf;
}

// Helper: Fetch exam details for PDF
async function fetchExamForPDF(examId) {
    const token = localStorage.getItem('luyende_token');
    const response = await fetch(`/api/exams/${examId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Không thể tải đề thi');

    const examData = await response.json();

    // Add Subject Name fallback if missing
    if (!examData.subjectName && typeof cachedSubjects !== 'undefined') {
        const subject = cachedSubjects.find(s => s.id === examData.subjectId);
        examData.subjectName = subject?.name || 'TOÁN';
    }

    return examData;
}

function createPageContainer(pageNum, width, height, padding, safeTopPadding = 0) {
    const div = document.createElement('div');
    div.className = 'pdf-page-node';
    div.style.cssText = `
        width: ${width}px;
        min-height: ${height}px;
        max-height: ${height}px;
        background: white;
        padding: ${padding}px;
        box-sizing: border-box;
        margin-bottom: 20px;
        position: relative;
        font-family: 'Times New Roman', serif;
        font-size: 13pt;
        overflow: visible;
    `;

    // Content Area
    const content = document.createElement('div');
    content.className = 'page-content-area';
    // Add safe padding to prevent top clipping
    content.style.cssText = `width: 100%; padding-top: ${safeTopPadding}px;`;
    div.appendChild(content);

    // Optional: Add Page Number Footer
    const footer = document.createElement('div');
    footer.style.cssText = `
        position: absolute; bottom: 15px; width: 100%; text-align: center;
        font-size: 10pt; color: #666; left: 0;
    `;
    footer.innerText = `Trang ${pageNum}`;
    div.appendChild(footer);

    return div;
}

// Preview PDF in modal
async function previewExamPDF(examId) {
    console.log('📄 Creating PDF preview...');
    try {
        const examData = await fetchExamForPDF(examId);

        // Generate PDF using LaTeX support
        const pdf = await generateExamPDFWithLaTeX(examData);

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
    console.log('📄 Starting PDF generation for examId:', examId);

    try {
        const examData = await fetchExamForPDF(examId);

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
