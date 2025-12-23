// ========== USER & AUTH SYSTEM ==========
if (typeof currentUser === 'undefined') var currentUser = null;

// ========== GOOGLE reCAPTCHA SYSTEM ==========
// reCAPTCHA is configured in index.html inline script (must load before Google script)
// recaptchaWidgets and onRecaptchaLoad are defined there


function validateRecaptcha(formId) {
    // Skip reCAPTCHA validation on localhost for testing
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('Skipping reCAPTCHA on localhost');
        return true;
    }

    // Check if reCAPTCHA response exists
    try {
        // Try to get response from specific widget, or default widget
        const widgetId = recaptchaWidgets[formId];
        const response = widgetId !== undefined ?
            grecaptcha.getResponse(widgetId) :
            grecaptcha.getResponse();

        if (!response) {
            alert('Vui lòng xác minh bạn không phải robot!');
            return false;
        }
        return true;
    } catch (e) {
        // If grecaptcha not loaded, skip validation
        console.log('reCAPTCHA not loaded, skipping validation');
        return true;
    }
}

function resetRecaptcha(formId) {
    if (typeof grecaptcha !== 'undefined') {
        try {
            const widgetId = recaptchaWidgets[formId];
            if (widgetId !== undefined) {
                grecaptcha.reset(widgetId);
            } else {
                grecaptcha.reset();
            }
        } catch (e) {
            console.log('Error resetting reCAPTCHA');
        }
    }
}

// Get users from localStorage or use default
function getUsers() {
    const stored = localStorage.getItem('luyende_users');
    if (stored) return JSON.parse(stored);
    return [
        { id: 1, name: "PHẠM ĐỨC THẮNG", username: "thang01", password: "123456", completedExams: [] }
    ];
}

function saveUsers(users) {
    localStorage.setItem('luyende_users', JSON.stringify(users));
}

// Exam Packages - Gói đề (fetched from API)
// accessType: 'updating' (đang cập nhật), 'open' (mở thoải mái), 'register' (cần đăng kí)
// Use var to create true global variables (accessible without window. prefix)
if (typeof examPackages === 'undefined') var examPackages = [];
if (typeof examsData === 'undefined') var examsData = {};

if (typeof currentPackageId === 'undefined') var currentPackageId = localStorage.getItem('luyende_currentPackageId');

// Load packages from API
async function loadPackages() {
    try {
        examPackages = await apiGetPackages();
        console.log('Loaded packages:', examPackages.length);
    } catch (err) {
        console.error('Error loading packages:', err);
        examPackages = [];
    }
}

// Load exams for a package from API
async function loadExamsForPackage(packageId) {
    try {
        const exams = await apiGetExams(packageId);
        examsData[packageId] = exams;
        console.log(`Loaded ${exams.length} exams for package ${packageId}`);
        return exams;
    } catch (err) {
        console.error('Error loading exams:', err);
        return [];
    }
}

// ========== SCREEN NAVIGATION WITH URL ROUTING ==========
// Map screen IDs to URL hashes
if (typeof screenRoutes === 'undefined') var screenRoutes = {
    'loginScreen': '#login',
    'registerScreen': '#register',
    'dashboardScreen': '#dashboard',
    'examListScreen': '#exams',
    'preExamScreen': '#pre-exam',
    'examScreen': '#exam',
    'resultScreen': '#result',
    'answerReviewScreen': '#review'
};

function showScreen(screenId, updateHash = true) {
    // Close any open modals first to prevent backdrop overlay
    document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');

    // Update URL hash (only for certain screens)
    if (updateHash && screenRoutes[screenId]) {
        history.pushState(null, '', screenRoutes[screenId]);
    }
}

// NOTE: handleURLHash is defined at end of file with full async support
// popstate listener is also at end of file

// ========== AUTH HANDLERS ==========
async function handleLogin(event) {
    console.log("Login initiated");
    event.preventDefault();

    // Validate reCAPTCHA first
    if (!validateRecaptcha('loginForm')) {
        return;
    }

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const user = await apiLogin(username, password);
        currentUser = user;
        showDashboard();
    } catch (err) {
        alert(err.message || 'Tên đăng nhập hoặc mật khẩu không đúng!');
        resetRecaptcha();
    }
}

async function handleRegister(event) {
    event.preventDefault();
    console.log("Register Form Submitted");

    // Validate reCAPTCHA first
    if (!validateRecaptcha('registerForm')) {
        return;
    }

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerPasswordConfirm').value;

    // Validate Gmail format
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(email)) {
        showError('registerEmail', 'Vui lòng nhập địa chỉ Gmail hợp lệ (ví dụ: ten@gmail.com)');
        return;
    }
    clearError('registerEmail');

    // Check password match
    if (password !== confirmPassword) {
        showError('registerPasswordConfirm', 'Mật khẩu xác nhận không khớp!');
        return;
    }
    clearError('registerPasswordConfirm');

    try {
        await apiRegister(name, email, username, password);
        alert('Đăng ký thành công! Vui lòng đăng nhập.');
        showScreen('loginScreen');
        document.getElementById('loginUsername').value = username;
    } catch (err) {
        alert(err.message || 'Đăng ký thất bại!');
        resetRecaptcha();
    }
}

// Toggle password visibility
function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        button.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>`;
    } else {
        input.type = 'password';
        button.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>`;
    }
}

// Show error message under input
function showError(inputId, message) {
    const input = document.getElementById(inputId);
    const formGroup = input.closest('.form-group');

    // Remove existing error
    clearError(inputId);

    // Add error class and message
    input.classList.add('input-error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    formGroup.appendChild(errorDiv);

    // Focus on the input
    input.focus();
}

function clearError(inputId) {
    const input = document.getElementById(inputId);
    const formGroup = input.closest('.form-group');

    input.classList.remove('input-error');
    const existingError = formGroup.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
}

function handleLogout() {
    currentUser = null;
    apiLogout(); // Clear token and localStorage
    showScreen('loginScreen');
}

// Go back to exam list for current package
// Go back to exam list for current package
function backToExamList() {
    console.log('🔙 backToExamList called, clearing active state');

    // Clear active exam state prevents "Ghost Resume"
    localStorage.removeItem('luyende_activeExamState');
    if (typeof timerInterval !== 'undefined' && timerInterval) clearInterval(timerInterval);

    // Restore packageId from localStorage if not in memory
    if (!currentPackageId) {
        currentPackageId = localStorage.getItem('luyende_currentPackageId');
    }

    console.log('🔙 Going to exam list for package:', currentPackageId);
    if (currentPackageId) {
        showExamList(currentPackageId);
    } else {
        console.log('🔙 No currentPackageId, going to dashboard');
        showDashboard();
    }
}

// ========== DASHBOARD ==========
// Helper function to update username on all screens
function updateUserNameDisplay() {
    const userName = currentUser?.name || 'User';
    const displayText = 'Xin chào, ' + userName;

    const dashboardName = document.getElementById('dashboardUserName');
    const examListName = document.getElementById('examListUserName');
    const reviewName = document.getElementById('reviewUserName');

    if (dashboardName) dashboardName.textContent = displayText;
    if (examListName) examListName.textContent = displayText;
    if (reviewName) reviewName.textContent = displayText;
}

async function showDashboard() {
    // Debug: log currentUser to check data
    console.log('showDashboard - currentUser:', currentUser);

    updateUserNameDisplay();

    // Load packages from API
    await loadPackages();
    console.log('showDashboard - loaded packages:', examPackages.length);
    renderPackages();
    showScreen('dashboardScreen');

    // Check for active exam resume
    checkAndResumeExam();
}

// Check and Resume Active Exam
async function checkAndResumeExam() {
    isExamSubmitted = false; // Reset submission flag
    try {
        const savedState = JSON.parse(localStorage.getItem('luyende_activeExamState'));
        if (savedState && savedState.examId && savedState.packageId) {
            // Only resume if data <= 2 hours old to prevent stale locks
            const age = (Date.now() - (savedState.timestamp || 0)) / 1000 / 3600;
            if (age > 3) {
                localStorage.removeItem('luyende_activeExamState');
                return false;
            }

            // Confirm? User said "lỡ load lại thì vẫn ở trạng thái làm tiếp". Auto-resume implies no confirm.
            // But we need to load the exam data first.
            console.log("Found active exam, attempting resume...");

            // Ensure package loaded
            currentPackageId = savedState.packageId;
            const exams = await loadExamsForPackage(currentPackageId);
            if (exams) {
                // Fix: Check both _id and id for exam lookup
                const exam = exams.find(e =>
                    (e._id === savedState.examId) || (e.id === savedState.examId) || (String(e._id) === String(savedState.examId))
                );

                if (exam) {
                    console.log("Resuming exam:", exam.title);

                    // CRITICAL FIX: Populate examData from the found exam
                    // startExam() takes no arguments, so we must set global examData here
                    examData.examTitle = exam.title;
                    examData.id = exam._id || exam.id;
                    examData.displayId = exam.displayId || exam.id || exam._id;
                    examData.duration = exam.duration || 90;
                    examData.template = exam.template || 'thpt_toan';
                    examData.studentName = currentUser ? currentUser.name : 'User';

                    if (exam.questions && exam.questions.length > 0) {
                        examData.questions = exam.questions;
                    }

                    // Restore other state
                    if (savedState.currentQuestionIndex) currentQuestionIndex = savedState.currentQuestionIndex;
                    if (savedState.userAnswers) userAnswers = savedState.userAnswers;
                    if (savedState.flaggedQuestions) flaggedQuestions = new Set(savedState.flaggedQuestions);

                    // Calculate remaining time
                    const elapsedTime = Math.floor((Date.now() - savedState.timestamp) / 1000);
                    const savedTimeRemaining = savedState.timeRemaining || (examData.duration * 60);
                    timeRemaining = Math.max(0, savedTimeRemaining - elapsedTime);

                    startExam(true);
                    return true;
                } else {
                    console.error("Resumed exam not found in package:", savedState.examId);
                    localStorage.removeItem('luyende_activeExamState'); // Invalid state
                    return false;
                }
            }
        }
    } catch (e) {
        console.error("Error resuming exam:", e);
    }
}

// Global flag to prevent auto-save race conditions
let isExamSubmitted = false;

// Save Exam State (for resume on reload)
function saveExamState() {
    // CRITICAL FIX: Do not save if exam is submitted or invalid
    if (isExamSubmitted || !examData || !examData.id) return;

    // Only save if we are actually in the exam screen
    const examScreen = document.getElementById('examScreen');
    if (!examScreen || !examScreen.classList.contains('active')) return;

    const state = {
        examId: examData.id || examData._id,
        packageId: currentPackageId,
        userAnswers: userAnswers,
        flaggedQuestions: Array.from(flaggedQuestions),
        timeRemaining: timeRemaining,
        currentQuestionIndex: currentQuestionIndex,
        timestamp: Date.now()
    };
    localStorage.setItem('luyende_activeExamState', JSON.stringify(state));
}

// Switch between tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    if (tabName === 'myPackages') {
        document.getElementById('myPackagesTab').classList.add('active');
    } else if (tabName === 'allPackages') {
        document.getElementById('allPackagesTab').classList.add('active');
    }
}

