// ========== ADMIN AUTH ==========
const DEFAULT_ADMINS = [
    { id: 1, name: 'Super Admin', username: 'admin', password: '240707', role: 'super' }
];

let currentAdmin = null;

function getAdmins() {
    const stored = localStorage.getItem('luyende_admins');
    if (stored) return JSON.parse(stored);
    // Initialize with default admin
    localStorage.setItem('luyende_admins', JSON.stringify(DEFAULT_ADMINS));
    return DEFAULT_ADMINS;
}

function saveAdmins(admins) {
    localStorage.setItem('luyende_admins', JSON.stringify(admins));
}

function handleAdminLogin(event) {
    event.preventDefault();
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;

    const admins = getAdmins();
    const admin = admins.find(a => a.username === username && a.password === password);

    if (admin) {
        currentAdmin = admin;
        localStorage.setItem('luyende_currentAdmin', JSON.stringify(admin));
        showAdminDashboard();
    } else {
        alert('Tên đăng nhập hoặc mật khẩu không đúng!');
    }
}

function handleAdminLogout() {
    currentAdmin = null;
    localStorage.removeItem('luyende_currentAdmin');
    showScreen('adminLoginScreen');
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function showAdminDashboard() {
    document.getElementById('currentAdminName').textContent = currentAdmin.name;
    document.getElementById('currentAdminRole').textContent = getRoleName(currentAdmin.role);

    updateDashboardStats();
    renderUsers();
    renderPackages();
    renderAdmins();
    initExamCreator();

    showScreen('adminDashboard');
}

function getRoleName(role) {
    const roles = {
        'super': 'Super Admin',
        'admin': 'Admin',
        'editor': 'Soạn đề'
    };
    return roles[role] || role;
}

// ========== TAB NAVIGATION ==========
function showAdminTab(tabName) {
    // Update nav items
    document.querySelectorAll('.admin-nav-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.admin-nav-item').classList.add('active');

    // Update tabs
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabName + 'Tab').classList.add('active');

    // Refresh data when switching tabs
    if (tabName === 'users') renderUsers();
    if (tabName === 'packages') renderPackages();
    if (tabName === 'exams') showExamList();
    if (tabName === 'dashboard') updateDashboardStats();
    if (tabName === 'history') renderAllHistory();
}

// ========== DASHBOARD STATS ==========
function updateDashboardStats() {
    const users = getUsers();
    const packages = getPackages();
    const exams = getAllExams();
    const history = getExamHistory();

    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('totalPackages').textContent = packages.length;
    document.getElementById('totalExams').textContent = exams.length;
    document.getElementById('totalAttempts').textContent = history.length;
}

// ========== USER MANAGEMENT ==========
function getUsers() {
    const stored = localStorage.getItem('luyende_users');
    if (stored) return JSON.parse(stored);
    return [];
}

function renderUsers(filterText = '') {
    const users = getUsers();
    const packages = getPackages();
    const tbody = document.getElementById('usersTableBody');

    // Filter users by username or email
    const filtered = filterText
        ? users.filter(u =>
            u.username.toLowerCase().includes(filterText.toLowerCase()) ||
            (u.email && u.email.toLowerCase().includes(filterText.toLowerCase()))
        )
        : users;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty">${filterText ? 'Không tìm thấy người dùng phù hợp' : 'Chưa có người dùng nào đăng ký'}</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(user => {
        const activatedPkgs = user.activatedPackages || [];
        const pkgCount = activatedPkgs.length;
        return `
        <tr>
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.email || 'N/A'}</td>
            <td>${user.username}</td>
            <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'N/A'}</td>
            <td><span class="badge ${pkgCount > 0 ? 'badge-success' : 'badge-secondary'}">${pkgCount}/${packages.length} gói</span></td>
            <td>
                <button class="btn-action btn-edit" onclick="showUserDetail(${user.id})">👁 Xem</button>
                <button class="btn-action btn-delete" onclick="deleteUser(${user.id})">🗑️ Xóa</button>
            </td>
        </tr>
    `}).join('');
}

function filterUsers() {
    const searchText = document.getElementById('userSearchInput').value;
    renderUsers(searchText);
}

function clearUserSearch() {
    document.getElementById('userSearchInput').value = '';
    renderUsers();
}

function showUserDetail(userId) {
    const users = getUsers();
    const packages = getPackages();
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Populate user info
    document.getElementById('detailUserId').value = userId;
    document.getElementById('detailUserName').textContent = user.name;
    document.getElementById('detailUserEmail').textContent = user.email || 'N/A';
    document.getElementById('detailUserUsername').textContent = user.username;
    document.getElementById('detailUserDate').textContent = user.createdAt
        ? new Date(user.createdAt).toLocaleDateString('vi-VN')
        : 'N/A';

    // Render package checkboxes
    const activatedPkgs = user.activatedPackages || [];
    document.getElementById('userPackagesList').innerHTML = packages.map(pkg => `
        <label class="package-checkbox">
            <input type="checkbox" value="${pkg.id}" ${activatedPkgs.includes(pkg.id) ? 'checked' : ''}>
            <span class="package-checkbox-icon">${pkg.icon}</span>
            <span class="package-checkbox-name">${pkg.name}</span>
        </label>
    `).join('');

    document.getElementById('userDetailModal').classList.add('active');
}

function closeUserDetailModal() {
    document.getElementById('userDetailModal').classList.remove('active');
}

function saveUserPackages() {
    const userId = parseInt(document.getElementById('detailUserId').value);
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;

    // Get selected packages
    const checkboxes = document.querySelectorAll('#userPackagesList input[type="checkbox"]');
    const activatedPackages = [];
    checkboxes.forEach(cb => {
        if (cb.checked) activatedPackages.push(cb.value);
    });

    // Update user
    users[userIndex].activatedPackages = activatedPackages;
    localStorage.setItem('luyende_users', JSON.stringify(users));

    alert('Đã cập nhật gói cho học sinh!');
    closeUserDetailModal();
    renderUsers();
}

function deleteUser(userId) {
    if (!confirm('Bạn có chắc muốn xóa người dùng này?')) return;

    let users = getUsers();
    users = users.filter(u => u.id !== userId);
    localStorage.setItem('luyende_users', JSON.stringify(users));
    renderUsers();
    updateDashboardStats();
}

// ========== PACKAGE MANAGEMENT ==========
function getPackages() {
    const stored = localStorage.getItem('luyende_packages');
    if (stored) return JSON.parse(stored);
    // Return default packages
    return [
        {
            id: "giua-ki-2-lop-12",
            name: "Đề thi giữa kì 2 lớp 12",
            icon: "📝",
            description: "Bộ đề ôn thi giữa kì 2 môn Toán lớp 12 theo cấu trúc THPT mới.",
            duration: 90
        },
        {
            id: "cuoi-ki-2-lop-12",
            name: "Đề thi cuối kì 2 lớp 12",
            icon: "🎓",
            description: "Bộ đề ôn thi cuối kì 2 môn Toán lớp 12 theo chuẩn thi tốt nghiệp THPT.",
            duration: 90
        }
    ];
}

