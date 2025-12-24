/**
 * Exam PDF Generator Module
 * Tạo PDF đề thi giống format chuẩn Bộ GD&ĐT
 * Uses jsPDF + html2canvas for high-quality math rendering
 */

// PDF Generator class
class ExamPDFGenerator {
    constructor() {
        this.doc = null;
        this.pageWidth = 210; // A4 width in mm
        this.pageHeight = 297; // A4 height in mm
        this.margin = 15;
        this.currentY = 20;
        this.lineHeight = 6;
        this.fontSize = {
            title: 12,
            header: 11,
            body: 10,
            small: 9
        };
    }

    // Initialize PDF document
    init() {
        const { jsPDF } = window.jspdf;
        this.doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        this.currentY = 20;
        return this;
    }

    // Add Vietnamese font support
    async loadFonts() {
        // Try to load Vietnamese font
        if (typeof loadVietnameseFont === 'function') {
            const success = await loadVietnameseFont(this.doc);
            if (success) {
                console.log('📄 Vietnamese font loaded');
                return;
            }
        }
        // Fallback to helvetica
        console.log('📄 Using fallback font (helvetica)');
        this.doc.setFont('helvetica');
    }

    // Draw exam header like official paper (matching official format)
    drawHeader(examData) {
        const doc = this.doc;

        // === ROW 1 ===
        // Left: BỘ GIÁO DỤC VÀ ĐÀO TẠO
        doc.setFontSize(this.fontSize.header);
        doc.setFont('helvetica', 'bold');
        doc.text('BỘ GIÁO DỤC VÀ ĐÀO TẠO', this.margin, this.currentY);

        // Right: KỲ THI TỐT NGHIỆP TRUNG HỌC PHỔ THÔNG NĂM 2025
        const examYear = examData.year || new Date().getFullYear();
        doc.text(`KỲ THI TỐT NGHIỆP TRUNG HỌC PHỔ THÔNG NĂM ${examYear}`, this.pageWidth - this.margin, this.currentY, { align: 'right' });

        this.currentY += this.lineHeight;

        // === ROW 2 ===
        // Left: ĐỀ THI CHÍNH THỨC
        doc.setFontSize(this.fontSize.title);
        doc.text('ĐỀ THI CHÍNH THỨC', this.margin, this.currentY);

        // Right: Môn thi: TOÁN
        const subjectName = examData.subjectName || 'TOÁN';
        doc.text(`Môn thi: ${subjectName.toUpperCase()}`, this.pageWidth - this.margin, this.currentY, { align: 'right' });

        this.currentY += this.lineHeight;

        // === ROW 3 ===
        // Left: (Đề thi có 04 trang) - italic
        doc.setFontSize(this.fontSize.small);
        doc.setFont('helvetica', 'italic');
        const pageCount = examData.pageCount || '04';
        doc.text(`(Đề thi có ${pageCount} trang)`, this.margin, this.currentY);

        // Right: Thời gian làm bài 90 phút, không kể thời gian phát đề
        const duration = examData.duration || 90;
        doc.text(`Thời gian làm bài ${duration} phút, không kể thời gian phát đề`, this.pageWidth - this.margin, this.currentY, { align: 'right' });

        this.currentY += this.lineHeight * 2;

        // Student info fields
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(this.fontSize.body);
        doc.text('Họ, tên thí sinh: .....................................................', this.margin, this.currentY);
        this.currentY += this.lineHeight;
        doc.text('Số báo danh: ..........................................................', this.margin, this.currentY);

        this.currentY += this.lineHeight * 2;
    }

    // Draw part header (PHẦN I, II, III)
    drawPartHeader(partNumber, description) {
        const doc = this.doc;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(this.fontSize.title);

        const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
        const roman = romanNumerals[partNumber - 1] || partNumber;

        doc.text(`PHẦN ${roman}. ${description}`, this.margin, this.currentY);
        this.currentY += this.lineHeight * 1.5;
    }