function renderPackages() {
    console.log('📦 renderPackages called, examPackages:', examPackages);
    console.log('📦 examPackages length:', examPackages?.length);

    const myGrid = document.getElementById('myPackagesGrid');
    const allGrid = document.getElementById('allPackagesGrid');

    console.log('📦 myGrid element:', myGrid);
    console.log('📦 allGrid element:', allGrid);

    // Get current user's activated packages from currentUser object
    const userActivatedPackages = currentUser?.activatedPackages || [];

    // Helper to get status badge HTML based on user access
    function getStatusBadge(pkg) {
        if (pkg.accessType === 'updating') {
            return '<div class="package-status updating">🔄 Đang cập nhật</div>';
        }
        // If open, show as activated for all
        if (pkg.accessType === 'open') {
            return '<div class="package-status open">✓ Đã kích hoạt</div>';
        }
        // Check if user has this package activated
        const pkgId = pkg._id || pkg.id;
        if (userActivatedPackages.includes(pkgId)) {
            return '<div class="package-status open">✓ Đã kích hoạt</div>';
        }
        if (pkg.accessType === 'free_registration') {
            return '<div class="package-status free">🆓 Đăng ký miễn phí</div>';
        }
        return '<div class="package-status register">🔒 Cần kích hoạt</div>';
    }

    // Helper to get user's effective access type
    function getUserAccessType(pkg) {
        if (pkg.accessType === 'updating') return 'updating';
        const pkgId = pkg._id || pkg.id;
        if (userActivatedPackages.includes(pkgId) || pkg.accessType === 'open') return 'open';
        return 'register';
    }

    // Render my packages (only packages user has access to)
    const accessiblePackages = examPackages.filter(p => {
        const pkgId = p._id || p.id;
        return p.accessType !== 'updating' && (userActivatedPackages.includes(pkgId) || p.accessType === 'open');
    });

    if (accessiblePackages.length === 0) {
        myGrid.innerHTML = '<div class="no-packages">Bạn chưa đăng ký gói nào. Liên hệ admin để kích hoạt gói!</div>';
    } else {
        myGrid.innerHTML = accessiblePackages.map(pkg => `
            <div class="package-card" onclick="showExamList('${pkg._id || pkg.id}')">
                <div class="package-icon">${pkg.icon || '📝'}</div>
                <div class="package-name">${pkg.name}</div>
                <div class="package-description">${pkg.description || ''}</div>
                <div class="package-stats">
                    <span class="package-stat">📝 ${pkg.examCount || 0} đề</span>
                </div>
                ${getStatusBadge(pkg)}
            </div>
        `).join('');
    }

    // All packages with different click behaviors
    allGrid.innerHTML = examPackages.map(pkg => {
        const effectiveAccess = getUserAccessType(pkg);
        return `
        <div class="package-card ${effectiveAccess}" onclick="handlePackageClick('${pkg._id || pkg.id}')">
            <div class="package-icon">${pkg.icon || '📝'}</div>
            <div class="package-name">${pkg.name}</div>
            <div class="package-description">${pkg.description || ''}</div>
            <div class="package-stats">
                <span class="package-stat">📝 ${pkg.examCount || 0} đề</span>
            </div>
            ${getStatusBadge(pkg)}
        </div>
    `}).join('');
}

// Handle package click based on user's access
async function handlePackageClick(packageId) {
    const pkg = examPackages.find(p => (p._id || p.id) === packageId);
    if (!pkg) return;

    // Check if updating
    if (pkg.accessType === 'updating') {
        alert('Gói đề này đang được cập nhật. Vui lòng quay lại sau!');
        return;
    }

    // Check if user has access
    const users = JSON.parse(localStorage.getItem('luyende_users') || '[]');
    const currentUserData = users.find(u => u.id === currentUser?.id);
    const userActivatedPackages = currentUserData?.activatedPackages || [];

    const pkgId = pkg._id || pkg.id;
    if (!userActivatedPackages.includes(pkgId) && pkg.accessType !== 'open') {
        // Feature: Free Registration
        if (pkg.accessType === 'free_registration') {
            if (confirm(`Bạn có muốn thêm gói "${pkg.name}" vào danh sách đề của bạn miễn phí?`)) {
                try {
                    // NEW: Call API to activate on server
                    const result = await apiActivatePackage(pkgId);

                    // Update local currentUser
                    if (result && result.activatedPackages) {
                        currentUser.activatedPackages = result.activatedPackages;
                    } else {
                        currentUser.activatedPackages = currentUser.activatedPackages || [];
                        if (!currentUser.activatedPackages.includes(pkgId)) currentUser.activatedPackages.push(pkgId);
                    }

                    // Update localStorage currentUser
                    localStorage.setItem('luyende_currentUser', JSON.stringify(currentUser));

                    // Update localStorage users list (legacy support)
                    const userIndex = users.findIndex(u => u.id === currentUser.id);
                    if (userIndex !== -1) {
                        users[userIndex].activatedPackages = currentUser.activatedPackages;
                        localStorage.setItem('luyende_users', JSON.stringify(users));
                    }

                    // Refresh UI
                    renderPackages();
                    alert('Đã thêm gói đề thành công! Bạn có thể bắt đầu làm bài ngay.');
                    showExamList(pkgId);
                } catch (err) {
                    console.error('Activation error:', err);
                    alert('Lỗi khi thêm gói đề: ' + (err.message || 'Lỗi không xác định'));
                }
                return;
            } else {
                return;
            }
        }

        showContactModal();
        return;
    }

    // User has access - go to exam list
    showExamList(pkgId);
}

// Show contact modal for registration
async function showContactModal() {
    const modal = document.getElementById('contactModal');

    // Default contact URLs (fallback)
    const defaultSettings = {
        zalo: 'https://zalo.me/0362057031',
        facebook: 'https://www.facebook.com/thang01112007',
        telegram: 'https://t.me/pducthang'
    };

    // Fetch contact settings from API
    let settings = { ...defaultSettings };
    try {
        console.log('📞 Fetching contact settings from API...');
        const response = await fetch('/api/settings/contact');
        console.log('📞 API response status:', response.status);
        if (response.ok) {
            const apiSettings = await response.json();
            console.log('📞 API returned:', apiSettings);
            if (apiSettings && Object.keys(apiSettings).length > 0) {
                settings = { ...defaultSettings, ...apiSettings };
                console.log('📞 Using API settings merged:', settings);
            } else {
                console.log('📞 API returned empty, using defaults');
            }
        }
    } catch (err) {
        console.log('📞 API error, using default contact settings:', err);
        // Fallback to localStorage
        const localSettings = JSON.parse(localStorage.getItem('luyende_contactSettings') || '{}');
        if (Object.keys(localSettings).length > 0) {
            settings = { ...defaultSettings, ...localSettings };
        }
    }

    console.log('📞 Final contact settings:', settings);

    // Update links
    const zaloLink = modal.querySelector('.contact-option.zalo');
    const fbLink = modal.querySelector('.contact-option.facebook');
    const teleLink = modal.querySelector('.contact-option.telegram');

    if (zaloLink) zaloLink.href = settings.zalo;
    if (fbLink) fbLink.href = settings.facebook;
    if (teleLink) teleLink.href = settings.telegram;

    // Reset content to default (Package Registration)
    const header = modal.querySelector('.modal-header h3');
    const desc = modal.querySelector('.modal-body > p');

    if (header) header.innerHTML = '📞 Liên hệ đăng ký gói';
    if (desc) desc.textContent = 'Để đăng ký gói luyện đề này, vui lòng liên hệ admin qua một trong các kênh sau:';

    modal.classList.add('active');
}

// Close contact modal
function closeContactModal() {
    document.getElementById('contactModal').classList.remove('active');
}

// ========== EXAM LIST ==========
async function showExamList(packageId) {
    // Update username display on this screen
    updateUserNameDisplay();

    currentPackageId = packageId;
    // Save to localStorage for page reload
    localStorage.setItem('luyende_currentPackageId', packageId);
    const pkg = examPackages.find(p => (p._id || p.id) === packageId);
    if (!pkg) {
        console.error('Package not found:', packageId);
        return;
    }

    document.getElementById('examListTitle').textContent = pkg.name;
    const grid = document.getElementById('examGrid');

    // Show loading skeleton immediately
    grid.innerHTML = `
        <div class="exam-card skeleton">
            <div class="skeleton-line" style="height: 20px; width: 60%; margin-bottom: 12px;"></div>
            <div class="skeleton-line" style="height: 16px; width: 80%; margin-bottom: 8px;"></div>
            <div class="skeleton-line" style="height: 40px; width: 100%; margin-top: 16px;"></div>
        </div>
        <div class="exam-card skeleton">
            <div class="skeleton-line" style="height: 20px; width: 60%; margin-bottom: 12px;"></div>
            <div class="skeleton-line" style="height: 16px; width: 80%; margin-bottom: 8px;"></div>
            <div class="skeleton-line" style="height: 40px; width: 100%; margin-top: 16px;"></div>
        </div>
        <div class="exam-card skeleton">
            <div class="skeleton-line" style="height: 20px; width: 60%; margin-bottom: 12px;"></div>
            <div class="skeleton-line" style="height: 16px; width: 80%; margin-bottom: 8px;"></div>
            <div class="skeleton-line" style="height: 40px; width: 100%; margin-top: 16px;"></div>
        </div>
    `;
    showScreen('examListScreen');

    // Load exams for this package
    let exams = await loadExamsForPackage(packageId);

    if (!exams || exams.length === 0) {
        grid.innerHTML = '<div class="no-exams">Chưa có đề thi nào trong gói này</div>';
        return;
    }

    // Fetch user's exam history to determine completed exams
    let completedExamIds = new Set();

    // 1. Always check LocalStorage first (Immediate feedback)
    try {
        const localHistory = JSON.parse(localStorage.getItem('luyende_examHistory') || '[]');
        if (localHistory && localHistory.length > 0) {
            localHistory.forEach(h => {
                if (h.examId) completedExamIds.add(h.examId);
            });
        }
    } catch (e) { console.error('Error reading local history:', e); }

    // 2. Try API (Merge)
    try {
        const history = await apiGetHistory();
        if (history && history.length > 0) {
            history.forEach(h => {
                if (h.examId) completedExamIds.add(h.examId);
            });
        }
    } catch (err) {
        console.log('Could not load API history:', err);
    }

    // Sort exams: incomplete FIRST, then by title number (Đề số 1, 2, 3...)
    exams = exams.filter(e => e.status !== 'draft').sort((a, b) => {
        // FIRST: sort by completion status (incomplete FIRST)
        const aCompleted = completedExamIds.has(String(a.id)) || completedExamIds.has(String(a._id));
        const bCompleted = completedExamIds.has(String(b.id)) || completedExamIds.has(String(b._id));
        if (!aCompleted && bCompleted) return -1; // a is NOT completed -> a first
        if (aCompleted && !bCompleted) return 1;  // b is NOT completed -> b first

        // SECOND: within same completion status, sort by title number
        const aNum = parseInt((a.title || '').match(/\d+/)?.[0]) || 999;
        const bNum = parseInt((b.title || '').match(/\d+/)?.[0]) || 999;
        return aNum - bNum;
    });

    grid.innerHTML = exams.map(exam => {
        const isCompleted = completedExamIds.has(String(exam.id)) || completedExamIds.has(String(exam._id));
        const questionCount = exam.questions && exam.questions.length ? exam.questions.length : 22;
        const examDuration = exam.duration || 90;
        const description = exam.description || `Đề thi theo cấu trúc THPT mới - ${questionCount} câu, ${examDuration} phút`;
        const examTag = exam.tag || 'THPT Toán';
        const displayId = exam.displayId || `#${exam.id.slice(-6)}`;

        // Button Logic based on Status
        let actionBtn = `<button class="btn-start-exam" onclick="startExamFromList('${exam.id}')">Bắt đầu làm bài</button>`;
        let statusBadge = '';

        if (exam.status === 'view_only') {
            actionBtn = `<button class="btn-start-exam disabled" disabled>Chỉ xem đề</button>`;
        } else if (exam.status === 'updating') {
            actionBtn = `<button class="btn-start-exam disabled" disabled>Đang cập nhật</button>`;
            statusBadge = `<span class="exam-status-badge updating">Đang cập nhật</span>`;
        } else if (isCompleted) {
            actionBtn = `<button class="btn-start-exam" onclick="startExamFromList('${exam.id}')">Làm lại bài</button>`;
            statusBadge = `<span class="exam-status-badge completed">✓ Đã làm</span>`;
        }

        return `
            <div class="exam-card ${exam.status || ''} ${isCompleted ? 'completed' : ''}">
                <div class="exam-card-header">
                    <span class="exam-tag">${examTag}</span>
                    ${statusBadge}
                    <div class="exam-card-title">${exam.title}</div>
                    <div class="exam-card-desc">${description}</div>
                </div>
                <div class="exam-card-meta">
                    <div class="exam-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                        </svg>
                        ${exam.duration || 90} phút
                    </div>
                    <div class="exam-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        ${exam.questions && exam.questions.length ? exam.questions.length : 22} câu
                    </div>
                </div>
                <div class="exam-card-footer">
                    ${actionBtn}
                </div>
            </div>
        `;
    }).join('');

    // Also render history for this package
    renderHistory(packageId);

    // Reset to "Đề thi" tab (ensure exams are visible, not history)
    const tabBtns = document.querySelectorAll('#examListScreen .tab-btn');
    tabBtns.forEach(btn => btn.classList.remove('active'));
    if (tabBtns[0]) tabBtns[0].classList.add('active'); // First tab = "Đề thi"

    document.getElementById('examsTab')?.classList.add('active');
    document.getElementById('historyTab')?.classList.remove('active');

    showScreen('examListScreen');
}