function savePackages(packages) {
    localStorage.setItem('luyende_packages', JSON.stringify(packages));
}

function renderPackages() {
    const packages = getPackages();
    const grid = document.getElementById('adminPackagesGrid');

    grid.innerHTML = packages.map(pkg => `
        <div class="admin-package-card">
            <div class="package-icon">${pkg.icon}</div>
            <div class="package-name">${pkg.name}</div>
            <div class="package-description">${pkg.description}</div>
            <div class="package-meta">
                <span>⏱️ ${pkg.duration} phút</span>
                <span>📝 ${countExamsInPackage(pkg.id)} đề</span>
            </div>
            <div class="package-actions">
                <button class="btn-action btn-edit" onclick="editPackage('${pkg.id}')">✏️ Sửa</button>
                <button class="btn-action btn-delete" onclick="deletePackage('${pkg.id}')">🗑️ Xóa</button>
            </div>
        </div>
    `).join('');

    // Update package select in exam creator
    updatePackageSelect();
}

function countExamsInPackage(packageId) {
    const exams = getAllExams();
    return exams.filter(e => e.packageId === packageId).length;
}

function updatePackageSelect() {
    const packages = getPackages();
    const select = document.getElementById('examPackageSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Chọn gói đề --</option>' +
        packages.map(pkg => `<option value="${pkg.id}">${pkg.name}</option>`).join('');
}

function showPackageModal() {
    document.getElementById('packageModal').classList.add('active');
    document.getElementById('packageForm').reset();
    document.getElementById('packageForm').dataset.editId = '';
}

function closePackageModal() {
    document.getElementById('packageModal').classList.remove('active');
}

function savePackage(event) {
    event.preventDefault();

    const packages = getPackages();
    const editId = document.getElementById('packageForm').dataset.editId;

    const newPackage = {
        id: editId || 'pkg-' + Date.now(),
        name: document.getElementById('packageName').value,
        description: document.getElementById('packageDesc').value,
        icon: document.getElementById('packageIcon').value || '📝',
        duration: parseInt(document.getElementById('packageDuration').value) || 90,
        accessType: document.getElementById('packageAccessType').value || 'open'
    };

    if (editId) {
        const index = packages.findIndex(p => p.id === editId);
        if (index !== -1) packages[index] = newPackage;
    } else {
        packages.push(newPackage);
    }

    savePackages(packages);
    closePackageModal();
    renderPackages();
    updateDashboardStats();
}

function editPackage(packageId) {
    const packages = getPackages();
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return;

    document.getElementById('packageName').value = pkg.name;
    document.getElementById('packageDesc').value = pkg.description;
    document.getElementById('packageIcon').value = pkg.icon;
    document.getElementById('packageDuration').value = pkg.duration;
    document.getElementById('packageAccessType').value = pkg.accessType || 'open';
    document.getElementById('packageForm').dataset.editId = packageId;

    document.getElementById('packageModal').classList.add('active');
}

function deletePackage(packageId) {
    if (!confirm('Bạn có chắc muốn xóa gói đề này? Các đề thi trong gói cũng sẽ bị xóa!')) return;

    let packages = getPackages();
    packages = packages.filter(p => p.id !== packageId);
    savePackages(packages);

    // Also delete exams in this package
    let exams = getAllExams();
    exams = exams.filter(e => e.packageId !== packageId);
    saveAllExams(exams);

    renderPackages();
    updateDashboardStats();
}

// ========== EXAM MANAGEMENT ==========
function getAllExams() {
    const stored = localStorage.getItem('luyende_exams');
    if (stored) return JSON.parse(stored);
    return [];
}

function saveAllExams(exams) {
    localStorage.setItem('luyende_exams', JSON.stringify(exams));
}

function getExamHistory() {
    const stored = localStorage.getItem('luyende_examHistory');
    if (stored) return JSON.parse(stored);
    return [];
}

function renderExams() {
    const exams = getAllExams();
    const packages = getPackages();
    const tbody = document.getElementById('examsTableBody');

    if (exams.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Chưa có đề thi nào</td></tr>';
        return;
    }

    tbody.innerHTML = exams.map(exam => {
        const pkg = packages.find(p => p.id === exam.packageId);
        const pkgName = pkg ? pkg.name : 'Unknown';
        const date = new Date(exam.createdAt).toLocaleDateString('vi-VN');

        return `
            <tr>
                <td>#${exam.id.slice(-6)}</td>
                <td title="${exam.title}"><strong>${exam.title}</strong></td>
                <td>${pkgName}</td>
                <td>${date}</td>
                <td>${exam.createdBy || 'Admin'}</td>
                <td>
                    <button class="btn-action btn-edit" onclick="editExam('${exam.id}')">✏️ Sửa</button>
                    <button class="btn-action btn-delete" onclick="deleteExam('${exam.id}')">🗑️ Xóa</button>
                </td>
            </tr>
        `;
    }).join('');
}

function showExamList() {
    document.getElementById('examListView').style.display = 'block';
    document.getElementById('examCreatorView').style.display = 'none';
    document.getElementById('btnCreateExam').style.display = 'inline-block';
    document.getElementById('btnBackToExamList').style.display = 'none';
    document.getElementById('examTabTitle').textContent = 'Quản lý Đề thi';
    renderExams();
}

function showExamCreator() {
    document.getElementById('examListView').style.display = 'none';
    document.getElementById('examCreatorView').style.display = 'block';
    document.getElementById('btnCreateExam').style.display = 'none';
    document.getElementById('btnBackToExamList').style.display = 'inline-block';
    document.getElementById('examTabTitle').textContent = 'Tạo Đề thi Mới';

    // Reset form
    document.getElementById('editingExamId').value = '';
    document.getElementById('examTitle').value = '';
    document.getElementById('examTag').value = '';
    document.getElementById('examStatus').value = 'published';
    document.getElementById('examPackageSelect').value = '';
    initExamCreator();
}

function editExam(examId) {
    const exams = getAllExams();
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;

    // Switch view
    document.getElementById('examListView').style.display = 'none';
    document.getElementById('examCreatorView').style.display = 'block';
    document.getElementById('btnCreateExam').style.display = 'none';
    document.getElementById('btnBackToExamList').style.display = 'inline-block';
    document.getElementById('examTabTitle').textContent = 'Chỉnh sửa Đề thi';

    // Populate form
    document.getElementById('editingExamId').value = exam.id;
    document.getElementById('examTitle').value = exam.title;
    document.getElementById('examTag').value = exam.tag || 'THPT Toán';
    document.getElementById('examStatus').value = exam.status || 'published';
    document.getElementById('examPackageSelect').value = exam.packageId;

    // Clear current questions
    document.getElementById('mcQuestions').innerHTML = '';
    document.getElementById('tfQuestions').innerHTML = '';
    document.getElementById('fillQuestions').innerHTML = '';

    // Reset counters
    mcQuestionCount = 0;
    tfQuestionCount = 0;
    fillQuestionCount = 0;

    // Populate questions
    exam.questions.forEach(q => {
        if (q.type === 'multiple-choice') addMCQuestion(q);
        else if (q.type === 'true-false') addTFQuestion(q);
        else if (q.type === 'fill-in-blank') addFillQuestion(q);
    });
}

function deleteExam(examId) {
    if (!confirm('Bạn có chắc muốn xóa đề thi này? Hành động này không thể hoàn tác!')) return;

    let exams = getAllExams();
    exams = exams.filter(e => e.id !== examId);
    saveAllExams(exams);
    renderExams();
    updateDashboardStats();
}


// Exam creator state - fixed counts for THPT
const MC_COUNT = 12;
const TF_COUNT = 4;
const FILL_COUNT = 6;

function initExamCreator() {
    // Clear question containers
    document.getElementById('mcQuestions').innerHTML = '';
    document.getElementById('tfQuestions').innerHTML = '';
    document.getElementById('fillQuestions').innerHTML = '';

    // Add fixed number of questions
    for (let i = 0; i < MC_COUNT; i++) addMCQuestion();
    for (let i = 0; i < TF_COUNT; i++) addTFQuestion();
    for (let i = 0; i < FILL_COUNT; i++) addFillQuestion();
}

function addMCQuestion(data = null) {
    const container = document.getElementById('mcQuestions');
    const index = container.children.length + 1;

    // Safety check
    if (index > MC_COUNT && !data) return;

    const html = `
        <div class="question-card" id="mc-${index}">
            <div class="question-header">
                <span class="question-number">Câu ${index}</span>
                <button type="button" class="btn-preview-single" onclick="previewSingleQuestion('mc', ${index})">
                    👁 Xem trước
                </button>
            </div>
            <div class="form-group">
                <label>Nội dung câu hỏi</label>
                <div class="editor-toolbar">
                    <button type="button" data-command="bold" onmousedown="event.preventDefault()" onclick="execCmd('bold', this)" title="In đậm (Ctrl+B)"><b>B</b></button>
                    <button type="button" data-command="italic" onmousedown="event.preventDefault()" onclick="execCmd('italic', this)" title="In nghiêng (Ctrl+I)"><i>I</i></button>
                    <button type="button" data-command="underline" onmousedown="event.preventDefault()" onclick="execCmd('underline', this)" title="Gạch chân (Ctrl+U)"><u>U</u></button>
                    <button type="button" data-command="strikeThrough" onmousedown="event.preventDefault()" onclick="execCmd('strikeThrough', this)" title="Gạch ngang"><s>S</s></button>
                    <span class="toolbar-divider"></span>
                    <button type="button" data-command="superscript" onmousedown="event.preventDefault()" onclick="execCmd('superscript', this)" title="Chỉ số trên">x²</button>
                    <button type="button" data-command="subscript" onmousedown="event.preventDefault()" onclick="execCmd('subscript', this)" title="Chỉ số dưới">x₂</button>
                    <span class="toolbar-divider"></span>
                    <button type="button" onmousedown="event.preventDefault()" onclick="execCmd('justifyLeft')" title="Căn trái">⬅</button>
                    <button type="button" onmousedown="event.preventDefault()" onclick="execCmd('justifyCenter')" title="Căn giữa">⬌</button>
                    <button type="button" onmousedown="event.preventDefault()" onclick="execCmd('justifyRight')" title="Căn phải">➡</button>
                    <span class="toolbar-divider"></span>
                    <button type="button" onmousedown="event.preventDefault()" onclick="insertMathWYSIWYG()" title="Chèn công thức">∑</button>
                    <button type="button" onmousedown="event.preventDefault()" onclick="insertImageWYSIWYG()" title="Chèn ảnh">🖼</button>
                </div>
                <div class="wysiwyg-editor mc-question-text" contenteditable="true" data-placeholder="Nhập nội dung câu hỏi... (Dùng $...$ cho công thức, Ctrl+V để dán ảnh)">${data ? data.question : ''}</div>
            </div>
            <div class="options-grid">
                <div class="form-group option-group">
                    <label>A.</label>
                    <div class="wysiwyg-option mc-option" contenteditable="true" data-option="A" data-placeholder="Đáp án A">${data ? data.options[0] : ''}</div>
                </div>
                <div class="form-group option-group">
                    <label>B.</label>
                    <div class="wysiwyg-option mc-option" contenteditable="true" data-option="B" data-placeholder="Đáp án B">${data ? data.options[1] : ''}</div>
                </div>
                <div class="form-group option-group">
                    <label>C.</label>
                    <div class="wysiwyg-option mc-option" contenteditable="true" data-option="C" data-placeholder="Đáp án C">${data ? data.options[2] : ''}</div>
                </div>
                <div class="form-group option-group">
                    <label>D.</label>
                    <div class="wysiwyg-option mc-option" contenteditable="true" data-option="D" data-placeholder="Đáp án D">${data ? data.options[3] : ''}</div>
                </div>
            </div>
            <div class="form-row-2">
                <div class="form-group">
                    <label>Đáp án đúng</label>
                    <select class="mc-correct form-select">
                        <option value="A" ${data && data.correctAnswer === data.options[0] ? 'selected' : ''}>A</option>
                        <option value="B" ${data && data.correctAnswer === data.options[1] ? 'selected' : ''}>B</option>
                        <option value="C" ${data && data.correctAnswer === data.options[2] ? 'selected' : ''}>C</option>
                        <option value="D" ${data && data.correctAnswer === data.options[3] ? 'selected' : ''}>D</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Lời giải (tùy chọn)</label>
                    <div class="wysiwyg-option mc-explanation" contenteditable="true" data-placeholder="Lời giải chi tiết...">${data && data.explanation ? data.explanation : ''}</div>
                </div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);

    // Setup paste event for image pasting
    const newCard = document.getElementById(`mc-${index}`);
    setupPasteHandler(newCard);
}

function addTFQuestion(data = null) {
    const container = document.getElementById('tfQuestions');
    const index = container.children.length + 1;
    const globalIndex = MC_COUNT + index;

    // Safety check
    if (index > TF_COUNT && !data) return;

    const html = `
        <div class="question-card" id="tf-${index}">
            <div class="question-header">
                <span class="question-number">Câu ${globalIndex}</span>
                <button type="button" class="btn-preview-single" onclick="previewSingleQuestion('tf', ${index})">
                    👁 Xem trước
                </button>
            </div>
            <div class="form-group">
                <label>Nội dung câu hỏi</label>
                <div class="editor-toolbar">
                    <button type="button" data-command="bold" onmousedown="event.preventDefault()" onclick="execCmd('bold', this)" title="In đậm"><b>B</b></button>
                    <button type="button" data-command="italic" onmousedown="event.preventDefault()" onclick="execCmd('italic', this)" title="In nghiêng"><i>I</i></button>
                    <button type="button" data-command="underline" onmousedown="event.preventDefault()" onclick="execCmd('underline', this)" title="Gạch chân"><u>U</u></button>
                    <button type="button" data-command="strikeThrough" onmousedown="event.preventDefault()" onclick="execCmd('strikeThrough', this)" title="Gạch ngang"><s>S</s></button>
                    <span class="toolbar-divider"></span>
                    <button type="button" data-command="superscript" onmousedown="event.preventDefault()" onclick="execCmd('superscript', this)" title="Chỉ số trên">x²</button>
                    <button type="button" data-command="subscript" onmousedown="event.preventDefault()" onclick="execCmd('subscript', this)" title="Chỉ số dưới">x₂</button>
                    <span class="toolbar-divider"></span>
                    <button type="button" onmousedown="event.preventDefault()" onclick="execCmd('justifyLeft')" title="Căn trái">⬅</button>
                    <button type="button" onmousedown="event.preventDefault()" onclick="execCmd('justifyCenter')" title="Căn giữa">⬌</button>
                    <button type="button" onmousedown="event.preventDefault()" onclick="execCmd('justifyRight')" title="Căn phải">➡</button>
                    <span class="toolbar-divider"></span>
                    <button type="button" onmousedown="event.preventDefault()" onclick="insertMathWYSIWYG()" title="Chèn công thức">∑</button>
                    <button type="button" onmousedown="event.preventDefault()" onclick="insertImageWYSIWYG()" title="Chèn ảnh">🖼</button>
                </div>
                <div class="wysiwyg-editor tf-question-text" contenteditable="true" data-placeholder="VD: Xét tính đúng sai của các mệnh đề về đạo hàm...">${data ? data.question : ''}</div>
            </div>
            <div class="tf-options">
                ${['a', 'b', 'c', 'd'].map((label, idx) => `
                <div class="tf-option-row">
                    <label>${label})</label>
                    <div class="wysiwyg-option tf-option-text" contenteditable="true" data-placeholder="Nội dung mệnh đề ${label}...">${data ? data.options[idx] : ''}</div>
                    <select class="tf-answer form-select">
                        <option value="Đúng" ${data && data.correctAnswers[idx] === 'Đúng' ? 'selected' : ''}>Đúng</option>
                        <option value="Sai" ${data && data.correctAnswers[idx] === 'Sai' ? 'selected' : ''}>Sai</option>
                    </select>
                </div>
                `).join('')}
            </div>
            <div class="form-group">
                <label>Lời giải (tùy chọn)</label>
                <div class="wysiwyg-option tf-explanation" contenteditable="true" data-placeholder="Lời giải chi tiết...">${data && data.explanation ? data.explanation : ''}</div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);

    // Setup paste event for image pasting
    const newCard = document.getElementById(`tf-${index}`);
    setupPasteHandler(newCard);
}