    // Draw a single question
    drawQuestion(questionNumber, questionText, options, questionType = 'multiple-choice') {
        const doc = this.doc;
        const maxWidth = this.pageWidth - this.margin * 2;

        // Check if we need a new page
        if (this.currentY > this.pageHeight - 40) {
            doc.addPage();
            this.currentY = 20;
            this.drawPageNumber();
        }

        // Question number and text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(this.fontSize.body);
        doc.text(`Câu ${questionNumber}.`, this.margin, this.currentY);

        // Question content (may wrap)
        doc.setFont('helvetica', 'normal');
        const questionStartX = this.margin + 15;

        // Clean text for PDF (remove HTML and LaTeX for now)
        const cleanText = this.cleanTextForPDF(questionText);
        const splitText = doc.splitTextToSize(cleanText, maxWidth - 15);

        doc.text(splitText, questionStartX, this.currentY);
        this.currentY += splitText.length * this.lineHeight;

        // Draw options for multiple choice
        if (options && options.length > 0 && questionType === 'multiple-choice') {
            const optionLabels = ['A', 'B', 'C', 'D'];
            const optionsPerRow = 2; // 2 columns for options
            const columnWidth = (maxWidth - 10) / optionsPerRow;

            for (let i = 0; i < options.length; i++) {
                const col = i % optionsPerRow;
                const row = Math.floor(i / optionsPerRow);

                if (col === 0 && row > 0) {
                    this.currentY += this.lineHeight;
                }

                const x = this.margin + 5 + (col * columnWidth);
                const cleanOption = this.cleanTextForPDF(options[i]);

                doc.setFont('helvetica', 'bold');
                doc.text(`${optionLabels[i]}.`, x, this.currentY);

                doc.setFont('helvetica', 'normal');
                const optionText = doc.splitTextToSize(cleanOption, columnWidth - 10);
                doc.text(optionText[0], x + 8, this.currentY);
            }
            this.currentY += this.lineHeight * 1.5;
        }

        // Add spacing between questions
        this.currentY += 2;
    }

    // Draw True/False question section
    drawTrueFalseQuestion(questionNumber, mainQuestion, statements) {
        const doc = this.doc;

        // Check page break
        if (this.currentY > this.pageHeight - 60) {
            doc.addPage();
            this.currentY = 20;
        }

        // Main question
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(this.fontSize.body);
        doc.text(`Câu ${questionNumber}.`, this.margin, this.currentY);

        doc.setFont('helvetica', 'normal');
        const cleanMain = this.cleanTextForPDF(mainQuestion);
        const maxWidth = this.pageWidth - this.margin * 2 - 15;
        const splitMain = doc.splitTextToSize(cleanMain, maxWidth);
        doc.text(splitMain, this.margin + 15, this.currentY);
        this.currentY += splitMain.length * this.lineHeight + 2;

        // Statements a), b), c), d)
        const labels = ['a)', 'b)', 'c)', 'd)'];
        statements.forEach((statement, idx) => {
            const cleanStatement = this.cleanTextForPDF(statement);
            doc.setFont('helvetica', 'bold');
            doc.text(labels[idx], this.margin + 5, this.currentY);
            doc.setFont('helvetica', 'normal');
            const splitStatement = doc.splitTextToSize(cleanStatement, maxWidth - 10);
            doc.text(splitStatement, this.margin + 15, this.currentY);
            this.currentY += splitStatement.length * this.lineHeight;
        });

        this.currentY += this.lineHeight;
    }