// Switch between exam tabs (Đề thi / Lịch sử làm bài)
function switchExamTab(tabName) {
    // Update tab buttons
    const tabBtns = document.querySelectorAll('#examListScreen .tab-btn');
    tabBtns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Update tab content
    document.getElementById('examsTab').classList.remove('active');
    document.getElementById('historyTab').classList.remove('active');

    if (tabName === 'exams') {
        document.getElementById('examsTab').classList.add('active');
    } else if (tabName === 'history') {
        document.getElementById('historyTab').classList.add('active');
    }
}

// Render exam history for current package
function renderHistory(packageId) {
    const historyList = document.getElementById('historyList');
    const examHistory = getExamHistory();

    // Filter history for current package ONLY (strict filter - exclude entries without packageId)
    const packageHistory = examHistory
        .map((record, index) => ({ ...record, globalIndex: index })) // Keep track of original index
        .filter(h => h.packageId === packageId)
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort newest first

    if (packageHistory.length === 0) {
        historyList.innerHTML = `
            <div class="history-empty">
                <p>📝 Bạn chưa làm bài thi nào trong gói này.</p>
                <p>Hãy bắt đầu làm bài để xem lịch sử ở đây!</p>
            </div>
        `;
        return;
    }

    historyList.innerHTML = packageHistory.map((record) => {
        const date = new Date(record.date).toLocaleDateString('vi-VN');
        const time = new Date(record.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        return `
            <div class="history-item">
                <div class="history-item-info">
                    <div class="history-item-title">${record.examTitle || 'Đề thi'} <span style="font-size: 11px; color: #888;">(Mã: ${record.displayId || '---'})</span></div>
                    <div class="history-item-meta">
                        <span>📅 ${date} lúc ${time}</span>
                        <span>⏱️ ${record.timeSpent || 'N/A'}</span>
                    </div>
                </div>
                <div class="history-item-score">
                    <span class="score-value">${record.score}/10</span>
                    <span class="score-label">điểm</span>
                </div>
                <button class="btn btn-view-answers" onclick="showAnswerReview(${record.globalIndex})">Xem đáp án</button>
            </div>
        `;
    }).join('');
}

// Show answer review screen
function showAnswerReview(historyIndex) {
    const examHistory = getExamHistory();
    const record = examHistory[historyIndex];

    if (!record) return;

    // Update review header
    document.getElementById('reviewTitle').textContent = record.examTitle || 'Xem đáp án';
    document.getElementById('reviewScore').textContent = `Điểm: ${record.score}/10`;
    document.getElementById('reviewDate').textContent = `Ngày làm: ${new Date(record.date).toLocaleDateString('vi-VN')}`;
    document.getElementById('reviewUserName').textContent = 'Xin chào, ' + (currentUser ? currentUser.name : record.studentName);

    // Render questions with answers - use questions from saved record, not current examData
    const reviewContainer = document.getElementById('reviewQuestions');
    const examId = record.displayId || record.examId || '---';
    const questions = record.questions || examData.questions; // Use saved questions or fallback to current

    reviewContainer.innerHTML = questions.map((question, index) => {
        const userAnswer = record.answers ? record.answers[index] : null;

        if (question.type === 'multiple-choice') {
            return renderMultipleChoiceReview(question, index, userAnswer, examId);
        } else if (question.type === 'true-false') {
            return renderTrueFalseReview(question, index, userAnswer, examId);
        } else if (question.type === 'fill-in-blank') {
            return renderFillInBlankReview(question, index, userAnswer, examId);
        }
        return '';
    }).join('');

    showScreen('answerReviewScreen');

    // Trigger KaTeX rendering
    if (typeof renderMathInElement !== 'undefined') {
        renderMathInElement(document.getElementById('reviewQuestions'), {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: true }
            ],
            throwOnError: false
        });
    }
}

// Render multiple choice review
function renderMultipleChoiceReview(question, index, userAnswer, examId) {
    const isCorrect = userAnswer === question.correctAnswer;
    const statusClass = userAnswer ? (isCorrect ? 'correct' : 'wrong') : 'unanswered';
    const statusIcon = userAnswer ? (isCorrect ? '✓' : '✗') : '○';

    return `
        <div class="review-question ${statusClass}">
            <div class="review-question-header">
                <span class="review-question-number">Câu ${question.id} <span style="font-size: 11px; color: #888; font-weight: normal;">(Mã: ${examId})</span></span>
                <span class="review-status ${statusClass}">${isCorrect ? 'Đúng' : (userAnswer ? 'Sai' : 'Chưa trả lời')}</span>
            </div>
            <div class="review-question-text">${formatMathContent(question.question)}</div>
            <div class="review-options">
                ${question.options.map((opt, i) => {
        const isUserChoice = userAnswer === opt;
        const isCorrectAns = question.correctAnswer === opt;
        let optClass = '';
        if (isCorrectAns) optClass = 'correct-answer';
        else if (isUserChoice && !isCorrectAns) optClass = 'wrong-answer';

        return `<div class="review-option ${optClass}">
                        <span class="option-letter">${String.fromCharCode(65 + i)}.</span>
                        <span class="option-text">${formatMathContent(opt)}</span>
                        ${isCorrectAns ? '<span class="correct-mark">✓ Đáp án đúng</span>' : ''}
                        ${isUserChoice && !isCorrectAns ? '<span class="wrong-mark">✗ Bạn chọn</span>' : ''}
                    </div>`;
    }).join('')}
            </div>
            <div class="review-explanation">
                <strong>Lời giải chi tiết:</strong>
                ${question.explanation ? `<div class="explanation-content">${question.explanation}</div>` : '<div class="explanation-empty">Chưa có lời giải cho câu này.</div>'}
            </div>
        </div>
    `;
}

// Render true-false review
function renderTrueFalseReview(question, index, userAnswers, examId) {
    const correctCount = question.correctAnswers.filter((correct, i) =>
        userAnswers && userAnswers[i] === correct
    ).length;
    const isFullCorrect = correctCount === question.correctAnswers.length;
    const statusClass = correctCount > 0 ? (isFullCorrect ? 'correct' : 'partial') : 'wrong';

    return `
        <div class="review-question ${statusClass}">
            <div class="review-question-header">
                <span class="review-question-number">Câu ${question.id} <span style="font-size: 11px; color: #888; font-weight: normal;">(Mã: ${examId})</span></span>
                <span class="review-status ${statusClass}">${correctCount}/${question.correctAnswers.length} ý đúng</span>
            </div>
            <div class="review-question-text">${formatMathContent(question.question)}</div>
            <div class="review-tf-options">
                ${question.options.map((opt, i) => {
        const userAns = userAnswers ? userAnswers[i] : null;
        const correctAns = question.correctAnswers[i];
        const isCorrect = userAns === correctAns;
        const optClass = userAns ? (isCorrect ? 'correct-answer' : 'wrong-answer') : 'unanswered';

        return `<div class="review-tf-row ${optClass}">
                        <span class="tf-label">${String.fromCharCode(97 + i)})</span>
                        <span class="tf-text">${formatMathContent(opt)}</span>
                        <span class="tf-answer">Bạn: ${userAns || '-'}</span>
                        <span class="tf-correct">Đáp án: ${correctAns}</span>
                        <span class="tf-status">${isCorrect ? '✓' : '✗'}</span>
                    </div>`;
    }).join('')}
            </div>
            <div class="review-explanation">
                <strong>Lời giải chi tiết:</strong>
                ${question.explanation ? `<div class="explanation-content">${question.explanation}</div>` : '<div class="explanation-empty">Chưa có lời giải cho câu này.</div>'}
            </div>
        </div>
    `;
}

// Render fill-in-blank review
function renderFillInBlankReview(question, index, userAnswer, examId) {
    const isCorrect = userAnswer && userAnswer.toString().trim() === question.correctAnswer.toString().trim();
    const statusClass = userAnswer ? (isCorrect ? 'correct' : 'wrong') : 'unanswered';

    return `
        <div class="review-question ${statusClass}">
            <div class="review-question-header">
                <span class="review-question-number">Câu ${question.id} <span style="font-size: 11px; color: #888; font-weight: normal;">(Mã: ${examId})</span></span>
                <span class="review-status ${statusClass}">${isCorrect ? '✓ Đúng' : (userAnswer ? '✗ Sai' : '○ Chưa trả lời')}</span>
            </div>
            <div class="review-question-text">${question.question}</div>
            <div class="review-fill-answer">
                <div class="fill-row">
                    <span class="fill-label">Bạn trả lời:</span>
                    <span class="${userAnswer ? (isCorrect ? 'correct-answer' : 'wrong-answer') : 'unanswered'}">${userAnswer || 'Chưa trả lời'}</span>
                </div>
                <div class="fill-row">
                    <span class="fill-label">Đáp án đúng:</span>
                    <span class="correct-answer">${question.correctAnswer}</span>
                </div>
            </div>
            <div class="review-explanation">
                <strong>Lời giải chi tiết:</strong>
                ${question.explanation ? `<div class="explanation-content">${question.explanation}</div>` : '<div class="explanation-empty">Chưa có lời giải cho câu này.</div>'}
            </div>
        </div>
    `;
}

function startExamFromList(examId) {
    // Update student name from current user
    examData.studentName = currentUser.name;

    // FIND AND SET EXAM TITLE & ID
    if (currentPackageId && examsData[currentPackageId]) {
        // Fix: Check both _id and id for exam lookup
        const exam = examsData[currentPackageId].find(e =>
            (e._id === examId) || (e.id === examId) || (String(e._id) === String(examId))
        );
        if (exam) {
            console.log('📋 Exam data from API:', { title: exam.title, duration: exam.duration, template: exam.template });
            examData.examTitle = exam.title;
            examData.id = exam._id || exam.id;
            examData.duration = exam.duration || 90; // Set exam-specific duration
            examData.template = exam.template || 'thpt_toan'; // Set exam template for scoring

            // Auto-generate numeric displayId if not exists or is text-based
            // Use exam.displayId coming from server (populated from DB) or fallback to ID
            examData.displayId = exam.displayId || exam.id || exam._id;

            // Note: We removed the auto-increment counter logic to ensure we show the real Exam ID set by admin

            // Update question array to match the selected exam
            if (exam.questions && exam.questions.length > 0) {
                examData.questions = exam.questions;
                // Reset/Initialize state for the new exam
                resetExamState();
            } else {
                console.warn('⚠️ No questions found in exam:', examId);
            }
        } else {
            console.error('❌ Exam not found in examsData:', examId, 'Available exams:', examsData[currentPackageId].map(e => ({ _id: e._id, id: e.id })));
        }
    } else {
        console.error('❌ No package data available:', { currentPackageId, hasExamsData: !!examsData[currentPackageId] });
    }

    // Update pre-exam screen info
    document.getElementById('preStudentName').textContent = currentUser.name;
    document.getElementById('preExamTitle').textContent = examData.examTitle;

    // Also update exam screen student name and exam ID
    const sidebarStudentName = document.querySelector('.sidebar-info .info-value');
    if (sidebarStudentName) {
        sidebarStudentName.textContent = currentUser.name;
    }

    // Update exam ID in sidebar (use actual exam ID from admin panel)
    const sidebarExamId = document.getElementById('sidebarExamId');
    if (sidebarExamId && currentPackageId && examsData[currentPackageId]) {
        const exam = examsData[currentPackageId].find(e => (e._id || e.id) === examId);
        if (exam) {
            const displayExamId = exam._id || exam.id || examId;
            sidebarExamId.textContent = `#${displayExamId.toString().slice(-6)}`;
        }
    }

    // Reset loading bar UI for retake
    const loadingContainer = document.getElementById('loadingContainer');
    const loadingProgress = document.getElementById('loadingProgress');
    const startBtn = document.getElementById('startExamBtn');
    if (loadingContainer) loadingContainer.style.display = 'none';
    if (loadingProgress) loadingProgress.style.width = '0%';
    if (startBtn) startBtn.style.display = 'block';

    showScreen('preExamScreen');
}

// Start exam with loading animation
function startExamWithLoading() {
    const loadingContainer = document.getElementById('loadingContainer');
    const loadingProgress = document.getElementById('loadingProgress');
    const startBtn = document.getElementById('startExamBtn');

    // Hide button, show loading
    startBtn.style.display = 'none';
    loadingContainer.style.display = 'block';

    // Animate loading bar
    let progress = 0;
    const loadingInterval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingInterval);

            // After loading complete, start exam
            setTimeout(() => {
                startExam();
            }, 300);
        }
        loadingProgress.style.width = progress + '%';
    }, 150);
}