function addFillQuestion(data = null) {
    const container = document.getElementById('fillQuestions');
    const index = container.children.length + 1;
    const globalIndex = MC_COUNT + TF_COUNT + index;

    // Safety check
    if (index > FILL_COUNT && !data) return;

    const html = `
        <div class="question-card" id="fill-${index}">
            <div class="question-header">
                <span class="question-number">Câu ${globalIndex}</span>
                <button type="button" class="btn-preview-single" onclick="previewSingleQuestion('fill', ${index})">
                    👁 Xem trước
                </button>
            </div>
            <div class="form-group">
                <label>Nội dung câu hỏi</label>
                <div class="editor-toolbar">
                    <button type="button" data-command="bold" onmousedown="event.preventDefault()" onclick="execCmd('bold', this)" title="In đậm"><b>B</b></button>
                    <button type="button" data-command="italic" onmousedown="event.preventDefault()" onclick="execCmd('italic', this)" title="In nghiêng"><i>I</i></button>
                    <button type="button" data-command="underline" onmousedown="event.preventDefault()" onclick="execCmd('underline', this)" title="Gạch chân"><u>U</u></button>
                    <button type="button" data-command="strikeThrough" onmousedown="event.preventDefault()" onclick="execCmd('strikeThrough', this)" title="Gạch ngang"><s>S</s></button>
                    <span class="toolbar-divider"></span>
                    <button type="button" data-command="superscript" onmousedown="event.preventDefault()" onclick="execCmd('superscript', this)" title="Chỉ số trên">x²</button>
                    <button type="button" data-command="subscript" onmousedown="event.preventDefault()" onclick="execCmd('subscript', this)" title="Chỉ số dưới">x₂</button>
                    <span class="toolbar-divider"></span>
                    <button type="button" onmousedown="event.preventDefault()" onclick="execCmd('justifyLeft')" title="Căn trái">⬅</button>
                    <button type="button" onmousedown="event.preventDefault()" onclick="execCmd('justifyCenter')" title="Căn giữa">⬌</button>
                    <button type="button" onmousedown="event.preventDefault()" onclick="execCmd('justifyRight')" title="Căn phải">➡</button>
                    <span class="toolbar-divider"></span>
                    <button type="button" onmousedown="event.preventDefault()" onclick="insertMathWYSIWYG()" title="Chèn công thức">∑</button>
                    <button type="button" onmousedown="event.preventDefault()" onclick="insertImageWYSIWYG()" title="Chèn ảnh">🖼</button>
                </div>
                <div class="wysiwyg-editor fill-question-text" contenteditable="true" data-placeholder="VD: Cho hàm số f(x) = x³ - 3x² + 2. Giá trị cực đại của hàm số là">${data ? data.question : ''}</div>
            </div>
            <div class="form-row-2">
                <div class="form-group">
                    <label>Đáp án đúng</label>
                    <div class="wysiwyg-option fill-correct" contenteditable="true" data-placeholder="VD: 2">${data ? data.correctAnswer : ''}</div>
                </div>
                <div class="form-group">
                    <label>Lời giải (tùy chọn)</label>
                    <div class="wysiwyg-option fill-explanation" contenteditable="true" data-placeholder="Lời giải chi tiết...">${data && data.explanation ? data.explanation : ''}</div>
                </div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);

    // Setup paste event for image pasting
    const newCard = document.getElementById(`fill-${index}`);
    setupPasteHandler(newCard);
}

function saveExam() {
    const packageId = document.getElementById('examPackageSelect').value;
    const examTitle = document.getElementById('examTitle').value;
    const examTag = document.getElementById('examTag').value || 'THPT Toán';
    const examStatus = document.getElementById('examStatus').value || 'published';
    const editingId = document.getElementById('editingExamId').value;

    // Only title is required - package can be assigned later
    if (!examTitle) {
        alert('Vui lòng nhập tên đề thi!');
        return;
    }

    // Collect MC questions
    const mcCards = document.querySelectorAll('#mcQuestions .question-card');
    const mcQuestions = [];
    let questionId = 1;

    mcCards.forEach(card => {
        const questionText = card.querySelector('.mc-question-text').innerHTML || '';
        const options = Array.from(card.querySelectorAll('.mc-option')).map(opt => opt.innerHTML || '');
        const correctIndex = card.querySelector('.mc-correct').value;
        const explanation = card.querySelector('.mc-explanation')?.innerHTML || '';

        mcQuestions.push({
            id: questionId++,
            question: questionText,
            type: 'multiple-choice',
            options: options,
            correctAnswer: options[correctIndex.charCodeAt(0) - 65],
            explanation: explanation || null
        });
    });

    // Collect TF questions
    const tfCards = document.querySelectorAll('#tfQuestions .question-card');
    const tfQuestions = [];

    tfCards.forEach(card => {
        const questionText = card.querySelector('.tf-question-text')?.innerHTML || '';
        const optionTexts = Array.from(card.querySelectorAll('.tf-option-text')).map(opt => opt.innerHTML || '');
        const answers = Array.from(card.querySelectorAll('.tf-answer')).map(sel => sel.value);
        const explanation = card.querySelector('.tf-explanation')?.innerHTML || '';

        tfQuestions.push({
            id: questionId++,
            question: questionText,
            type: 'true-false',
            options: optionTexts,
            correctAnswers: answers,
            explanation: explanation || null
        });
    });

    // Collect Fill questions
    const fillCards = document.querySelectorAll('#fillQuestions .question-card');
    const fillQuestions = [];

    fillCards.forEach(card => {
        const questionText = card.querySelector('.fill-question-text')?.innerHTML || '';
        const correctAnswer = card.querySelector('.fill-correct')?.innerHTML || '';
        const explanation = card.querySelector('.fill-explanation')?.innerHTML || '';

        fillQuestions.push({
            id: questionId++,
            question: questionText,
            type: 'fill-in-blank',
            correctAnswer: correctAnswer,
            explanation: explanation || null
        });
    });

    // Create or update exam object
    const uniqueId = editingId || generateExamId();

    const newExam = {
        id: uniqueId,
        displayId: uniqueId, // For UI display
        packageId: packageId,
        title: examTitle,
        tag: examTag,
        status: examStatus,
        duration: 90,
        questions: [...mcQuestions, ...tfQuestions, ...fillQuestions],
        createdAt: editingId ? (getAllExams().find(e => e.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        createdBy: currentAdmin.username
    };

    // Save exam
    let exams = getAllExams();
    if (editingId) {
        const index = exams.findIndex(e => e.id === editingId);
        if (index !== -1) exams[index] = newExam;
    } else {
        exams.push(newExam);
    }
    saveAllExams(exams);

    alert('Đã lưu đề thi thành công!');

    // Return to list
    showExamList();
    updateDashboardStats();
}

// ========== ADMIN MANAGEMENT ==========
function renderAdmins() {
    const admins = getAdmins();
    const tbody = document.getElementById('adminsTableBody');

    tbody.innerHTML = admins.map(admin => `
        <tr>
            <td>${admin.id}</td>
            <td>${admin.name}</td>
            <td>${admin.username}</td>
            <td>${getRoleName(admin.role)}</td>
            <td>
                ${admin.username !== 'admin' ?
            `<button class="btn-action btn-delete" onclick="deleteAdmin(${admin.id})">🗑️ Xóa</button>` :
            '<span class="text-muted">Không thể xóa</span>'
        }
            </td>
        </tr>
    `).join('');
}

function showAdminModal() {
    document.getElementById('adminModal').classList.add('active');
    document.getElementById('adminForm').reset();
}

function closeAdminModal() {
    document.getElementById('adminModal').classList.remove('active');
}

function saveNewAdmin(event) {
    event.preventDefault();

    const admins = getAdmins();
    const newAdmin = {
        id: Date.now(),
        name: document.getElementById('newAdminName').value,
        username: document.getElementById('newAdminUsername').value,
        password: document.getElementById('newAdminPassword').value,
        role: document.getElementById('newAdminRole').value
    };

    // Check duplicate username
    if (admins.find(a => a.username === newAdmin.username)) {
        alert('Tên đăng nhập đã tồn tại!');
        return;
    }

    admins.push(newAdmin);
    saveAdmins(admins);

    closeAdminModal();
    renderAdmins();
    alert('Đã thêm admin mới!');
}

function deleteAdmin(adminId) {
    if (!confirm('Bạn có chắc muốn xóa admin này?')) return;

    let admins = getAdmins();
    admins = admins.filter(a => a.id !== adminId);
    saveAdmins(admins);
    renderAdmins();
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', function () {
    // Check if already logged in
    const storedAdmin = localStorage.getItem('luyende_currentAdmin');
    if (storedAdmin) {
        currentAdmin = JSON.parse(storedAdmin);
        showAdminDashboard();
    }
    // Load contact settings
    loadContactSettings();
});

// ========== SETTINGS ==========
function loadContactSettings() {
    const settings = JSON.parse(localStorage.getItem('luyende_contactSettings') || '{}');
    if (document.getElementById('contactZalo')) {
        document.getElementById('contactZalo').value = settings.zalo || '';
        document.getElementById('contactFacebook').value = settings.facebook || '';
        document.getElementById('contactTelegram').value = settings.telegram || '';
    }
}

function saveContactSettings(event) {
    event.preventDefault();
    const settings = {
        zalo: document.getElementById('contactZalo').value,
        facebook: document.getElementById('contactFacebook').value,
        telegram: document.getElementById('contactTelegram').value
    };
    localStorage.setItem('luyende_contactSettings', JSON.stringify(settings));
    alert('Đã lưu cài đặt liên hệ!');
}

function createTestUser() {
    const users = getUsers();
    const testId = Date.now();
    const testUser = {
        id: testId,
        name: 'Nguyễn Văn Test',
        email: 'test@example.com',
        username: 'testuser',
        password: 'test123',
        createdAt: new Date().toISOString(),
        activatedPackages: []
    };
    users.push(testUser);
    localStorage.setItem('luyende_users', JSON.stringify(users));
    renderUsers();
    updateDashboardStats();
    alert('Đã tạo tài khoản test!\n\nUsername: testuser\nPassword: test123');
}

// ========== HISTORY MANAGEMENT ==========
function getAllHistory() {
    // Get all history from all users
    const users = getUsers();
    const packages = getPackages();
    let allHistory = [];

    users.forEach(user => {
        const userHistory = JSON.parse(localStorage.getItem(`luyende_history_${user.id}`) || '[]');
        userHistory.forEach(h => {
            allHistory.push({
                ...h,
                userId: user.id,
                userName: user.name,
                userUsername: user.username
            });
        });
    });

    // Sort by date descending (most recent first)
    allHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
    return allHistory;
}

function renderAllHistory(filterText = '', packageFilter = '') {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    const history = getAllHistory();
    const packages = getPackages();

    // Populate package filter dropdown
    const packageSelect = document.getElementById('historyPackageFilter');
    if (packageSelect && packageSelect.options.length <= 1) {
        packages.forEach(pkg => {
            const option = document.createElement('option');
            option.value = pkg.id;
            option.textContent = pkg.name;
            packageSelect.appendChild(option);
        });
    }

    // Filter history
    let filtered = history;
    if (filterText) {
        const search = filterText.toLowerCase();
        filtered = filtered.filter(h =>
            h.userName?.toLowerCase().includes(search) ||
            h.userUsername?.toLowerCase().includes(search)
        );
    }
    if (packageFilter) {
        filtered = filtered.filter(h => h.packageId === packageFilter);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#666;">Chưa có lịch sử làm bài nào</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map((h, index) => {
        const pkg = packages.find(p => p.id === h.packageId);
        const pkgName = pkg ? pkg.name : h.packageId || 'N/A';
        const date = h.date ? new Date(h.date).toLocaleDateString('vi-VN') + ' ' + new Date(h.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'N/A';

        return `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <strong>${h.userName || 'N/A'}</strong><br>
                    <small style="color:#666;">@${h.userUsername || 'N/A'}</small>
                </td>
                <td>${pkgName}</td>
                <td>${h.examTitle || 'N/A'}</td>
                <td><strong style="color: ${parseFloat(h.score) >= 5 ? '#10b981' : '#ef4444'}">${h.score || 'N/A'}</strong></td>
                <td>${h.actualTime || 'N/A'}</td>
                <td>${date}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewHistoryDetail('${h.odl}')">Xem chi tiết</button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterHistory() {
    const filterText = document.getElementById('historySearchInput')?.value || '';
    const packageFilter = document.getElementById('historyPackageFilter')?.value || '';
    renderAllHistory(filterText, packageFilter);
}