    // Draw fill-in-blank question
    drawFillInBlank(questionNumber, questionText) {
        const doc = this.doc;

        if (this.currentY > this.pageHeight - 40) {
            doc.addPage();
            this.currentY = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(this.fontSize.body);
        doc.text(`Câu ${questionNumber}.`, this.margin, this.currentY);

        doc.setFont('helvetica', 'normal');
        const cleanText = this.cleanTextForPDF(questionText);
        const maxWidth = this.pageWidth - this.margin * 2 - 15;
        const splitText = doc.splitTextToSize(cleanText, maxWidth);
        doc.text(splitText, this.margin + 15, this.currentY);
        this.currentY += splitText.length * this.lineHeight + 4;
    }

    // Draw page number
    drawPageNumber() {
        const doc = this.doc;
        const pageNum = doc.internal.getNumberOfPages();
        doc.setFontSize(this.fontSize.small);
        doc.setFont('helvetica', 'italic');
        doc.text(`Trang ${pageNum}/4`, this.pageWidth - this.margin, this.pageHeight - 10, { align: 'right' });
    }

    // Draw end marker
    drawEnd() {
        const doc = this.doc;
        this.currentY += this.lineHeight;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(this.fontSize.body);

        // Dashed line
        doc.text('---------- HẾT ----------', this.pageWidth / 2, this.currentY, { align: 'center' });

        this.currentY += this.lineHeight * 2;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(this.fontSize.small);
        doc.text('- Thí sinh không được sử dụng tài liệu;', this.margin, this.currentY);
        this.currentY += this.lineHeight;
        doc.text('- Giám thị không giải thích gì thêm.', this.margin, this.currentY);
    }

    // Clean text for PDF (remove HTML tags and simplify LaTeX)
    cleanTextForPDF(text) {
        if (!text) return '';

        // Remove HTML tags
        let clean = text.replace(/<[^>]*>/g, '');

        // Convert common LaTeX to plain text (simplified)
        clean = clean.replace(/\$\$(.*?)\$\$/g, ' [$1] ');
        clean = clean.replace(/\$(.*?)\$/g, ' $1 ');
        clean = clean.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1/$2)');
        clean = clean.replace(/\\sqrt\{([^}]*)\}/g, '√($1)');
        clean = clean.replace(/\\vec\{([^}]*)\}/g, '→$1');
        clean = clean.replace(/\\overrightarrow\{([^}]*)\}/g, '→$1');
        clean = clean.replace(/\\int/g, '∫');
        clean = clean.replace(/\\sum/g, 'Σ');
        clean = clean.replace(/\\pi/g, 'π');
        clean = clean.replace(/\\alpha/g, 'α');
        clean = clean.replace(/\\beta/g, 'β');
        clean = clean.replace(/\\gamma/g, 'γ');
        clean = clean.replace(/\\infty/g, '∞');
        clean = clean.replace(/\\pm/g, '±');
        clean = clean.replace(/\\times/g, '×');
        clean = clean.replace(/\\div/g, '÷');
        clean = clean.replace(/\\leq/g, '≤');
        clean = clean.replace(/\\geq/g, '≥');
        clean = clean.replace(/\\neq/g, '≠');
        clean = clean.replace(/\\_/g, '_');
        clean = clean.replace(/\\[a-zA-Z]+/g, ''); // Remove remaining LaTeX commands
        clean = clean.replace(/[{}]/g, ''); // Remove braces

        // Decode HTML entities
        clean = clean.replace(/&lt;/g, '<');
        clean = clean.replace(/&gt;/g, '>');
        clean = clean.replace(/&amp;/g, '&');
        clean = clean.replace(/&nbsp;/g, ' ');

        return clean.trim();
    }

    // Generate complete exam PDF
    async generateExamPDF(examData) {
        this.init();
        await this.loadFonts();

        // Draw header
        this.drawHeader(examData);

        // Group questions by type
        const questions = examData.questions || [];
        const mcQuestions = questions.filter(q => q.type === 'multiple-choice');
        const tfQuestions = questions.filter(q => q.type === 'true-false');
        const fibQuestions = questions.filter(q => q.type === 'fill-in-blank');

        let questionNum = 1;

        // PHẦN I - Trắc nghiệm nhiều lựa chọn
        if (mcQuestions.length > 0) {
            this.drawPartHeader(1, `Thí sinh trả lời từ câu 1 đến câu ${mcQuestions.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.`);

            mcQuestions.forEach(q => {
                this.drawQuestion(questionNum, q.question, q.options, 'multiple-choice');
                questionNum++;
            });
        }

        // PHẦN II - Đúng sai
        if (tfQuestions.length > 0) {
            this.drawPartHeader(2, `Thí sinh trả lời từ câu 1 đến câu ${tfQuestions.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.`);

            tfQuestions.forEach((q, idx) => {
                // For true-false, treat options as statements
                this.drawTrueFalseQuestion(idx + 1, q.question, q.options || []);
            });
        }

        // PHẦN III - Điền số
        if (fibQuestions.length > 0) {
            this.drawPartHeader(3, `Thí sinh trả lời từ câu 1 đến câu ${fibQuestions.length}.`);

            fibQuestions.forEach((q, idx) => {
                this.drawFillInBlank(idx + 1, q.question);
            });
        }

        // End marker
        this.drawEnd();

        // Add page numbers to all pages
        const totalPages = this.doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            this.doc.setPage(i);
            this.doc.setFontSize(this.fontSize.small);
            this.doc.setFont('helvetica', 'italic');
            this.doc.text(`Trang ${i}/${totalPages}`, this.pageWidth - this.margin, this.pageHeight - 10, { align: 'right' });
        }

        return this.doc;
    }

    // Save/download PDF
    save(filename = 'de-thi.pdf') {
        if (this.doc) {
            this.doc.save(filename);
        }
    }

    // Open in new tab for preview/print
    preview() {
        if (this.doc) {
            const pdfBlob = this.doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            window.open(url, '_blank');
        }
    }
}