function viewAnswers(examId) {
    // Find the exam
    let exam = null;
    if (currentPackageId && examsData[currentPackageId]) {
        exam = examsData[currentPackageId].find(e => (e._id || e.id) === examId);
    }

    if (!exam || !exam.questions) {
        alert('Không tìm thấy đáp án cho đề thi này');
        return;
    }

    // Create modal HTML
    const modalHTML = `
        <div class="answer-modal-overlay" id="answerModalOverlay" onclick="closeAnswerModal()">
            <div class="answer-modal" onclick="event.stopPropagation()">
                <div class="answer-modal-header">
                    <h2>Đáp án chi tiết - ${exam.title}</h2>
                    <button class="close-btn" onclick="closeAnswerModal()">✕</button>
                </div>
                <div class="answer-modal-body" id="answerModalBody">
                    ${exam.questions.map((q, idx) => `
                        <div class="answer-item">
                            <div class="answer-question">
                                <strong>Câu ${q.id || idx + 1}:</strong> ${formatMathContent(q.question)}
                            </div>
                            <div class="answer-options">
                                ${q.type === 'multiple-choice' || q.type === 'true-false' ?
            q.options.map((opt, i) => `
                                        <div class="answer-option ${isCorrectAnswer(q, opt) ? 'correct' : ''}">
                                            <span class="option-label">${String.fromCharCode(65 + i)}.</span>
                                            <span class="option-text">${formatMathContent(opt)}</span>
                                            ${isCorrectAnswer(q, opt) ? '<span class="check-mark">✓</span>' : ''}
                                        </div>
                                    `).join('')
            :
            `<div class="answer-option correct">
                                        <strong>Đáp án:</strong> ${q.correctAnswer || q.correctAnswers}
                                    </div>`
        }
                            </div>
                            ${q.explanation ? `<div class="answer-explanation">
                                <strong>Giải thích:</strong> ${q.explanation}
                            </div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existing = document.getElementById('answerModalOverlay');
    if (existing) existing.remove();

    // Add to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Trigger MathJax rendering if available
    // Trigger KaTeX rendering if available
    if (typeof renderMathInElement !== 'undefined') {
        renderMathInElement(document.getElementById('answerModalBody'), {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: true }
            ],
            throwOnError: false
        });
    }
}

// Helper to check if option is correct answer
function isCorrectAnswer(question, option) {
    if (question.type === 'true-false') {
        const optIndex = question.options.indexOf(option);
        return question.correctAnswers && question.correctAnswers[optIndex];
    }
    return question.correctAnswer === option;
}

// Close answer modal
function closeAnswerModal() {
    const modal = document.getElementById('answerModalOverlay');
    if (modal) modal.remove();
}

// NOTE: DOMContentLoaded and backToExamList are defined at end of file
// Network status listeners are also set up there

// Helper to format Latex content
function formatMathContent(text) {
    if (text === null || text === undefined) return '';
    if (typeof text !== 'string') text = String(text);
    // Fix: Convert $...$ to \(...\) to ensure KaTeX renders it
    let formatted = text
        .replace(/\$\$([\s\S]+?)\$\$/g, '\\[$1\\]') // Display math
        .replace(/\$([\s\S]+?)\$/g, '\\($1\\)');   // Inline math

    return formatted
        .replace(/\\frac/g, '\\dfrac')
        .replace(/\\vec/g, '\\overrightarrow')
        .replace(/\\lim\s*_/g, '\\lim\\limits_');
}

// Update connection status indicator
function updateConnectionStatus() {
    const statusDot = document.getElementById('statusDot');
    const connectionText = document.getElementById('connectionText');

    if (navigator.onLine) {
        if (statusDot) {
            statusDot.style.background = '#4CAF50';
        }
        if (connectionText) {
            connectionText.textContent = 'Đã kết nối máy chủ';
            connectionText.style.color = '';
        }
    } else {
        if (statusDot) {
            statusDot.style.background = '#ef4444';
        }
        if (connectionText) {
            connectionText.textContent = 'Mất kết nối đến máy chủ';
            connectionText.style.color = '#ef4444';
        }
    }
}

// Toggle sidebar for mobile
function toggleSidebar() {
    const sidebar = document.getElementById('examSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburgerBtn');

    if (sidebar) {
        sidebar.classList.toggle('sidebar-open');
    }
    if (overlay) {
        overlay.classList.toggle('active');
    }
    if (hamburger) {
        hamburger.classList.toggle('active');
    }
}

// Exam Data - THPT Toán Format (22 questions)
if (typeof examData === 'undefined') var examData = {
    studentName: "PHẠM ĐỨC THẮNG",
    studentId: "SV001",
    examTitle: "đề số 1 khóa TSA",
    examType: "THPT_MATH",
    duration: 90,
    questions: [
        // PHẦN I: TRẮC NGHIỆM (câu 1-12)
        { id: 1, question: "Cho hàm số f(x) = 2x + 3. Giá trị của f(2) bằng:", type: "multiple-choice", options: ["5", "7", "9", "11"], correctAnswer: "7" },
        { id: 2, question: "Phương trình x² - 5x + 6 = 0 có nghiệm là:", type: "multiple-choice", options: ["x = 1 hoặc x = 6", "x = 2 hoặc x = 3", "x = -2 hoặc x = -3", "Vô nghiệm"], correctAnswer: "x = 2 hoặc x = 3" },
        { id: 3, question: "Diện tích hình tròn bán kính r = 5cm là:", type: "multiple-choice", options: ["25π cm²", "10π cm²", "50π cm²", "100π cm²"], correctAnswer: "25π cm²" },
        { id: 4, question: "Giới hạn lim(x→∞) (3x + 1)/(x - 2) bằng:", type: "multiple-choice", options: ["0", "1", "3", "∞"], correctAnswer: "3" },
        { id: 5, question: "Trong không gian Oxyz, cho vector a = (1, 2, 3). Độ dài của vector a là:", type: "multiple-choice", options: ["√6", "√14", "6", "14"], correctAnswer: "√14" },
        { id: 6, question: "Tích phân ∫₀¹ x dx bằng:", type: "multiple-choice", options: ["1/4", "1/3", "1/2", "1"], correctAnswer: "1/2" },
        { id: 7, question: "Đạo hàm của hàm số y = x³ - 3x + 2 tại x = 1 bằng:", type: "multiple-choice", options: ["0", "1", "2", "3"], correctAnswer: "0" },
        { id: 8, question: "Số nghiệm của phương trình sin(x) = 1/2 trong [0, 2π] là:", type: "multiple-choice", options: ["1", "2", "3", "4"], correctAnswer: "2" },
        { id: 9, question: "Cho cấp số cộng có u₁ = 3, d = 2. Số hạng u₁₀ bằng:", type: "multiple-choice", options: ["19", "21", "23", "25"], correctAnswer: "21" },
        { id: 10, question: "Logarit cơ số 2 của 8 bằng:", type: "multiple-choice", options: ["2", "3", "4", "8"], correctAnswer: "3" },
        { id: 11, question: "Phương trình mặt cầu tâm O(0,0,0) bán kính r = 3 là:", type: "multiple-choice", options: ["x² + y² + z² = 3", "x² + y² + z² = 9", "x + y + z = 3", "x + y + z = 9"], correctAnswer: "x² + y² + z² = 9" },
        { id: 12, question: "Số cách chọn 3 học sinh từ nhóm 5 học sinh là:", type: "multiple-choice", options: ["10", "15", "20", "60"], correctAnswer: "10" },
        // PHẦN II: ĐÚNG/SAI (câu 13-16)
        { id: 13, question: "Xét tính đúng sai của các mệnh đề về đạo hàm:", type: "true-false", options: ["Đạo hàm của y = x² là y' = 2x", "Đạo hàm của y = sin(x) là y' = cos(x)", "Đạo hàm của y = eˣ là y' = xeˣ⁻¹", "Đạo hàm của y = ln(x) là y' = 1/x"], correctAnswers: ["Đúng", "Đúng", "Sai", "Đúng"] },
        { id: 14, question: "Xét tính đúng sai của các phát biểu về hình học:", type: "true-false", options: ["Đa giác đều n cạnh có n trục đối xứng", "Hai đường tròn phân biệt có tối đa 2 trục đối xứng", "Tam giác đều có 3 trục đối xứng", "Hình vuông có 4 trục đối xứng"], correctAnswers: ["Đúng", "Sai", "Đúng", "Đúng"] },
        { id: 15, question: "Xét tính đúng sai của các mệnh đề về giới hạn:", type: "true-false", options: ["lim(x→0) sin(x)/x = 1", "lim(x→∞) 1/x = 0", "lim(x→0) (1-cos(x))/x² = 1/2", "lim(x→∞) (1 + 1/x)ˣ = e"], correctAnswers: ["Đúng", "Đúng", "Đúng", "Đúng"] },
        { id: 16, question: "Xét tính đúng sai của các phát biểu về tích phân:", type: "true-false", options: ["∫ x dx = x²/2 + C", "∫ eˣ dx = eˣ + C", "∫ 1/x dx = ln|x| + C", "∫ cos(x) dx = -sin(x) + C"], correctAnswers: ["Đúng", "Đúng", "Đúng", "Sai"] },
        // PHẦN III: ĐIỀN KHUYẾT (câu 17-22)
        { id: 17, question: "Cho hàm số f(x) = x³ - 3x² + 2. Giá trị cực đại của hàm số là", type: "fill-in-blank", correctAnswer: "2" },
        { id: 18, question: "Phương trình 2ˣ = 8 có nghiệm x =", type: "fill-in-blank", correctAnswer: "3" },
        { id: 19, question: "Cho cấp số nhân có u₁ = 2, q = 3. Tổng S₃ =", type: "fill-in-blank", correctAnswer: "26" },
        { id: 20, question: "Diện tích tam giác có 3 cạnh 3, 4, 5 bằng", type: "fill-in-blank", correctAnswer: "6" },
        { id: 21, question: "Số hoán vị của 4 phần tử là", type: "fill-in-blank", correctAnswer: "24" },
        { id: 22, question: "Thể tích hình cầu bán kính r = 3 (tính theo π) là", type: "fill-in-blank", correctAnswer: "36π" }
    ]
};

// State Management
if (typeof currentQuestionIndex === 'undefined') var currentQuestionIndex = 0;
if (typeof userAnswers === 'undefined') var userAnswers = new Array(examData.questions.length).fill(null);
if (typeof flaggedQuestions === 'undefined') var flaggedQuestions = new Set();
if (typeof timeRemaining === 'undefined') var timeRemaining = examData.duration * 60; // in seconds
if (typeof timerInterval === 'undefined') var timerInterval = null;
if (typeof examStartTime === 'undefined') var examStartTime = null;
if (typeof questionStartTime === 'undefined') var questionStartTime = Date.now();

// Initialize
function init() {
    // Set student names - with null checks since these elements may not exist on all screens
    const preStudentName = document.getElementById('preStudentName');
    const headerStudentName = document.getElementById('headerStudentName');
    const sidebarStudentName = document.getElementById('sidebarStudentName');
    const resultStudentName = document.getElementById('resultStudentName');

    if (preStudentName) preStudentName.textContent = examData.studentName;
    if (headerStudentName) headerStudentName.textContent = examData.studentName;
    if (sidebarStudentName) sidebarStudentName.textContent = currentUser?.name || examData.studentName;
    if (resultStudentName) resultStudentName.textContent = currentUser?.name || examData.studentName;

    // Set exam ID if available
    const sidebarExamId = document.getElementById('sidebarExamId');
    if (sidebarExamId && (examData.displayId || examData.id)) {
        const displayId = examData.displayId || examData.id;
        sidebarExamId.textContent = `#${displayId}`;
    }
}

