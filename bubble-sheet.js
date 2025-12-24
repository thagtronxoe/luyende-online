/**
 * Bubble Sheet Module - Phiếu trả lời trắc nghiệm
 * Giao diện tích ô giống thi thật với nền hồng
 */

// Current exam data for bubble sheet
let bubbleSheetExamData = null;
let bubbleSheetAnswers = {};

// Show bubble sheet as full page
function showBubbleSheet(examData) {
    bubbleSheetExamData = examData;
    bubbleSheetAnswers = {};

    // Create bubble sheet screen if not exists
    let screen = document.getElementById('bubbleSheetScreen');
    if (!screen) {
        screen = document.createElement('div');
        screen.id = 'bubbleSheetScreen';
        screen.className = 'screen';
        document.body.appendChild(screen);
    }

    // Render bubble sheet
    renderBubbleSheetPage(screen, examData);

    // Show screen
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

function renderBubbleSheetPage(container, examData) {
    const questions = examData.questions || [];
    const mcQuestions = questions.filter(q => q.type === 'multiple-choice');
    const tfQuestions = questions.filter(q => q.type === 'true-false');
    const fibQuestions = questions.filter(q => q.type === 'fill-in-blank');

    container.innerHTML = `
        <div class="bubble-sheet-page">
            <header class="bubble-sheet-header-bar">
                <div class="header-left">
                    <button class="btn btn-outline-sm" onclick="closeBubbleSheet()">← Quay lại</button>
                </div>
                <div class="header-center">
                    <h2>PHIẾU TRẢ LỜI TRẮC NGHIỆM</h2>
                    <span class="exam-title-text">${examData.title || 'Đề thi'}</span>
                </div>
                <div class="header-right">
                    <button class="btn btn-primary" onclick="submitBubbleSheet()">Nộp bài</button>
                </div>
            </header>
            
            <main class="bubble-sheet-main">
                <div class="bubble-sheet-paper">
                    <!-- PHẦN I - Trắc nghiệm 40 câu -->
                    <div class="bubble-section-box">
                        <div class="section-label">PHẦN I</div>
                        <div class="mc-boxes">
                            ${renderMCBoxes(mcQuestions.length > 0 ? mcQuestions.length : 12)}
                        </div>
                    </div>
                    
                    <!-- PHẦN II - Đúng/Sai -->
                    <div class="bubble-section-box">
                        <div class="section-label">PHẦN II</div>
                        <div class="tf-boxes">
                            ${renderTFBoxes(tfQuestions.length > 0 ? tfQuestions.length : 4)}
                        </div>
                    </div>
                    
                    <!-- PHẦN III - Điền số -->
                    <div class="bubble-section-box">
                        <div class="section-label">PHẦN III</div>
                        <div class="fib-boxes">
                            ${renderFIBBoxes(fibQuestions.length > 0 ? fibQuestions.length : 6)}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    `;

    // Attach event listeners
    attachBubbleEventListeners(container);
}

// Render MC boxes with 4 columns of 10 rows
function renderMCBoxes(totalQuestions) {
    // 40 câu thành 4 cột x 10 hàng
    const cols = 4;
    const rowsPerCol = 10;
    let html = '';

    for (let col = 0; col < cols; col++) {
        const startQ = col * rowsPerCol + 1;
        const endQ = Math.min((col + 1) * rowsPerCol, totalQuestions);

        html += `
            <div class="mc-box">
                <div class="mc-box-header">
                    <span></span><span>A</span><span>B</span><span>C</span><span>D</span>
                </div>
        `;

        for (let q = startQ; q <= endQ && q <= totalQuestions; q++) {
            html += `
                <div class="mc-box-row" data-question="${q}">
                    <span class="q-number">${q}</span>
                    ${['A', 'B', 'C', 'D'].map(opt => `
                        <span class="bubble mc" data-question="${q}" data-answer="${opt}">○</span>
                    `).join('')}
                </div>
            `;
        }

        html += '</div>';
    }

    return html;
}

// Render TF boxes - each question has 4 statements (a,b,c,d)
function renderTFBoxes(totalQuestions) {
    const cols = 4; // Show 4 boxes per row
    let html = '';

    for (let q = 1; q <= totalQuestions; q++) {
        html += `
            <div class="tf-box">
                <div class="tf-box-header">
                    <span>Câu ${q}</span>
                </div>
                <div class="tf-box-subheader">
                    <span></span><span>Đúng</span><span>Sai</span>
                </div>
        `;

        ['a', 'b', 'c', 'd'].forEach(label => {
            html += `
                <div class="tf-box-row" data-question="tf-${q}" data-statement="${label}">
                    <span class="tf-label">${label})</span>
                    <span class="bubble tf" data-question="tf-${q}" data-statement="${label}" data-answer="true">○</span>
                    <span class="bubble tf" data-question="tf-${q}" data-statement="${label}" data-answer="false">○</span>
                </div>
            `;
        });

        html += '</div>';
    }

    return html;
}

// Render FIB boxes - each has sign + 4 digit columns
function renderFIBBoxes(totalQuestions) {
    let html = '';

    for (let q = 1; q <= totalQuestions; q++) {
        html += `
            <div class="fib-box">
                <div class="fib-box-header">Câu ${q}</div>
                <div class="fib-digits-grid">
                    <div class="fib-sign-col">
                        <span class="fib-sign-label">−</span>
                        <span class="bubble fib-sign" data-question="fib-${q}" data-sign="negative">○</span>
                        <span class="fib-comma-label">,</span>
                        <span class="bubble fib-comma" data-question="fib-${q}" data-comma="true">○</span>
                    </div>
                    ${[0, 1, 2, 3].map(col => `
                        <div class="fib-digit-col">
                            ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `
                                <span class="bubble fib" data-question="fib-${q}" data-col="${col}" data-val="${num}">${num}</span>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    return html;
}

// Attach click event listeners
function attachBubbleEventListeners(container) {
    // MC bubbles
    container.querySelectorAll('.bubble.mc').forEach(cell => {
        cell.addEventListener('click', () => {
            const qNum = cell.dataset.question;
            const answer = cell.dataset.answer;

            // Deselect others in same question
            container.querySelectorAll(`.bubble.mc[data-question="${qNum}"]`).forEach(c => {
                c.classList.remove('selected');
                c.textContent = '○';
            });

            cell.classList.add('selected');
            cell.textContent = '●';
            bubbleSheetAnswers[`mc-${qNum}`] = answer;
        });
    });

    // TF bubbles
    container.querySelectorAll('.bubble.tf').forEach(cell => {
        cell.addEventListener('click', () => {
            const qKey = cell.dataset.question;
            const statement = cell.dataset.statement;
            const answer = cell.dataset.answer;

            // Deselect other for same statement
            container.querySelectorAll(`.bubble.tf[data-question="${qKey}"][data-statement="${statement}"]`).forEach(c => {
                c.classList.remove('selected');
                c.textContent = '○';
            });

            cell.classList.add('selected');
            cell.textContent = '●';

            if (!bubbleSheetAnswers[qKey]) bubbleSheetAnswers[qKey] = {};
            bubbleSheetAnswers[qKey][statement] = answer === 'true';
        });
    });

    // FIB digit bubbles
    container.querySelectorAll('.bubble.fib').forEach(cell => {
        cell.addEventListener('click', () => {
            const qKey = cell.dataset.question;
            const col = cell.dataset.col;
            const val = cell.dataset.val;

            // Deselect others in same column
            container.querySelectorAll(`.bubble.fib[data-question="${qKey}"][data-col="${col}"]`).forEach(c => {
                c.classList.remove('selected');
            });

            cell.classList.add('selected');

            if (!bubbleSheetAnswers[qKey]) bubbleSheetAnswers[qKey] = { digits: {} };
            bubbleSheetAnswers[qKey].digits[col] = val;
        });
    });

    // Sign bubbles
    container.querySelectorAll('.bubble.fib-sign').forEach(cell => {
        cell.addEventListener('click', () => {
            const qKey = cell.dataset.question;
            cell.classList.toggle('selected');
            cell.textContent = cell.classList.contains('selected') ? '●' : '○';

            if (!bubbleSheetAnswers[qKey]) bubbleSheetAnswers[qKey] = { digits: {} };
            bubbleSheetAnswers[qKey].negative = cell.classList.contains('selected');
        });
    });
}

// Close bubble sheet and go back
function closeBubbleSheet() {
    showScreen('examListScreen');
}

// Submit bubble sheet and show results
function submitBubbleSheet() {
    if (!bubbleSheetExamData) return;

    const result = calculateBubbleScore();

    // Show result screen (reuse existing)
    document.getElementById('resultStudentName').textContent = currentUser?.name || 'User';
    document.getElementById('resultExamTitle').textContent = bubbleSheetExamData.title || 'Đề thi';
    document.getElementById('examDuration').textContent = bubbleSheetExamData.duration + ' phút';
    document.getElementById('actualTime').textContent = 'N/A (điền form)';
    document.getElementById('correctAnswers').textContent = result.correct;
    document.getElementById('finalScore').textContent = result.score + '/10';

    // Store for history
    saveExamToHistory({
        examId: bubbleSheetExamData.id || bubbleSheetExamData._id,
        examTitle: bubbleSheetExamData.title,
        mode: 'form',
        score: result.score,
        correct: result.correct,
        total: result.total,
        completedAt: new Date().toISOString()
    });

    showScreen('resultScreen');
}

// Calculate score from bubble sheet answers
function calculateBubbleScore() {
    if (!bubbleSheetExamData) return { correct: 0, total: 0, score: 0 };

    const questions = bubbleSheetExamData.questions || [];
    let correct = 0;
    let total = 0;

    questions.forEach((q, idx) => {
        if (q.type === 'multiple-choice') {
            total++;
            const userAnswer = bubbleSheetAnswers[`mc-${idx + 1}`];
            const correctAnswer = q.correctAnswer;
            if (userAnswer && userAnswer === correctAnswer) {
                correct++;
            }
        } else if (q.type === 'true-false') {
            // TF scoring - check each statement
            const qKey = `tf-${idx + 1}`;
            const userAnswers = bubbleSheetAnswers[qKey] || {};
            const correctAnswers = q.correctAnswers || [];

            ['a', 'b', 'c', 'd'].forEach((label, i) => {
                total++;
                const userAns = userAnswers[label];
                const correctAns = correctAnswers[i];
                if (userAns !== undefined && userAns === correctAns) {
                    correct++;
                }
            });
        } else if (q.type === 'fill-in-blank') {
            total++;
            const qKey = `fib-${idx + 1}`;
            const userAnswer = bubbleSheetAnswers[qKey];
            const correctAnswer = q.correctAnswer;

            if (userAnswer && userAnswer.digits) {
                // Construct number from digits
                let numStr = '';
                for (let i = 0; i < 4; i++) {
                    if (userAnswer.digits[i] !== undefined) {
                        numStr += userAnswer.digits[i];
                    }
                }
                if (userAnswer.negative) numStr = '-' + numStr;

                if (numStr === String(correctAnswer)) {
                    correct++;
                }
            }
        }
    });

    const score = total > 0 ? ((correct / total) * 10).toFixed(2) : 0;
    return { correct, total, score };
}