function clearHistorySearch() {
    const searchInput = document.getElementById('historySearchInput');
    const packageFilter = document.getElementById('historyPackageFilter');
    if (searchInput) searchInput.value = '';
    if (packageFilter) packageFilter.value = '';
    renderAllHistory();
}

function viewHistoryDetail(odl) {
    // Find the history entry
    const history = getAllHistory();
    const entry = history.find(h => h.odl === odl);
    if (!entry) {
        alert('Không tìm thấy thông tin bài làm!');
        return;
    }

    // Show detailed modal (simplified version - can be enhanced later)
    let details = `
📋 Chi tiết bài làm

👤 Học sinh: ${entry.userName} (@${entry.userUsername})
📝 Đề thi: ${entry.examTitle}
📊 Điểm số: ${entry.score}
⏱️ Thời gian làm: ${entry.actualTime}
📅 Ngày làm: ${new Date(entry.date).toLocaleString('vi-VN')}
✅ Số câu đúng: ${entry.correct || 'N/A'}/${entry.total || 'N/A'}
    `;
    alert(details);
}

// Helper: Generate Sequential ID starting from 1000
function generateExamId() {
    const STORAGE_KEY = 'luyende_examIdCounter';
    let counter = parseInt(localStorage.getItem(STORAGE_KEY)) || 1000;
    const newId = counter.toString();
    localStorage.setItem(STORAGE_KEY, (counter + 1).toString());
    return newId;
}