// Start Exam
function startExam(isResume = false) {
    if (!isResume) isExamSubmitted = false; // Reset submission flag

    // Set zoom to 100%
    document.body.style.zoom = '100%';

    // Enable exam security
    enableExamSecurity();

    // Request fullscreen
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { // Safari
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { // IE11
        elem.msRequestFullscreen();
    }

    document.getElementById('preExamScreen').classList.remove('active');
    document.getElementById('examScreen').classList.add('active');

    // Update exam title in header (no ID here)
    const headerTitle = document.getElementById('examTitleHeader');
    if (headerTitle) {
        headerTitle.textContent = examData.examTitle;
    }

    // Update sidebar Exam ID ("Mã phòng thi") - only show numeric IDs
    const sidebarExamId = document.getElementById('sidebarExamId');
    if (sidebarExamId) {
        const idToShow = examData.displayId || examData.id || '';
        // Only show if it's a numeric ID (new format)
        sidebarExamId.textContent = /^\d+$/.test(idToShow) ? idToShow : '---';
    }

    // Update sidebar Student Name
    const sidebarStudentName = document.getElementById('sidebarStudentName');
    if (sidebarStudentName && currentUser) {
        sidebarStudentName.textContent = currentUser.name.toUpperCase();
    }

    examStartTime = Date.now();
    generateQuestionGrid();
    displayQuestion(0);

    // CRITICAL FIX: Reset timeRemaining to actual exam duration before starting timer
    if (!isResume) timeRemaining = examData.duration * 60;
    console.log('📌 Starting exam with duration:', examData.duration, 'minutes, timeRemaining:', timeRemaining, 'seconds');

    startTimer();
}

// ========== EXAM SECURITY ==========
if (typeof examSecurityEnabled === 'undefined') var examSecurityEnabled = false;

function enableExamSecurity() {
    examSecurityEnabled = true;

    // Block right-click
    document.addEventListener('contextmenu', blockContextMenu);

    // Block F12 and other dev tools shortcuts
    document.addEventListener('keydown', blockDevTools);
}

function disableExamSecurity() {
    examSecurityEnabled = false;

    // Remove right-click block
    document.removeEventListener('contextmenu', blockContextMenu);

    // Remove dev tools block
    document.removeEventListener('keydown', blockDevTools);
}

function blockContextMenu(e) {
    if (examSecurityEnabled) {
        e.preventDefault();
        return false;
    }
}

function blockDevTools(e) {
    if (!examSecurityEnabled) return;

    // Block F12
    if (e.key === 'F12') {
        e.preventDefault();
        return false;
    }
    // Block Ctrl+Shift+I (Dev Tools)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
    }
    // Block Ctrl+Shift+C (Inspect)
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
    }
    // Block Ctrl+U (View Source)
    if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
    }
}

// Timer
function startTimer() {
    console.log('⏱️ Starting timer. Remaining:', timeRemaining);
    if (timerInterval) clearInterval(timerInterval);

    updateTimerDisplay();
    updateQuestionTimer();

    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        updateQuestionTimer();

        if (timeRemaining <= 0) {
            // Clear saved state
            localStorage.removeItem('luyende_activeExamState');

            // Stop timer
            if (timerInterval) clearInterval(timerInterval);
            submitExam();
            return;
        }

        // Save state periodically (every 5 seconds)
        if (timeRemaining % 5 === 0) {
            saveExamState();
        }
    }, 1000);
}