// Global instance
window.examPDFGenerator = new ExamPDFGenerator();

// Utility function to generate and download exam PDF
async function generateAndDownloadExamPDF(examId) {
    console.log('📄 Starting PDF generation for examId:', examId);

    try {
        // Check if jsPDF is loaded
        console.log('📄 Checking jsPDF:', !!window.jspdf, !!window.jspdf?.jsPDF);
        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert('Thư viện PDF chưa được tải. Vui lòng tải lại trang (Ctrl+F5) và thử lại.');
            console.error('jsPDF not loaded. window.jspdf =', window.jspdf);
            return;
        }

        console.log('📄 jsPDF loaded successfully');

        // Fetch exam data
        const token = localStorage.getItem('luyende_token');
        console.log('📄 Fetching exam data...');
        const response = await fetch(`/api/exams/${examId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error('📄 API response not ok:', response.status);
            throw new Error('Không thể tải đề thi');
        }

        const examData = await response.json();
        console.log('📄 Exam data loaded:', examData.title);

        // Get subject name
        const subject = typeof cachedSubjects !== 'undefined' ? cachedSubjects?.find(s => s.id === examData.subjectId) : null;
        examData.subjectName = subject?.name || 'TOÁN';
        console.log('📄 Subject:', examData.subjectName);

        // Generate PDF
        console.log('📄 Generating PDF...');
        await window.examPDFGenerator.generateExamPDF(examData);
        console.log('📄 PDF generated successfully');

        // Create filename
        const filename = `${examData.title || 'de-thi'}.pdf`.replace(/[^a-zA-Z0-9-_.\u00C0-\u024F]/g, '-');
        console.log('📄 Saving as:', filename);

        // Download
        window.examPDFGenerator.save(filename);
        console.log('📄 PDF saved!');

        alert('Đã tạo PDF thành công! Kiểm tra thư mục Downloads.');

    } catch (err) {
        console.error('📄 Error generating PDF:', err);
        alert('Lỗi tạo PDF: ' + err.message);
    }
}

// Preview exam PDF in new tab
async function previewExamPDF(examId) {
    try {
        const token = localStorage.getItem('luyende_token');
        const response = await fetch(`/api/exams/${examId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Không thể tải đề thi');

        const examData = await response.json();
        const subject = cachedSubjects?.find(s => s.id === examData.subjectId);
        examData.subjectName = subject?.name || 'TOÁN';

        await window.examPDFGenerator.generateExamPDF(examData);
        window.examPDFGenerator.preview();

    } catch (err) {
        console.error('Error previewing PDF:', err);
        alert('Lỗi xem PDF: ' + err.message);
    }
}