// ========== PREVIEW FUNCTIONALITY ==========
function previewExam() {
    const previewContent = document.getElementById('previewContent');
    let html = '';

    // Preview MC Questions
    html += '<h3 style="margin-bottom: 16px; color: #1e293b;">Phần I: Trắc nghiệm</h3>';
    document.querySelectorAll('#mcQuestions .question-card').forEach((card, idx) => {
        const questionText = card.querySelector('.mc-question-text')?.innerHTML || '';
        const options = Array.from(card.querySelectorAll('.mc-option')).map(opt => opt.innerHTML || '');
        const correctLetter = card.querySelector('.mc-correct')?.value || 'A';
        const correctIdx = ['A', 'B', 'C', 'D'].indexOf(correctLetter);

        html += `
            <div class="preview-question">
                <div class="preview-question-header">
                    <span class="preview-question-number">Câu ${idx + 1}</span>
                    <span class="preview-question-type">Trắc nghiệm</span>
                </div>
                <div class="preview-question-content">${questionText}</div>
                <div class="preview-options">
                    ${['A', 'B', 'C', 'D'].map((letter, i) => `
                        <div class="preview-option ${i === correctIdx ? 'correct' : ''}">
                            <span class="preview-option-label">${letter}</span>
                            <span>${options[i] || ''}</span>
                            ${i === correctIdx ? '<span style="margin-left: auto; color: #22c55e; font-weight: 600;">✓ Đáp án đúng</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    // Preview TF Questions
    html += '<h3 style="margin: 24px 0 16px; color: #1e293b;">Phần II: Đúng/Sai</h3>';
    document.querySelectorAll('#tfQuestions .question-card').forEach((card, idx) => {
        const questionText = card.querySelector('.tf-question-text')?.innerHTML || '';
        const statements = [];
        card.querySelectorAll('.tf-option-row').forEach((row, sIdx) => {
            const text = row.querySelector('.tf-option-text')?.innerHTML || '';
            const answer = row.querySelector('.tf-answer')?.value || 'Đúng';
            statements.push({ text, isCorrect: answer === 'Đúng' });
        });

        html += `
            <div class="preview-question">
                <div class="preview-question-header">
                    <span class="preview-question-number">Câu ${MC_COUNT + idx + 1}</span>
                    <span class="preview-question-type">Đúng/Sai</span>
                </div>
                <div class="preview-question-content">${questionText}</div>
                <div class="preview-options">
                    ${statements.map((s, i) => `
                        <div class="preview-option">
                            <span class="preview-option-label">${String.fromCharCode(97 + i)})</span>
                            <span>${s.text}</span>
                            <span style="margin-left: auto; font-weight: 600; color: ${s.isCorrect ? '#22c55e' : '#ef4444'};">
                                ${s.isCorrect ? '✓ Đúng' : '✗ Sai'}
                            </span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    // Preview Fill Questions
    html += '<h3 style="margin: 24px 0 16px; color: #1e293b;">Phần III: Trả lời ngắn</h3>';
    document.querySelectorAll('#fillQuestions .question-card').forEach((card, idx) => {
        const questionText = card.querySelector('.fill-question-text')?.innerHTML || '';
        const answer = card.querySelector('.fill-correct')?.innerHTML || '';

        html += `
            <div class="preview-question">
                <div class="preview-question-header">
                    <span class="preview-question-number">Câu ${MC_COUNT + TF_COUNT + idx + 1}</span>
                    <span class="preview-question-type">Trả lời ngắn</span>
                </div>
                <div class="preview-question-content">${questionText}</div>
                <div class="preview-options">
                    <div class="preview-option correct">
                        <span class="preview-option-label">→</span>
                        <span>Đáp án: <strong>${answer}</strong></span>
                    </div>
                </div>
            </div>
        `;
    });

    previewContent.innerHTML = html;
    document.getElementById('examPreviewModal').classList.add('active');

    // Render LaTeX after modal is shown
    renderMathInPreview();
}

function closePreviewModal() {
    document.getElementById('examPreviewModal').classList.remove('active');
}

// Render $...$ LaTeX syntax to proper display
function renderLatex(text) {
    if (!text) return '';
    // Replace $...$ with span for MathJax to process
    return text.replace(/\$([^$]+)\$/g, '<span class="math-formula">\\($1\\)</span>');
}

// Trigger MathJax to render math in preview
function renderMathInPreview() {
    if (typeof MathJax !== 'undefined') {
        MathJax.typesetPromise && MathJax.typesetPromise([document.getElementById('previewContent')]);
    }
}

// Save and create new exam
function saveExamAndNew() {
    saveExam();
    // Reset form for new exam after a short delay
    setTimeout(() => {
        document.getElementById('editingExamId').value = '';
        document.getElementById('examTitle').value = '';
        document.getElementById('examTag').value = '';
        initExamCreator();
        alert('Đề thi đã được lưu. Bạn có thể soạn đề mới!');
    }, 500);
}

// ========== SINGLE QUESTION PREVIEW ==========
function previewSingleQuestion(type, index) {
    const card = document.getElementById(`${type}-${index}`);
    if (!card) return;

    let questionText = '';
    let optionsHtml = '';
    let questionNumber = index;

    if (type === 'mc') {
        questionText = card.querySelector('.mc-question-text')?.innerHTML || '';
        const options = Array.from(card.querySelectorAll('.mc-option')).map(opt => opt.innerHTML || '');
        const correctLetter = card.querySelector('.mc-correct')?.value || 'A';
        const correctIdx = ['A', 'B', 'C', 'D'].indexOf(correctLetter);

        optionsHtml = ['A', 'B', 'C', 'D'].map((letter, i) => `
            <div class="exam-preview-option ${i === correctIdx ? 'correct' : ''}">
                <span class="exam-preview-option-label">${letter}</span>
                <span class="exam-preview-option-text">${options[i] || ''}</span>
            </div>
        `).join('');
    }
    else if (type === 'tf') {
        questionNumber = MC_COUNT + index;
        questionText = card.querySelector('.tf-question-text')?.innerHTML || '';
        const statements = [];
        card.querySelectorAll('.tf-option-row').forEach((row, sIdx) => {
            const text = row.querySelector('.tf-option-text')?.innerHTML || '';
            const answer = row.querySelector('.tf-answer')?.value || 'Đúng';
            statements.push({ text, isCorrect: answer === 'Đúng' });
        });

        optionsHtml = statements.map((s, i) => `
            <div class="exam-preview-option">
                <span class="exam-preview-option-label">${String.fromCharCode(97 + i)})</span>
                <span class="exam-preview-option-text">${s.text}</span>
                <span style="margin-left: auto; font-weight: 600; color: ${s.isCorrect ? '#22c55e' : '#ef4444'};">
                    ${s.isCorrect ? '✓ Đúng' : '✗ Sai'}
                </span>
            </div>
        `).join('');
    }
    else if (type === 'fill') {
        questionNumber = MC_COUNT + TF_COUNT + index;
        questionText = card.querySelector('.fill-question-text')?.innerHTML || '';
        const answer = card.querySelector('.fill-correct')?.innerHTML || '';

        optionsHtml = `
            <div class="exam-preview-option correct">
                <span class="exam-preview-option-label">→</span>
                <span class="exam-preview-option-text">Đáp án: <strong>${answer}</strong></span>
            </div>
        `;
    }

    // Render exam-like preview (matching actual exam interface)
    const html = `
        <div class="exam-like-preview">
            <div class="exam-preview-question-text">
                <strong>Câu ${questionNumber}:</strong> ${renderLatex(questionText)}
            </div>
            <div class="exam-preview-options">
                ${optionsHtml}
            </div>
        </div>
    `;

    document.getElementById('singlePreviewTitle').textContent = `Xem trước Câu ${questionNumber}`;
    document.getElementById('singlePreviewContent').innerHTML = html;
    document.getElementById('singlePreviewModal').classList.add('active');

    // Render math
    if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
        MathJax.typesetPromise([document.getElementById('singlePreviewContent')]);
    }
}

function closeSinglePreviewModal() {
    document.getElementById('singlePreviewModal').classList.remove('active');
}

// ========== WYSIWYG TOOLBAR FUNCTIONS ==========

// Track the last focused editor for toolbar commands
let lastFocusedEditor = null;
let savedSelection = null;

// Save selection when focusing on an editor
document.addEventListener('focusin', function (e) {
    if (e.target.matches('.wysiwyg-editor, .wysiwyg-option')) {
        lastFocusedEditor = e.target;
    }
});

// Save selection on selection change and update toolbar state
document.addEventListener('selectionchange', function () {
    const sel = window.getSelection();
    if (sel.rangeCount > 0 && lastFocusedEditor) {
        const range = sel.getRangeAt(0);
        if (lastFocusedEditor.contains(range.commonAncestorContainer)) {
            savedSelection = range.cloneRange();
            // Sync toolbar buttons with actual formatting state
            updateToolbarState();
        }
    }
});

// Execute formatting command on contenteditable (toggle mode)
function execCmd(command, btn = null) {
    // Restore focus and selection
    if (lastFocusedEditor) {
        lastFocusedEditor.focus();
        if (savedSelection) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedSelection);
        }
    } else {
        // Find first editor if none focused
        const editor = document.querySelector('.wysiwyg-editor');
        if (editor) {
            editor.focus();
            lastFocusedEditor = editor;
        }
    }

    // For alignment commands, also apply to selected images
    if (command.startsWith('justify')) {
        const selectedImage = document.querySelector('.image-container.selected');
        if (selectedImage) {
            const align = command.replace('justify', '').toLowerCase();

            // Create or get alignment wrapper
            let wrapper = selectedImage.parentElement;
            if (!wrapper.classList.contains('image-align-wrapper')) {
                wrapper = document.createElement('div');
                wrapper.className = 'image-align-wrapper';
                selectedImage.parentNode.insertBefore(wrapper, selectedImage);
                wrapper.appendChild(selectedImage);
            }

            // Apply alignment to wrapper
            wrapper.style.textAlign = align === 'left' ? 'left' : (align === 'center' ? 'center' : 'right');
            wrapper.style.display = 'block';
            wrapper.style.width = '100%';

            return; // Don't apply text alignment to text if image
        }
    }
    // Execute the command
    document.execCommand(command, false, null);

    // Update toolbar to reflect actual formatting state
    updateToolbarState();
}

// Update toolbar button active states based on current selection
function updateToolbarState() {
    document.querySelectorAll('.editor-toolbar').forEach(toolbar => {
        const commands = ['bold', 'italic', 'underline', 'strikeThrough', 'superscript', 'subscript'];
        commands.forEach(cmd => {
            const btn = toolbar.querySelector(`[data-command="${cmd}"]`);
            if (btn) {
                btn.classList.toggle('active', document.queryCommandState(cmd));
            }
        });
    });
}

// Insert math formula at cursor position
function insertMathWYSIWYG() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const mathSpan = document.createElement('span');
    mathSpan.className = 'math-inline';
    mathSpan.innerHTML = '$x^2 + y^2$';
    mathSpan.style.fontStyle = 'italic';
    mathSpan.style.color = '#1e40af';

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(mathSpan);

    // Select the math content for easy editing
    selection.selectAllChildren(mathSpan);
}