function updateQuestionTimer() {
    const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')} `;
    document.getElementById('questionTime').textContent = timeString;
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} `;

    const timerElement = document.getElementById('timerSidebar');
    if (timerElement) {
        timerElement.textContent = timeString;
    }
}

// Generate Question Grid with THPT sections
function generateQuestionGrid() {
    const grid = document.getElementById('questionGrid');
    grid.innerHTML = '';

    // define sections based on template
    let sections = [];
    if (examData.template === 'khtn_khxh') {
        sections = [
            { title: 'I. Trắc nghiệm', start: 1, end: 18 },
            { title: 'II. Đúng / Sai', start: 19, end: 22 },
            { title: 'III. Trả lời ngắn', start: 23, end: 28 }
        ];
    } else {
        // Default THPT Math
        sections = [
            { title: 'I. Trắc nghiệm', start: 1, end: 12 },
            { title: 'II. Đúng / Sai', start: 13, end: 16 },
            { title: 'III. Trả lời ngắn', start: 17, end: 22 }
        ];
    }

    sections.forEach(section => {
        // Add section header
        const header = document.createElement('div');
        header.className = 'grid-section-header';
        header.textContent = section.title;
        grid.appendChild(header);

        // Add section grid container
        const sectionGrid = document.createElement('div');
        sectionGrid.className = 'grid-section-items';

        // Add question items for this section
        for (let id = section.start; id <= section.end; id++) {
            const questionIndex = examData.questions.findIndex(q => q.id === id);
            if (questionIndex !== -1) {
                const item = document.createElement('div');
                item.className = 'grid-item';
                item.textContent = id;
                item.onclick = () => jumpToQuestion(questionIndex);
                sectionGrid.appendChild(item);
            }
        }

        grid.appendChild(sectionGrid);
    });
}

// Display Question
function displayQuestion(index) {
    currentQuestionIndex = index;
    const question = examData.questions[index];

    // Reset question timer
    questionStartTime = Date.now();

    // Update question number and text
    document.getElementById('questionNumber').textContent = `${question.id} `;
    // Update question number and text
    document.getElementById('questionNumber').textContent = `${question.id} `;
    // Format Latex content before setting innerHTML
    document.getElementById('questionText').innerHTML = formatMathContent(question.question);

    // Update flag button
    const flagBtn = document.getElementById('flagBtn');
    if (flaggedQuestions.has(index)) {
        flagBtn.classList.add('active');
    } else {
        flagBtn.classList.remove('active');
    }

    // Display answers based on question type
    const answersContainer = document.getElementById('answersContainer');
    answersContainer.innerHTML = '';

    if (question.type === 'true-false') {
        // Create table-like layout with border
        const tfContainer = document.createElement('div');
        tfContainer.className = 'tf-container';

        // Header row
        const headerRow = document.createElement('div');
        headerRow.className = 'tf-header';
        headerRow.innerHTML = `
        <div class="tf-header-text"></div>
            <div class="tf-header-option">Đúng</div>
            <div class="tf-header-option">Sai</div>
    `;
        tfContainer.appendChild(headerRow);

        // Statement rows (a, b, c, d for THPT)
        const labels = ['a)', 'b)', 'c)', 'd)'];
        question.options.forEach((option, i) => {
            const row = document.createElement('div');
            row.className = 'tf-row';

            const text = document.createElement('div');
            text.className = 'tf-text';
            text.innerHTML = `<span class="tf-label">${labels[i] || ''}</span> ${formatMathContent(option)} `;

            const trueOption = document.createElement('div');
            trueOption.className = 'tf-option';
            trueOption.innerHTML = `
        <input type="radio"
    id="q${index}_o${i}_true"
    name="q${index}_o${i}"
    value="Đúng"
                       ${userAnswers[index]?.[i] === 'Đúng' ? 'checked' : ''}
    onchange="selectAnswer(${index}, ${i}, 'Đúng')">
        `;

            const falseOption = document.createElement('div');
            falseOption.className = 'tf-option';
            falseOption.innerHTML = `
        <input type="radio"
    id="q${index}_o${i}_false"
    name="q${index}_o${i}"
    value="Sai"
                       ${userAnswers[index]?.[i] === 'Sai' ? 'checked' : ''}
    onchange="selectAnswer(${index}, ${i}, 'Sai'); saveExamState()">
        `;

            row.appendChild(text);
            row.appendChild(trueOption);
            row.appendChild(falseOption);
            tfContainer.appendChild(row);
        });

        answersContainer.appendChild(tfContainer);
    } else if (question.type === 'fill-in-blank') {
        // Fill-in-blank question type
        const fillContainer = document.createElement('div');
        fillContainer.className = 'fill-container';

        fillContainer.innerHTML = `
        <div class="fill-answer-row">
                <span class="fill-label">Đáp án:</span>
                <input type="text" 
                       class="fill-input" 
                       id="fillInput_${index}"
                       value="${userAnswers[index] || ''}"
                       oninput="selectAnswer(${index}, null, this.value); saveExamState()">
                <span class="fill-period">.</span>
            </div>
    `;

        answersContainer.appendChild(fillContainer);
    } else {
        question.options.forEach((option, i) => {
            const row = document.createElement('div');
            row.className = 'mc-row'; // Removed answer-row to fix grid spacing

            const radioContainer = document.createElement('div');
            radioContainer.className = 'mc-radio'; // Removed answer-option to fix unwanted box styling

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.id = `q${index}_o${i}`;
            radio.name = `q${index}`;
            radio.value = i;

            // Set checked BEFORE appending
            if (userAnswers[index] === option) {
                radio.checked = true;
            }

            // Add event listener
            radio.addEventListener('change', () => {
                selectAnswer(index, null, option);
                saveExamState();
            });

            radioContainer.appendChild(radio);

            const text = document.createElement('div');
            text.className = 'answer-text mc-text';
            text.innerHTML = formatMathContent(option);

            row.appendChild(radioContainer);
            row.appendChild(text);
            answersContainer.appendChild(row); // Fixed: ensure row is appended
        });
    }

    // Update navigation buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    // Prev button: disabled at question 1, active (blue) at other questions
    prevBtn.disabled = index === 0;
    if (index === 0) {
        prevBtn.classList.remove('active');
    } else {
        prevBtn.classList.add('active');
    }

    // Next button text
    const arrowSvg = '<svg width="16" height="16" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-left: 4px;"><path d="M4 2L8 6L4 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    nextBtn.innerHTML = index === examData.questions.length - 1 ? 'Hoàn thành' : 'Câu tiếp ' + arrowSvg;

    // Next button: muted if current question not answered, bold if answered
    const isCurrentAnswered = userAnswers[index] !== null &&
        (Array.isArray(userAnswers[index]) ? userAnswers[index].some(a => a !== null) : true);

    if (isCurrentAnswered) {
        nextBtn.classList.remove('muted');
        nextBtn.classList.add('filled');
    } else {
        nextBtn.classList.add('muted');
        nextBtn.classList.remove('filled');
    }

    // Update grid
    updateQuestionGrid();

    // Render KaTeX in content
    if (typeof renderMathInElement !== 'undefined') {
        const renderOptions = {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: true }
            ],
            throwOnError: false
        };

        // Render Question Text
        const qText = document.getElementById('questionText');
        if (qText) renderMathInElement(qText, renderOptions);

        // Render Answers
        const ansContainer = document.getElementById('answersContainer');
        if (ansContainer) renderMathInElement(ansContainer, renderOptions);
    }



    // Update answered count
    if (typeof updateAnsweredCount === 'function') updateAnsweredCount();
}

// Select Answer
function selectAnswer(questionIndex, optionIndex, value) {
    if (examData.questions[questionIndex].type === 'true-false') {
        if (!userAnswers[questionIndex]) {
            userAnswers[questionIndex] = new Array(examData.questions[questionIndex].options.length).fill(null);
        }
        userAnswers[questionIndex][optionIndex] = value;
    } else {
        userAnswers[questionIndex] = value;
    }

    updateQuestionGrid();
    updateAnsweredCount();


    // Update next button state
    updateNextButtonState();
}

// Update Next Button State


// Navigate Question
function navigateQuestion(direction) {
    const newIndex = currentQuestionIndex + direction;
    if (newIndex >= 0 && newIndex < examData.questions.length) {
        // Show loading animation for next button
        if (direction === 1) {
            showNavigationLoading();
            setTimeout(() => {
                hideNavigationLoading();
                displayQuestion(newIndex);
            }, 200); // Brief loading effect
        } else {
            displayQuestion(newIndex);
        }
    }
}

// Show Navigation Loading State
function showNavigationLoading() {
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');

    // Add loading class to buttons
    nextBtn.classList.add('loading');
    prevBtn.classList.add('loading');
    prevBtn.classList.remove('active');

    // Store original text and add spinner on the LEFT
    nextBtn.dataset.originalText = nextBtn.textContent;
    nextBtn.innerHTML = '<span class="btn-spinner"></span> Câu tiếp <svg width="16" height="16" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-left: 4px;"><path d="M4 2L8 6L4 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

// Hide Navigation Loading State
function hideNavigationLoading() {
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');

    // Remove loading class
    nextBtn.classList.remove('loading');
    prevBtn.classList.remove('loading');

    // Restore original text (will be updated by displayQuestion)
}

// Jump to Question
function jumpToQuestion(index) {
    displayQuestion(index);
    scrollToGridItem(index);

    // Close sidebar on mobile after selecting question
    const sidebar = document.getElementById('examSidebar');
    if (sidebar && sidebar.classList.contains('sidebar-open')) {
        toggleSidebar();
    }
}

// Scroll grid to show selected question
function scrollToGridItem(index) {
    const gridWrapper = document.getElementById('gridScrollWrapper');
    const gridItems = document.querySelectorAll('.grid-item');
    const colorIndicators = gridWrapper?.querySelector('.color-indicators');

    if (gridWrapper && gridItems[index]) {
        const item = gridItems[index];

        // Get the row of the current item (6 items per row)
        const itemsPerRow = 6;
        const currentRow = Math.floor(index / itemsPerRow);

        // Calculate scroll position - push row to TOP, hide rows above
        const itemHeight = item.offsetHeight + 10; // item height + gap
        const indicatorHeight = colorIndicators?.offsetHeight || 0;

        // Scroll to hide color indicators AND previous rows
        const scrollTo = (currentRow * itemHeight) + indicatorHeight;

        gridWrapper.scrollTo({
            top: Math.max(0, scrollTo),
            behavior: 'smooth'
        });
    }
}

// Toggle Flag
function toggleFlag() {
    if (flaggedQuestions.has(currentQuestionIndex)) {
        flaggedQuestions.delete(currentQuestionIndex);
        document.getElementById('flagBtn').classList.remove('active');
    } else {
        flaggedQuestions.add(currentQuestionIndex);
        document.getElementById('flagBtn').classList.add('active');
    }
    updateQuestionGrid();
    updateAnsweredCount(); // Update flagged badge count
}

// Update Question Grid
function updateQuestionGrid() {
    const gridItems = document.querySelectorAll('.grid-item');
    gridItems.forEach((item, index) => {
        item.className = 'grid-item';

        // Check if answered
        const isAnswered = userAnswers[index] !== null &&
            (Array.isArray(userAnswers[index]) ? userAnswers[index].some(a => a !== null) : true);

        if (index === currentQuestionIndex) {
            item.classList.add('current');
        } else if (isAnswered) {
            item.classList.add('answered');
        }

        if (flaggedQuestions.has(index)) {
            item.classList.add('flagged');
        }
    });
}

// Update Answered Count
function updateAnsweredCount() {
    const answeredCount = userAnswers.filter(answer => {
        if (Array.isArray(answer)) {
            return answer.some(a => a !== null);
        }
        return answer !== null;
    }).length;

    const totalQuestions = examData.questions.length;
    const unansweredCount = totalQuestions - answeredCount;
    const flaggedCount = flaggedQuestions.size;

    // Update answered count display - with null checks
    const answeredCountEl = document.getElementById('answeredCount');
    const modalAnsweredCountEl = document.getElementById('modalAnsweredCount');

    if (answeredCountEl) answeredCountEl.textContent = answeredCount;
    if (modalAnsweredCountEl) modalAnsweredCountEl.textContent = answeredCount;

    // Update color indicator badges
    const unansweredBadge = document.getElementById('unansweredCount');
    const answeredBadge = document.getElementById('answeredBadge');
    const flaggedBadge = document.getElementById('flaggedBadge');

    if (unansweredBadge) unansweredBadge.textContent = unansweredCount;
    if (answeredBadge) answeredBadge.textContent = answeredCount;
    if (flaggedBadge) flaggedBadge.textContent = flaggedCount;

    // Update progress bar - with null checks
    const percentage = Math.round((answeredCount / totalQuestions) * 100);
    const progressFill = document.getElementById('progressFill');
    const progressPercentage = document.getElementById('progressPercentage');

    if (progressFill) progressFill.style.width = percentage + '%';
    if (progressPercentage) progressPercentage.textContent = percentage + '%';

    // Update Next button state (Hoàn thành when all answered)
    updateNextButtonState();
}

// Update Next Button State - Show "Hoàn thành" only on last question
function updateNextButtonState() {
    const nextBtn = document.getElementById('nextBtn');
    if (!nextBtn || !examData) return;

    const isLastQuestion = currentQuestionIndex === examData.questions.length - 1;

    // Toggle filled style if current question is answered
    const isCurrentAnswered = userAnswers[currentQuestionIndex] !== null &&
        (Array.isArray(userAnswers[currentQuestionIndex]) ? userAnswers[currentQuestionIndex].some(a => a !== null) : true);

    // Debug log
    console.log(`Q${currentQuestionIndex} Answered?`, isCurrentAnswered, userAnswers[currentQuestionIndex]);


    if (isCurrentAnswered) {
        nextBtn.classList.add('filled');
        nextBtn.classList.remove('muted');
    } else {
        nextBtn.classList.remove('filled');
        nextBtn.classList.add('muted');
    }

    const answeredCount = userAnswers.filter(answer => {
        if (Array.isArray(answer)) {
            return answer.some(a => a !== null);
        }
        return answer !== null;
    }).length;

    const totalQuestions = examData.questions.length;
    const allAnswered = answeredCount === totalQuestions;

    if (isLastQuestion) {
        // On last question - show "Hoàn thành" button
        nextBtn.innerHTML = `Hoàn thành <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-left: 4px;">
            <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
        nextBtn.classList.add('complete-mode');
        nextBtn.onclick = function () { confirmSubmit(); };

        // Highlight the button when all questions are answered
        if (allAnswered) {
            nextBtn.classList.add('all-answered');
            nextBtn.classList.remove('not-complete');
        } else {
            nextBtn.classList.remove('all-answered');
            nextBtn.classList.add('not-complete');
        }
    } else {
        // Not on last question - show "Câu tiếp" button
        nextBtn.innerHTML = `Câu tiếp <svg width="16" height="16" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-left: 4px;">
            <path d="M4 2L8 6L4 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
        nextBtn.classList.remove('complete-mode', 'all-answered', 'not-complete');
        nextBtn.onclick = function () { navigateQuestion(1); };
    }
}

// Confirm Submit
function confirmSubmit() {
    updateAnsweredCount();
    const answeredCount = userAnswers.filter(answer => {
        if (Array.isArray(answer)) {
            return answer.some(a => a !== null);
        }
        return answer !== null;
    }).length;
    const totalQuestions = examData.questions.length;

    // Update modal progress - with null checks
    const modalProgressText = document.getElementById('modalProgressText');
    const modalAnsweredCount = document.getElementById('modalAnsweredCount');

    if (modalProgressText) modalProgressText.textContent = answeredCount + '/' + totalQuestions;
    if (modalAnsweredCount) modalAnsweredCount.textContent = answeredCount;

    // Update question count in modal text
    const modalMessage = document.querySelector('.modal-message');
    if (modalMessage) {
        modalMessage.innerHTML = `Đã trả lời <span id="modalAnsweredCount">${answeredCount}</span>/${totalQuestions} câu. Bạn vẫn còn thời gian làm bài, bạn có chắc chắn muốn kết thúc bài thi.`;
    }

    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) confirmModal.classList.add('active');
}

// Close Modal
function closeModal() {
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) confirmModal.classList.remove('active');
}

// Submit Exam
function submitExam() {
    console.log('📝 Submitting exam...');
    isExamSubmitted = true; // Block auto-save immediately

    // Force clear state
    localStorage.removeItem('luyende_activeExamState');

    try {
        if (timerInterval) clearInterval(timerInterval);
        closeModal();

        // Calculate score based on exam template
        // THPT Toán: 12 MC (0.25đ) + 4 TF (lũy tiến) + 6 Fill (0.5đ) = 10đ
        // KHTN/KHXH: 18 MC (0.25đ) + 4 TF (lũy tiến) + 6 Fill (0.25đ) = 10đ

        const template = examData.template || 'thpt_toan';
        const fillScore = template === 'khtn_khxh' ? 0.25 : 0.5; // 0.25đ for KHTN, 0.5đ for THPT

        let totalScore = 0;
        let correctCountMC = 0;
        let correctCountTF = 0;
        let correctCountFill = 0;

        examData.questions.forEach((question, index) => {
            if (question.type === 'multiple-choice') {
                // Multiple choice - 0.25 points each (both templates)
                if (userAnswers[index] === question.correctAnswer) {
                    totalScore += 0.25;
                    correctCountMC++;
                }
            } else if (question.type === 'true-false') {
                // True/False - Progressive scoring (same for both templates)
                if (userAnswers[index] && Array.isArray(userAnswers[index])) {
                    let correctInQuestion = 0;
                    question.correctAnswers.forEach((correct, i) => {
                        if (userAnswers[index][i] === correct) {
                            correctInQuestion++;
                        }
                    });

                    // Progressive scoring based on number of correct answers
                    if (correctInQuestion === 1) {
                        totalScore += 0.1;
                    } else if (correctInQuestion === 2) {
                        totalScore += 0.25;
                    } else if (correctInQuestion === 3) {
                        totalScore += 0.5;
                    } else if (correctInQuestion === 4) {
                        totalScore += 1.0;
                    }

                    if (correctInQuestion > 0) correctCountTF++;
                }
            } else if (question.type === 'fill-in-blank') {
                // Fill-in-blank - score varies by template
                if (userAnswers[index] && userAnswers[index].toString().trim() === question.correctAnswer.toString().trim()) {
                    totalScore += fillScore;
                    correctCountFill++;
                }
            }
        });

        // Round to 2 decimal places
        const score = totalScore.toFixed(2);
        const totalCorrect = correctCountMC + correctCountTF + correctCountFill;

        // Calculate actual time spent
        const timeSpent = Math.floor((Date.now() - examStartTime) / 1000);
        const hours = Math.floor(timeSpent / 3600);
        const minutes = Math.floor((timeSpent % 3600) / 60);
        const seconds = timeSpent % 60;
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} `;

        // Save exam result to localStorage
        saveExamResult({
            examId: examData.id,
            displayId: examData.displayId,
            packageId: currentPackageId,
            examTitle: examData.examTitle,
            studentName: currentUser ? currentUser.name : examData.studentName,
            score: score,
            correctCount: totalCorrect,
            totalQuestions: examData.questions.length,
            timeSpent: timeString,
            answers: userAnswers.slice(), // Copy of answers
            questions: examData.questions, // Save questions for review
            date: new Date().toISOString()
        });

        // Save to Server API (MongoDB)
        try {
            const resultData = {
                odl: examData.displayId || examData.id, // Use display ID or real ID
                examId: examData.id,
                packageId: currentPackageId,
                examTitle: examData.examTitle,
                score: score,
                correct: totalCorrect,
                total: examData.questions.length,
                actualTime: timeString,
                answers: userAnswers,
                date: new Date()
            };
            // Call API
            apiSaveResult(resultData).then(res => {
                console.log('Result saved to server:', res);
            }).catch(err => {
                console.error('Failed to save result to server:', err);
                // We could queue this for retry later if offline
            });
        } catch (err) {
            console.error('Error preparing result for server:', err);
        }

        // Display results - with null checks
        const correctAnswersEl = document.getElementById('correctAnswers');
        const finalScoreEl = document.getElementById('finalScore');
        const actualTimeEl = document.getElementById('actualTime');

        if (correctAnswersEl) correctAnswersEl.textContent = totalCorrect;
        if (finalScoreEl) finalScoreEl.textContent = `${score}/10`;
        if (actualTimeEl) actualTimeEl.textContent = timeString;

        // Update total questions count in result - with null check
        const correctAnswersSpan = document.querySelector('.info-value span#correctAnswers');
        const resultTotalQuestions = correctAnswersSpan ? correctAnswersSpan.parentNode : null;
        if (resultTotalQuestions) {
            resultTotalQuestions.innerHTML = `<span id="correctAnswers">${totalCorrect}</span>/${examData.questions.length}`;
        }

        // Update exam duration in result
        const durationRow = document.querySelectorAll('.info-row')[2]; // Assuming 3rd row is Duration
        if (durationRow) {
            const durationValue = durationRow.querySelector('.info-value');
            if (durationValue) {
                durationValue.textContent = `${examData.duration} phút`;
            }
        }

        // Update exam title in result
        const resultExamTitle = document.getElementById('resultExamTitle');
        if (resultExamTitle) {
            resultExamTitle.textContent = examData.examTitle;
        }

        // Update result screen student name
        const resultStudentName = document.getElementById('resultStudentName');
        if (resultStudentName && currentUser) {
            resultStudentName.textContent = currentUser.name;
        }

        // Reset exam state for next attempt
        resetExamState();

        // Disable exam security and reset zoom
        disableExamSecurity();
        document.body.style.zoom = '';

        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }

        // Switch to result screen
        document.getElementById('examScreen').classList.remove('active');
        document.getElementById('resultScreen').classList.add('active');
    } catch (err) {
        console.error('❌ Error submitting exam:', err);
        alert('Có lỗi xảy ra khi nộp bài: ' + err.message + '\nVui lòng thử lại hoặc chụp ảnh màn hình gửi admin.');
    }
}

