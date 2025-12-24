/**
 * Bubble Sheet Module - Phiếu trả lời trắc nghiệm
 * Giao diện tích ô giống thi thật
 */

class BubbleSheet {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.examData = null;
        this.answers = {};
        this.mode = 'answer'; // 'answer' or 'review'
    }

    // Initialize with exam data
    init(examData) {
        this.examData = examData;
        this.answers = {};
        this.render();
        return this;
    }

    // Render the complete bubble sheet
    render() {
        if (!this.container || !this.examData) return;

        const questions = this.examData.questions || [];
        const mcQuestions = questions.filter(q => q.type === 'multiple-choice');
        const tfQuestions = questions.filter(q => q.type === 'true-false');
        const fibQuestions = questions.filter(q => q.type === 'fill-in-blank');

        let html = `
            <div class="bubble-sheet">
                <div class="bubble-sheet-header">
                    <h2>PHIẾU TRẢ LỜI TRẮC NGHIỆM</h2>
                    <div class="bubble-sheet-info">
                        <div class="info-row">
                            <span>Kỳ thi: ............................................</span>
                            <span>Ngày thi: ......../......../20......</span>
                        </div>
                        <div class="info-row">
                            <span>Bài thi: ............................................</span>
                        </div>
                    </div>
                    <div class="bubble-sheet-student-info">
                        <div class="info-box">
                            <div class="info-label">Điểm</div>
                        </div>
                        <div class="info-fields">
                            <div>1. Hội đồng thi: ................................................</div>
                            <div>2. Điểm thi: ........................................................</div>
                            <div>3. Phòng thi số: ................................................</div>
                            <div>4. Họ và tên thí sinh: ......................................</div>
                            <div>5. Ngày sinh: ..................... (Nam/ Nữ).</div>
                            <div>6. Chữ ký của thí sinh: ..................................</div>
                        </div>
                        <div class="sbd-boxes">
                            <div class="sbd-label">7. Số báo danh</div>
                            <div class="sbd-grid">${this.renderSBDGrid()}</div>
                        </div>
                        <div class="exam-code-boxes">
                            <div class="exam-code-label">8. Mã đề thi</div>
                            <div class="exam-code-grid">${this.renderExamCodeGrid()}</div>
                        </div>
                    </div>
                </div>
        `;

        // PHẦN I - Trắc nghiệm nhiều lựa chọn
        if (mcQuestions.length > 0) {
            html += `
                <div class="bubble-section">
                    <div class="section-title">PHẦN I</div>
                    <div class="bubble-grid mc-grid">
                        ${this.renderMCSection(mcQuestions)}
                    </div>
                </div>
            `;
        }

        // PHẦN II - Đúng sai (4 câu, mỗi câu 4 mệnh đề)
        if (tfQuestions.length > 0) {
            html += `
                <div class="bubble-section">
                    <div class="section-title">PHẦN II</div>
                    <div class="bubble-grid tf-grid">
                        ${this.renderTFSection(tfQuestions)}
                    </div>
                </div>
            `;
        }

        // PHẦN III - Điền số (6 câu)
        if (fibQuestions.length > 0) {
            html += `
                <div class="bubble-section">
                    <div class="section-title">PHẦN III</div>
                    <div class="bubble-grid fib-grid">
                        ${this.renderFIBSection(fibQuestions)}
                    </div>
                </div>
            `;
        }

        html += `
                <div class="bubble-actions">
                    <button class="btn btn-primary" onclick="submitBubbleSheet()">Nộp bài</button>
                    <button class="btn btn-secondary" onclick="closeBubbleSheet()">Hủy</button>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.attachEventListeners();
    }

    // Render SBD (Số báo danh) grid
    renderSBDGrid() {
        let html = '<div class="sbd-columns">';
        for (let col = 0; col < 6; col++) {
            html += '<div class="sbd-column">';
            for (let num = 0; num <= 9; num++) {
                html += `
                    <div class="bubble-cell sbd" data-col="${col}" data-val="${num}">
                        <span class="bubble-circle">○</span>
                        <span class="bubble-num">${num}</span>
                    </div>
                `;
            }
            html += '</div>';
        }
        html += '</div>';
        return html;
    }

    // Render exam code grid
    renderExamCodeGrid() {
        let html = '<div class="exam-code-columns">';
        for (let col = 0; col < 3; col++) {
            html += '<div class="exam-code-column">';
            for (let num = 0; num <= 9; num++) {
                html += `
                    <div class="bubble-cell exam-code" data-col="${col}" data-val="${num}">
                        <span class="bubble-circle">○</span>
                        <span class="bubble-num">${num}</span>
                    </div>
                `;
            }
            html += '</div>';
        }
        html += '</div>';
        return html;
    }

    // Render multiple choice section
    renderMCSection(questions) {
        const cols = 4; // 4 columns of 10 questions each
        const questionsPerCol = 10;
        let html = '';

        for (let col = 0; col < cols; col++) {
            html += '<div class="mc-column">';
            html += '<div class="mc-header"><span></span><span>A</span><span>B</span><span>C</span><span>D</span></div>';

            for (let i = 0; i < questionsPerCol; i++) {
                const qNum = col * questionsPerCol + i + 1;
                if (qNum > questions.length) break;

                html += `<div class="mc-row" data-question="${qNum}">`;
                html += `<span class="q-num">${qNum}</span>`;
                ['A', 'B', 'C', 'D'].forEach(opt => {
                    html += `
                        <span class="bubble-cell mc" data-question="${qNum}" data-answer="${opt}">
                            <span class="bubble-circle">○</span>
                        </span>
                    `;
                });
                html += '</div>';
            }
            html += '</div>';
        }

        return html;
    }

    // Render true/false section
    renderTFSection(questions) {
        let html = '<div class="tf-grid-inner">';

        questions.forEach((q, idx) => {
            const qNum = idx + 1;
            html += `
                <div class="tf-question" data-question="tf-${qNum}">
                    <div class="tf-header">Câu ${qNum}</div>
                    <div class="tf-row-header">
                        <span></span><span>Đúng</span><span>Sai</span>
                    </div>
            `;

            // 4 statements per question
            ['a', 'b', 'c', 'd'].forEach(label => {
                html += `
                    <div class="tf-row" data-statement="${label}">
                        <span class="tf-label">${label})</span>
                        <span class="bubble-cell tf" data-question="tf-${qNum}" data-statement="${label}" data-answer="true">
                            <span class="bubble-circle">○</span>
                        </span>
                        <span class="bubble-cell tf" data-question="tf-${qNum}" data-statement="${label}" data-answer="false">
                            <span class="bubble-circle">○</span>
                        </span>
                    </div>
                `;
            });

            html += '</div>';
        });

        html += '</div>';
        return html;
    }

    // Render fill-in-blank section  
    renderFIBSection(questions) {
        let html = '<div class="fib-grid-inner">';

        questions.forEach((q, idx) => {
            const qNum = idx + 1;
            html += `
                <div class="fib-question" data-question="fib-${qNum}">
                    <div class="fib-header">Câu ${qNum}</div>
                    <div class="fib-sign-row">
                        <span class="fib-sign">−</span>
                        <span class="bubble-cell fib-sign-cell" data-question="fib-${qNum}" data-sign="negative">
                            <span class="bubble-circle">○</span>
                        </span>
                    </div>
                    <div class="fib-digits">
            `;

            // Usually 4-5 digit columns + optional decimal
            for (let col = 0; col < 4; col++) {
                html += `<div class="fib-column" data-col="${col}">`;
                for (let num = 0; num <= 9; num++) {
                    html += `
                        <div class="bubble-cell fib" data-question="fib-${qNum}" data-col="${col}" data-val="${num}">
                            <span class="bubble-circle">○</span>
                            <span class="bubble-num">${num}</span>
                        </div>
                    `;
                }
                html += '</div>';
            }

            html += '</div></div>';
        });

        html += '</div>';
        return html;
    }

    // Attach click event listeners
    attachEventListeners() {
        // Multiple choice bubbles
        this.container.querySelectorAll('.bubble-cell.mc').forEach(cell => {
            cell.addEventListener('click', () => {
                const qNum = cell.dataset.question;
                const answer = cell.dataset.answer;

                // Deselect others in same question
                this.container.querySelectorAll(`.bubble-cell.mc[data-question="${qNum}"]`).forEach(c => {
                    c.classList.remove('selected');
                });

                cell.classList.add('selected');
                this.answers[`mc-${qNum}`] = answer;
            });
        });

        // True/false bubbles
        this.container.querySelectorAll('.bubble-cell.tf').forEach(cell => {
            cell.addEventListener('click', () => {
                const qKey = cell.dataset.question;
                const statement = cell.dataset.statement;
                const answer = cell.dataset.answer;

                // Deselect other answer for same statement
                this.container.querySelectorAll(`.bubble-cell.tf[data-question="${qKey}"][data-statement="${statement}"]`).forEach(c => {
                    c.classList.remove('selected');
                });

                cell.classList.add('selected');
                if (!this.answers[qKey]) this.answers[qKey] = {};
                this.answers[qKey][statement] = answer === 'true';
            });
        });

        // Fill-in-blank bubbles
        this.container.querySelectorAll('.bubble-cell.fib').forEach(cell => {
            cell.addEventListener('click', () => {
                const qKey = cell.dataset.question;
                const col = cell.dataset.col;
                const val = cell.dataset.val;

                // Deselect other values in same column
                this.container.querySelectorAll(`.bubble-cell.fib[data-question="${qKey}"][data-col="${col}"]`).forEach(c => {
                    c.classList.remove('selected');
                });

                cell.classList.add('selected');
                if (!this.answers[qKey]) this.answers[qKey] = { digits: {} };
                this.answers[qKey].digits[col] = val;
            });
        });

        // Negative sign for fill-in-blank
        this.container.querySelectorAll('.bubble-cell.fib-sign-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                const qKey = cell.dataset.question;
                cell.classList.toggle('selected');
                if (!this.answers[qKey]) this.answers[qKey] = { digits: {} };
                this.answers[qKey].negative = cell.classList.contains('selected');
            });
        });
    }

    // Get all answers
    getAnswers() {
        return this.answers;
    }

    // Calculate score
    calculateScore() {
        if (!this.examData) return { correct: 0, total: 0, score: 0 };

        const questions = this.examData.questions || [];
        let correct = 0;
        let total = questions.length;

        questions.forEach((q, idx) => {
            if (q.type === 'multiple-choice') {
                const userAnswer = this.answers[`mc-${idx + 1}`];
                const correctAnswer = q.correctAnswer;
                if (userAnswer && userAnswer === correctAnswer) {
                    correct++;
                }
            }
            // Add logic for TF and FIB scoring
        });

        return {
            correct,
            total,
            score: ((correct / total) * 10).toFixed(2)
        };
    }
}

// Global instance
window.bubbleSheet = new BubbleSheet('bubbleSheetContainer');

// Global functions
function showBubbleSheet(examData) {
    const container = document.getElementById('bubbleSheetModal');
    if (container) {
        container.classList.add('active');
        window.bubbleSheet.container = document.getElementById('bubbleSheetContainer');
        window.bubbleSheet.init(examData);
    }
}

function closeBubbleSheet() {
    const container = document.getElementById('bubbleSheetModal');
    if (container) {
        container.classList.remove('active');
    }
}

function submitBubbleSheet() {
    const result = window.bubbleSheet.calculateScore();
    alert(`Kết quả: ${result.correct}/${result.total} câu đúng\nĐiểm: ${result.score}/10`);
    closeBubbleSheet();
}