// Insert image via file picker
function insertImageWYSIWYG() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';

    fileInput.onchange = function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            insertImageAtCursor(e.target.result);
        };
        reader.readAsDataURL(file);
    };

    fileInput.click();
}

// Insert image at current cursor position
function insertImageAtCursor(src) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    // Create image container with resize handles (like Khaothi)
    const wrapper = document.createElement('div');
    wrapper.className = 'image-container';
    wrapper.contentEditable = 'false';
    wrapper.innerHTML = `
        <img src="${src}" alt="Hình minh họa">
        <div class="resize-frame">
            <div class="resize-handle nw" data-dir="nw"></div>
            <div class="resize-handle ne" data-dir="ne"></div>
            <div class="resize-handle sw" data-dir="sw"></div>
            <div class="resize-handle se" data-dir="se"></div>
        </div>
    `;

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(wrapper);

    // Move cursor after image
    range.setStartAfter(wrapper);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    // Setup click to select and resize
    setupImageContainer(wrapper);
}

// Setup image container with selection and resize
function setupImageContainer(container) {
    const img = container.querySelector('img');
    const frame = container.querySelector('.resize-frame');
    if (!img || !frame) return;

    // Click to select/deselect
    container.addEventListener('click', function (e) {
        e.stopPropagation();
        // Deselect all other images
        document.querySelectorAll('.image-container.selected').forEach(c => {
            if (c !== container) c.classList.remove('selected');
        });
        container.classList.toggle('selected');
    });

    // Resize handles
    const handles = container.querySelectorAll('.resize-handle');
    handles.forEach(handle => {
        handle.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const dir = handle.dataset.dir;
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = img.offsetWidth;
            const startHeight = img.offsetHeight;
            const aspectRatio = startWidth / startHeight;

            function resize(e) {
                let newWidth = startWidth;
                let newHeight = startHeight;

                if (dir.includes('e')) newWidth = startWidth + (e.clientX - startX);
                if (dir.includes('w')) newWidth = startWidth - (e.clientX - startX);
                if (dir.includes('s')) newHeight = startHeight + (e.clientY - startY);
                if (dir.includes('n')) newHeight = startHeight - (e.clientY - startY);

                // Maintain aspect ratio when dragging corners
                if (dir.length === 2) {
                    newHeight = newWidth / aspectRatio;
                }

                img.style.width = Math.max(50, newWidth) + 'px';
                img.style.height = Math.max(50, newHeight) + 'px';
            }

            function stopResize() {
                document.removeEventListener('mousemove', resize);
                document.removeEventListener('mouseup', stopResize);
            }

            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
        });
    });
}