// Save exam result to localStorage
function saveExamResult(result) {
    try {
        let examHistory = JSON.parse(localStorage.getItem('luyende_examHistory') || '[]');

        // Add new result
        examHistory.push(result);

        // Auto-cleanup: Keep only the 10 most recent entries
        const MAX_HISTORY = 10;
        if (examHistory.length > MAX_HISTORY) {
            console.log(`πŸ"' Cleaning up history: ${examHistory.length} entries, keeping last ${MAX_HISTORY}`);
            examHistory = examHistory.slice(-MAX_HISTORY); // Keep last 10
        }

        try {
            localStorage.setItem('luyende_examHistory', JSON.stringify(examHistory));
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                console.warn('LocalStorage quota exceeded, trying to save minimal data...');

                // Strategy 1: Remove questions array from ALL history (keep only answers/score)
                examHistory = examHistory.map(h => {
                    const minimal = { ...h };
                    delete minimal.questions; // Remove heavy questions data
                    return minimal;
                });

                // Try saving again
                try {
                    localStorage.setItem('luyende_examHistory', JSON.stringify(examHistory));
                } catch (e2) {
                    // Strategy 2: Remove oldest entries
                    while (examHistory.length > 5) { // Keep only last 5
                        examHistory.shift();
                    }
                    try {
                        localStorage.setItem('luyende_examHistory', JSON.stringify(examHistory));
                    } catch (e3) {
                        console.error('Cannot save history even after cleanup:', e3);
                        // Alert user but don't block flow
                        // alert('Bộ nhớ lịch sử đã đầy. Kết quả nộp bài vẫn được lưu lên máy chủ.');
                    }
                }
            } else {
                throw e;
            }
        }
        console.log('Exam result saved:', result);
    } catch (err) {
        console.error('Error saving local history:', err);
    }
}

// Get exam history
function getExamHistory() {
    return JSON.parse(localStorage.getItem('luyende_examHistory') || '[]');
}

// Reset exam state (for retaking)
function resetExamState() {
    currentQuestionIndex = 0;
    userAnswers = new Array(examData.questions.length).fill(null);
    flaggedQuestions.clear();
    timeRemaining = examData.duration * 60;
    examStartTime = null;
    questionStartTime = Date.now();
}

// Reset Exam
function resetExam() {
    currentQuestionIndex = 0;
    userAnswers = new Array(examData.questions.length).fill(null);
    flaggedQuestions.clear();
    timeRemaining = examData.duration * 60;

    document.getElementById('resultScreen').classList.remove('active');
    document.getElementById('preExamScreen').classList.add('active');
}





// Tooltip System - Creates tooltips that attach to body to avoid overflow clipping
function initTooltips() {
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.id = 'customTooltip';
    tooltip.style.cssText =
        'position: fixed;' +
        'background: #333;' +
        'color: white;' +
        'padding: 6px 12px;' +
        'border-radius: 6px;' +
        'font-size: 12px;' +
        'font-weight: 400;' +
        'white-space: nowrap;' +
        'pointer-events: none;' +
        'opacity: 0;' +
        'transition: opacity 0.15s ease;' +
        'z-index: 10000;';
    document.body.appendChild(tooltip);

    // Create arrow element
    const arrow = document.createElement('div');
    arrow.id = 'tooltipArrow';
    arrow.style.cssText =
        'position: fixed;' +
        'width: 0;' +
        'height: 0;' +
        'border-left: 6px solid transparent;' +
        'border-right: 6px solid transparent;' +
        'border-top: 6px solid #333;' +
        'pointer-events: none;' +
        'opacity: 0;' +
        'transition: opacity 0.15s ease;' +
        'z-index: 10000;';
    document.body.appendChild(arrow);

    // Show tooltip function
    function showTooltip(target) {
        const text = target.getAttribute('data-tooltip');
        if (!text) return;

        tooltip.textContent = text;
        tooltip.style.opacity = '1';
        arrow.style.opacity = '1';

        // Use requestAnimationFrame to ensure layout is calculated
        requestAnimationFrame(function () {
            const rect = target.getBoundingClientRect();
            const tooltipWidth = tooltip.offsetWidth;
            const tooltipHeight = tooltip.offsetHeight;

            // Position tooltip above the element
            let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            let top = rect.top - tooltipHeight - 10;

            // Keep tooltip within viewport
            if (left < 5) left = 5;
            if (left + tooltipWidth > window.innerWidth - 5) {
                left = window.innerWidth - tooltipWidth - 5;
            }

            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';

            // Position arrow
            arrow.style.left = (rect.left + rect.width / 2 - 6) + 'px';
            arrow.style.top = (rect.top - 8) + 'px';
        });
    }

    // Hide tooltip function
    function hideTooltip() {
        tooltip.style.opacity = '0';
        arrow.style.opacity = '0';
    }

    // Event delegation for mouseover
    document.body.addEventListener('mouseover', function (e) {
        const target = e.target.closest('[data-tooltip]');
        if (target) {
            showTooltip(target);
        }
    });

    // Event delegation for mouseout
    document.body.addEventListener('mouseout', function (e) {
        const target = e.target.closest('[data-tooltip]');
        if (target && !target.contains(e.relatedTarget)) {
            hideTooltip();
        }
    });
}



// Tooltip initialized in DOMContentLoaded or elsewhere
// Argument: Helper to update User UI
function updateUserUI() {
    if (!currentUser) return;
    const name = currentUser.name.toUpperCase(); // Force uppercase

    const sidebarStudentName = document.getElementById('sidebarStudentName');
    const preStudentName = document.getElementById('preStudentName');
    const headerStudentName = document.getElementById('headerStudentName');
    const resultStudentName = document.getElementById('resultStudentName');

    if (sidebarStudentName) sidebarStudentName.textContent = name;
    if (preStudentName) preStudentName.textContent = name;
    if (headerStudentName) headerStudentName.textContent = name;
    if (resultStudentName) resultStudentName.textContent = name;
}

// ========== URL ROUTING HANDLER ==========
async function handleURLHash() {
    const hash = window.location.hash;

    // Check if user is logged in
    const token = getToken();
    const isLoggedIn = token && currentUser;

    // Reverse lookup: hash -> screenId
    const hashToScreen = {};
    for (const [screenId, hashValue] of Object.entries(screenRoutes)) {
        hashToScreen[hashValue] = screenId;
    }

    if (hash && hashToScreen[hash]) {
        const screenId = hashToScreen[hash];

        // Protected screens require login
        const protectedScreens = ['dashboardScreen', 'examListScreen', 'preExamScreen', 'examScreen', 'resultScreen', 'answerReviewScreen'];

        if (protectedScreens.includes(screenId) && !isLoggedIn) {
            showScreen('loginScreen', false);
        } else if (screenId === 'dashboardScreen') {
            await showDashboard();
        } else if (screenId === 'examScreen') {
            // CRITICAL FIX: Attempt to resume exam if reloading on #exam
            console.log("Direct access to exam screen, checking resume...");
            // Use checkAndResumeExam logic manually or call it if showDashboard not used
            // But checkAndResumeExam expects Dashboard to be hidden later?
            // Actually, best is:
            const resumed = await checkAndResumeExam();
            if (!resumed) {
                // If resume failed (no state), go to dashboard
                window.location.hash = '#dashboard';
            }
        } else if (screenId === 'examListScreen') {
            // Exam list needs packageId to load exams
            const savedPackageId = localStorage.getItem('luyende_currentPackageId');
            if (savedPackageId) {
                await showExamList(savedPackageId);
            } else {
                // No package saved, go to dashboard instead
                await showDashboard();
            }
        } else {
            showScreen(screenId, false);
        }
    } else if (isLoggedIn) {
        await showDashboard();
    } else {
        showScreen('loginScreen', false);
    }
}

// Handle browser back/forward
window.addEventListener('popstate', handleURLHash);

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function () {

    initTooltips();
    // Check for existing session
    const token = getToken();
    const userData = localStorage.getItem('luyende_currentUser');

    if (token && userData) {
        try {
            currentUser = JSON.parse(userData);
        } catch (e) {
            currentUser = null;
        }

        if (currentUser) {
            // IMMEDIATE UPDATE UI
            updateUserUI();

            // Load packages
            await loadPackages();
            await handleURLHash();

            // Then verify token async
            apiGetCurrentUser().then(freshUser => {
                if (freshUser && freshUser.role === 'student') {
                    currentUser = freshUser;
                    localStorage.setItem('luyende_currentUser', JSON.stringify(freshUser));
                    updateUserUI(); // Update again with fresh data
                } else {
                    console.warn("Session verification warning: API returned invalid user data, but keeping local session.", freshUser);
                    // handleLogout(); // DISABLED to prevent session loss on reload
                }
            }).catch(err => {
                console.error("Session verify failed:", err);
                // handleLogout(); // DISABLED
            });
        }
    } else {
        await handleURLHash();
    }
});

// ========== FORGOT PASSWORD HANDLER ==========
function showForgotPasswordContact() {
    // Show contact modal (same as package activation)
    const modal = document.getElementById('contactModal');
    if (modal) {
        // Update content for support context
        const header = modal.querySelector('.modal-header h3');
        const desc = modal.querySelector('.modal-body > p');

        if (header) header.innerHTML = '🔐 Liên hệ lấy lại mật khẩu';
        if (desc) desc.textContent = 'Để lấy lại mật khẩu, vui lòng liên hệ admin qua các kênh sau để được hỗ trợ xác minh danh tính:';

        modal.classList.add('active');
    } else {
        // Fallback if modal doesn't exist
        alert('Để được hỗ trợ khôi phục mật khẩu, vui lòng liên hệ:\n\n📧 Email: phamducthang01112007@gmail.com\n📱 Zalo: 0362...\n\nHoặc liên hệ Admin qua trang web.');
    }
}

// ========== NEW DASHBOARD SYSTEM ==========
// Global state for new dashboard
if (typeof cachedSubjects === 'undefined') var cachedSubjects = [];
if (typeof currentGrade === 'undefined') var currentGrade = 'all';
if (typeof currentSubject === 'undefined') var currentSubject = null;
if (typeof currentSemester === 'undefined') var currentSemester = 'all';
if (typeof examStats === 'undefined') var examStats = [];

// Load subjects from API
async function loadSubjects() {
    try {
        const token = localStorage.getItem('luyende_token');
        const response = await fetch('/api/subjects', {
            headers: token ? { 'Authorization': 'Bearer ' + token } : {}
        });
        if (response.ok) {
            cachedSubjects = await response.json();
            console.log('✅ Loaded subjects:', cachedSubjects.length);
        }
    } catch (err) {
        console.error('Error loading subjects:', err);
        cachedSubjects = [];
    }
}

// Load exam stats from API
async function loadExamStats() {
    try {
        const token = localStorage.getItem('luyende_token');
        const response = await fetch('/api/exams/stats', {
            headers: token ? { 'Authorization': 'Bearer ' + token } : {}
        });
        if (response.ok) {
            examStats = await response.json();
            console.log('✅ Loaded exam stats:', examStats.length);
        }
    } catch (err) {
        console.error('Error loading exam stats:', err);
        examStats = [];
    }
}

// Get stats for a subject and grade
function getSubjectStats(subjectId, grade) {
    let total = 0, vipCount = 0;

    examStats.forEach(stat => {
        const matchGrade = grade === 'all' || stat._id.grade === grade;
        const matchSubject = stat._id.subjectId === subjectId;

        if (matchGrade && matchSubject) {
            total += stat.total || 0;
            vipCount += stat.vipCount || 0;
        }
    });

    return { total, vipCount };
}

// Render subjects grid
function renderSubjects() {
    const grid = document.getElementById('subjectGrid');
    const sectionTitle = document.getElementById('sectionTitle');

    if (!grid) return;

    // Update section title based on current grade
    const gradeNames = {
        'all': 'Tất cả môn học',
        '10': 'Môn học Lớp 10',
        '11': 'Môn học Lớp 11',
        '12': 'Môn học Lớp 12',
        'thpt': 'Môn thi THPT Quốc Gia'
    };
    if (sectionTitle) sectionTitle.textContent = gradeNames[currentGrade] || 'Chọn môn học';

    if (cachedSubjects.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📚</div>
                <div class="empty-state-text">Chưa có môn học nào</div>
            </div>
        `;
        return;
    }

    // Filter subjects that have exams for current grade
    const subjectsWithExams = cachedSubjects.filter(subject => {
        const stats = getSubjectStats(subject.id, currentGrade);
        return stats.total > 0;
    });

    if (subjectsWithExams.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-text">Chưa có đề thi cho khối này</div>
            </div>
        `;
        return;
    }

    grid.innerHTML = subjectsWithExams.map(subject => {
        const stats = getSubjectStats(subject.id, currentGrade);
        const bgColor = subject.color + '20'; // Add transparency

        return `
            <div class="subject-card" 
                 style="--subject-color: ${subject.color}; --subject-bg: ${bgColor}"
                 onclick="showSubjectExams('${subject.id}')">
                <div class="subject-icon-wrapper" style="background: ${bgColor}">
                    ${subject.icon}
                </div>
                <div class="subject-name">${subject.name}</div>
                <div class="subject-stats">
                    <span class="stat-badge total">${stats.total} đề</span>
                    ${stats.vipCount > 0 ? `<span class="stat-badge vip">👑 ${stats.vipCount}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Switch grade tab - updated for new simple tabs
function switchGradeTab(grade) {
    currentGrade = grade;

    // Update active tab - support both old and new class names
    document.querySelectorAll('.grade-tab, .grade-tab-simple').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.grade === grade);
    });

    // Re-render course list (new) or subjects (fallback)
    if (document.getElementById('courseList')) {
        renderCourseList();
    } else {
        renderSubjects();
    }
}

// Show exams for a subject
async function showSubjectExams(subjectId) {
    currentSubject = cachedSubjects.find(s => s.id === subjectId);
    if (!currentSubject) return;

    // Update header
    const iconDisplay = document.getElementById('subjectIconDisplay');
    const examListTitle = document.getElementById('examListTitle');
    const examCount = document.getElementById('examCount');
    const semesterTabs = document.getElementById('semesterTabs');

    if (iconDisplay) iconDisplay.textContent = currentSubject.icon;

    const gradeLabel = {
        '10': 'Lớp 10',
        '11': 'Lớp 11',
        '12': 'Lớp 12',
        'thpt': 'THPT Quốc Gia'
    }[currentGrade] || '';

    if (examListTitle) examListTitle.textContent = `${currentSubject.name} - ${gradeLabel}`;

    // Show/hide semester tabs (only for grades 10/11/12)
    if (semesterTabs) {
        semesterTabs.style.display = (currentGrade !== 'thpt' && currentGrade !== 'all') ? 'flex' : 'none';
    }

    // Reset semester filter
    currentSemester = 'all';
    document.querySelectorAll('.semester-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.semester === 'all');
    });

    // Load and render exams
    await loadSubjectExams();

    showScreen('examListScreen');
}

// Load exams for current subject/grade/semester
async function loadSubjectExams() {
    const grid = document.getElementById('examGrid');
    if (!grid) return;

    // Show loading
    grid.innerHTML = `
        <div class="exam-card-new" style="justify-content: center; padding: 40px;">
            <span>Đang tải...</span>
        </div>
    `;

    try {
        const params = new URLSearchParams();
        if (currentSubject) params.append('subjectId', currentSubject.id);
        if (currentGrade && currentGrade !== 'all') params.append('grade', currentGrade);
        if (currentSemester && currentSemester !== 'all') params.append('semester', currentSemester);

        const token = localStorage.getItem('luyende_token');
        const response = await fetch(`/api/exams/filter?${params.toString()}`, {
            headers: token ? { 'Authorization': 'Bearer ' + token } : {}
        });

        if (!response.ok) throw new Error('Failed to load exams');

        const exams = await response.json();

        // Update exam count
        const examCountEl = document.getElementById('examCount');
        if (examCountEl) examCountEl.textContent = `${exams.length} đề thi`;

        if (exams.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <div class="empty-state-text">Chưa có đề thi nào</div>
                </div>
            `;
            return;
        }

        // Check user's VIP access
        let userVipSubjects = [];
        try {
            const vipResponse = await fetch('/api/vip/my', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (vipResponse.ok) {
                userVipSubjects = await vipResponse.json();
            }
        } catch (e) { }

        // Check if user has VIP for this subject/grade
        const hasVip = userVipSubjects.some(v =>
            v.subjectId === currentSubject?.id &&
            (v.grade === currentGrade || currentGrade === 'all')
        );

        grid.innerHTML = exams.map((exam, index) => {
            const canAccess = exam.accessType === 'free' || hasVip;
            const semesterLabel = {
                'gk1': 'Giữa kì 1',
                'ck1': 'Cuối kì 1',
                'gk2': 'Giữa kì 2',
                'ck2': 'Cuối kì 2'
            }[exam.semester] || '';

            return `
                <div class="exam-card-new">
                    <div class="exam-card-left">
                        <div class="exam-number">${index + 1}</div>
                        <div class="exam-details">
                            <h3>${exam.title}</h3>
                            <div class="exam-meta">
                                <span>⏱️ ${exam.duration || 90} phút</span>
                                ${semesterLabel ? `<span>📅 ${semesterLabel}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="exam-card-right">
                        ${exam.accessType === 'vip'
                    ? (hasVip
                        ? '<span class="access-badge vip">👑 VIP</span>'
                        : '<span class="access-badge vip-locked">🔒 VIP</span>')
                    : '<span class="access-badge free">FREE</span>'
                }
                        ${canAccess
                    ? `<button class="btn-start-exam" onclick="startExamFromFilter('${exam.id}')">Làm bài</button>`
                    : `<button class="btn-register-vip" onclick="showContactModal()">Đăng ký</button>`
                }
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Error loading exams:', err);
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <div class="empty-state-text">Lỗi tải đề thi</div>
            </div>
        `;
    }
}

// Filter by semester
function filterBySemester(semester) {
    currentSemester = semester;

    // Update active tab
    document.querySelectorAll('.semester-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.semester === semester);
    });

    // Reload exams
    loadSubjectExams();
}

// Start exam from new filter view
async function startExamFromFilter(examId) {
    try {
        const token = localStorage.getItem('luyende_token');
        const response = await fetch(`/api/exams/${examId}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (!response.ok) throw new Error('Failed to load exam');

        const exam = await response.json();

        // Set exam data
        examData.examTitle = exam.title;
        examData.id = exam._id || exam.id;
        examData.displayId = exam.displayId || exam.id;
        examData.duration = exam.duration || 90;
        examData.template = exam.template || 'thpt_toan';
        examData.studentName = currentUser ? currentUser.name : 'User';
        examData.questions = exam.questions || [];

        // Store subject/grade info for history
        examData.subjectId = currentSubject?.id;
        examData.grade = currentGrade;

        showPreExam();
    } catch (err) {
        console.error('Error starting exam:', err);
        alert('Lỗi tải đề thi: ' + err.message);
    }
}

// Current course filter state
if (typeof currentCourseFilter === 'undefined') var currentCourseFilter = 'suggested';

// Switch course filter tab
function switchCourseFilter(filter) {
    currentCourseFilter = filter;

    // Update active tab
    document.querySelectorAll('.course-filter-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.filter === filter);
    });

    // Re-render course list
    renderCourseList();
}

// Toggle accordion group
function toggleCourseGroup(groupId) {
    const group = document.getElementById(groupId);
    if (group) {
        group.classList.toggle('open');
    }
}

// Render course list in accordion style
function renderCourseList() {
    const container = document.getElementById('courseList');
    if (!container) return;

    if (cachedSubjects.length === 0) {
        container.innerHTML = `
            <div class="course-empty">
                <div class="course-empty-icon">📚</div>
                <div class="course-empty-text">Chưa có khóa học nào</div>
            </div>
        `;
        return;
    }

    // Filter subjects that have exams for current grade
    const subjectsWithExams = cachedSubjects.filter(subject => {
        const stats = getSubjectStats(subject.id, currentGrade);
        return stats.total > 0;
    });

    if (subjectsWithExams.length === 0) {
        container.innerHTML = `
            <div class="course-empty">
                <div class="course-empty-icon">📭</div>
                <div class="course-empty-text">Chưa có đề thi cho khối này</div>
            </div>
        `;
        return;
    }

    // Build accordion HTML
    container.innerHTML = subjectsWithExams.map((subject, index) => {
        const stats = getSubjectStats(subject.id, currentGrade);
        const groupId = `course-group-${subject.id}`;

        return `
            <div class="course-group" id="${groupId}">
                <div class="course-group-header" onclick="toggleCourseGroup('${groupId}')">
                    <div class="course-group-left">
                        <div class="course-checkbox"></div>
                        <span class="course-group-icon">${subject.icon}</span>
                        <span class="course-group-title">${subject.name} - ${stats.total} đề thi</span>
                    </div>
                    <div class="course-group-right">
                        ${stats.vipCount > 0 ? `<span class="badge-vip">VIP ${stats.vipCount}</span>` : ''}
                        <svg class="course-group-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6 9l6 6 6-6"/>
                        </svg>
                    </div>
                </div>
                <div class="course-items" id="${groupId}-items">
                    <!-- Will load when expanded -->
                    <div class="course-item" style="justify-content: center; padding: 20px;">
                        <span style="color: #9ca3af;">Click để xem danh sách đề</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers to load exams when group opens
    subjectsWithExams.forEach(subject => {
        const groupId = `course-group-${subject.id}`;
        const header = document.querySelector(`#${groupId} .course-group-header`);
        if (header) {
            header.addEventListener('click', () => loadCourseGroupExams(subject.id, groupId));
        }
    });
}

// Load exams for a course group
async function loadCourseGroupExams(subjectId, groupId) {
    const itemsContainer = document.getElementById(`${groupId}-items`);
    if (!itemsContainer) return;

    // Check if already loaded
    if (itemsContainer.dataset.loaded === 'true') return;

    try {
        const params = new URLSearchParams();
        params.append('subjectId', subjectId);
        if (currentGrade && currentGrade !== 'all') params.append('grade', currentGrade);

        const token = localStorage.getItem('luyende_token');
        const response = await fetch(`/api/exams/filter?${params.toString()}`, {
            headers: token ? { 'Authorization': 'Bearer ' + token } : {}
        });

        if (!response.ok) throw new Error('Failed to load exams');

        const exams = await response.json();

        // Check user's VIP access
        let userVipSubjects = [];
        try {
            const vipResponse = await fetch('/api/vip/my', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (vipResponse.ok) {
                userVipSubjects = await vipResponse.json();
            }
        } catch (e) { }

        const hasVip = userVipSubjects.some(v =>
            v.subjectId === subjectId &&
            (v.grade === currentGrade || currentGrade === 'all')
        );

        if (exams.length === 0) {
            itemsContainer.innerHTML = `
                <div class="course-item" style="justify-content: center; padding: 20px;">
                    <span style="color: #9ca3af;">Chưa có đề thi</span>
                </div>
            `;
        } else {
            itemsContainer.innerHTML = exams.map((exam, index) => {
                const canAccess = exam.accessType === 'free' || hasVip;

                return `
                    <div class="course-item">
                        <div class="course-item-left">
                            <div class="course-checkbox"></div>
                            <span class="course-item-title">${exam.title}</span>
                        </div>
                        <div class="course-item-right">
                            <div class="download-count">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                                </svg>
                                <span>${exam.downloadCount || 0}</span>
                            </div>
                            ${exam.accessType === 'vip' && !hasVip
                        ? `<span class="badge-vip">VIP</span><button class="btn-do-exam locked" disabled>🔒</button>`
                        : `<button class="btn-do-exam primary" onclick="startExamFromFilter('${exam.id}')">Làm bài</button>`
                    }
                        </div>
                    </div>
                `;
            }).join('');
        }

        itemsContainer.dataset.loaded = 'true';

    } catch (err) {
        console.error('Error loading course exams:', err);
        itemsContainer.innerHTML = `
            <div class="course-item" style="justify-content: center; padding: 20px;">
                <span style="color: #ef4444;">Lỗi tải dữ liệu</span>
            </div>
        `;
    }
}

// Updated showDashboard to use new system
const originalShowDashboard = showDashboard;
showDashboard = async function () {
    console.log('🎨 showDashboard - New Dashboard');

    updateUserNameDisplay();

    // Load data for new dashboard
    await Promise.all([
        loadSubjects(),
        loadExamStats()
    ]);

    // Also load legacy packages for backwards compatibility
    await loadPackages();

    // Reset to "all" grade tab
    currentGrade = 'all';
    document.querySelectorAll('.grade-tab, .grade-tab-simple').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.grade === 'all');
    });

    // Render course list (new accordion style) or subjects (fallback)
    if (document.getElementById('courseList')) {
        renderCourseList();
    } else {
        renderSubjects();
    }

    showScreen('dashboardScreen');

    // Check for active exam resume
    checkAndResumeExam();
};