// Click outside to deselect images
document.addEventListener('click', function (e) {
    if (!e.target.closest('.image-container')) {
        document.querySelectorAll('.image-container.selected').forEach(c => {
            c.classList.remove('selected');
        });
    }
});

// Legacy function kept for compatibility
function makeImageResizable(wrapper) {
    setupImageContainer(wrapper);
}

// Setup paste handler for Ctrl+V image pasting
function setupPasteHandler(container) {
    const editors = container.querySelectorAll('[contenteditable="true"]');

    editors.forEach(editor => {
        editor.addEventListener('paste', function (e) {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    const reader = new FileReader();

                    reader.onload = function (e) {
                        insertImageIntoEditor(editor, e.target.result);
                    };

                    reader.readAsDataURL(file);
                    break;
                }
            }
        });
    });
}

// Insert image into specific editor
function insertImageIntoEditor(editor, src) {
    editor.focus();

    const wrapper = document.createElement('div');
    wrapper.className = 'image-container';
    wrapper.contentEditable = 'false';
    wrapper.innerHTML = `
        <img src="${src}" alt="Hình minh họa">
        <div class="resize-frame">
            <div class="resize-handle nw" data-dir="nw"></div>
            <div class="resize-handle ne" data-dir="ne"></div>
            <div class="resize-handle sw" data-dir="sw"></div>
            <div class="resize-handle se" data-dir="se"></div>
        </div>
    `;

    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(wrapper);
        range.setStartAfter(wrapper);
        range.collapse(true);
    } else {
        editor.appendChild(wrapper);
    }

    setupImageContainer(wrapper);
}

// Update saveExam to get innerHTML from contenteditable
function getEditorContent(selector) {
    const editor = document.querySelector(selector);
    return editor ? editor.innerHTML : '';
}

// Legacy functions kept for compatibility
function formatText(btn, format) {
    execCmd(format);
}

function insertMath(btn) {
    insertMathWYSIWYG();
}

function insertImage(btn) {
    insertImageWYSIWYG();
}

