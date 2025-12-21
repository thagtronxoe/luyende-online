// ========== ADMIN AUTH ==========
const DEFAULT_ADMINS = [
    { id: 1, name: 'Super Admin', username: 'admin', password: '240707', role: 'super' }
];

let currentAdmin = null;

async function getAdmins() {
    try {
        const admins = await apiGetAdmins();
        return Array.isArray(admins) ? admins : [];
    } catch (err) {
        console.error('Error fetching admins:', err);
        return [];
    }
}

async function handleAdminLogin(event) {
    event.preventDefault();
    console.log('handleAdminLogin called');

    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    console.log('Login attempt:', username);

    try {
        const admin = await apiAdminLogin(username, password);
        console.log('Login success:', admin);
        currentAdmin = admin;
        showAdminDashboard();
    } catch (err) {
        console.error('Login error:', err);
        alert(err.message || 'Tên đăng nhập hoặc mật khẩu không đúng!');
    }
}

function handleAdminLogout() {
    currentAdmin = null;
    apiLogout(); // Clear token
    showScreen('adminLoginScreen');
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function showAdminDashboard() {
    document.getElementById('currentAdminName').textContent = currentAdmin.name;
    document.getElementById('currentAdminRole').textContent = getRoleName(currentAdmin.role);

    // Hide tabs based on role
    const isEditor = currentAdmin.role === 'editor';

    // Get all nav items
    const navItems = document.querySelectorAll('.admin-nav-item');
    navItems.forEach(item => {
        const tabName = item.getAttribute('data-tab');
        if (isEditor && tabName !== 'exams') {
            item.style.display = 'none';
        } else {
            item.style.display = '';
        }
    });

    // Only load what's needed based on role
    if (isEditor) {
        // Editor only sees Exam Creation
        initExamCreator();
        showAdminTab('exams');
    } else {
        // Full admin
        updateDashboardStats();
        renderUsers();
        renderPackages();
        renderAdmins();
        initExamCreator();
        showScreen('adminDashboard');
    }
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
async function showAdminTab(tabName) {
    // Update nav items - find by data-tab attribute
    document.querySelectorAll('.admin-nav-item').forEach(item => item.classList.remove('active'));
    const navItem = document.querySelector(`.admin-nav-item[data-tab="${tabName}"]`);
    if (navItem) navItem.classList.add('active');

    // Show screen first (for editor redirect)
    showScreen('adminDashboard');

    // Update tabs
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
    const tabElement = document.getElementById(tabName + 'Tab');
    if (tabElement) tabElement.classList.add('active');

    // Refresh data when switching tabs
    if (tabName === 'users') await renderUsers();
    if (tabName === 'packages') await renderPackages();
    if (tabName === 'exams') await showExamList();
    if (tabName === 'dashboard') await updateDashboardStats();
    if (tabName === 'history') await renderAllHistory();
}

// ========== DASHBOARD STATS ==========
async function updateDashboardStats() {
    try {
        const users = await getUsers();
        const packages = await getPackages();
        const exams = await getAllExams();
        const history = getExamHistory();

        document.getElementById('totalUsers').textContent = users.length;
        document.getElementById('totalPackages').textContent = packages.length;
        document.getElementById('totalExams').textContent = exams.length;
        document.getElementById('totalAttempts').textContent = history.length;
    } catch (err) {
        console.error('Error updating stats:', err);
    }
}

// ========== USER MANAGEMENT ==========
let cachedUsers = [];

async function getUsers() {
    try {
        cachedUsers = await apiGetUsers();
        return cachedUsers;
    } catch (err) {
        console.error('Error loading users:', err);
        return cachedUsers;
    }
}

async function renderUsers(filterText = '') {
    const users = await getUsers();
    const packages = await getPackages();
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
            <td>${user._id || user.id}</td>
            <td>${user.name}</td>
            <td>${user.email || 'N/A'}</td>
            <td>${user.username}</td>
            <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'N/A'}</td>
            <td><span class="badge ${pkgCount > 0 ? 'badge-success' : 'badge-secondary'}">${pkgCount}/${packages.length} gói</span></td>
            <td>
                <button class="btn-action btn-edit" onclick="showUserDetail('${user._id || user.id}')">👁 Xem</button>
                <button class="btn-action btn-delete" onclick="deleteUser('${user._id || user.id}')">🗑️ Xóa</button>
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

async function showUserDetail(userId) {
    const users = await getUsers();
    const packages = await getPackages();
    const user = users.find(u => (u._id || u.id) === userId);
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
    // Render package checkboxes (only packages that require restriction)
    const activatedPkgs = user.activatedPackages || [];
    const restrictedPackages = packages.filter(p => p.accessType === 'register');

    if (restrictedPackages.length === 0) {
        document.getElementById('userPackagesList').innerHTML = '<p class="text-muted">Không có gói nào cần kích hoạt riêng.</p>';
    } else {
        document.getElementById('userPackagesList').innerHTML = restrictedPackages.map(pkg => `
            <label class="package-checkbox">
                <input type="checkbox" value="${pkg.id}" ${activatedPkgs.includes(pkg.id) ? 'checked' : ''}>
                <span class="package-checkbox-icon">${pkg.icon}</span>
                <span class="package-checkbox-name">${pkg.name}</span>
            </label>
        `).join('');
    }

    document.getElementById('userDetailModal').classList.add('active');
}

function closeUserDetailModal() {
    document.getElementById('userDetailModal').classList.remove('active');
}

async function saveUserPackages() {
    const userId = document.getElementById('detailUserId').value;

    // Get selected packages
    const checkboxes = document.querySelectorAll('#userPackagesList input[type="checkbox"]');
    const activatedPackages = [];
    checkboxes.forEach(cb => {
        if (cb.checked) activatedPackages.push(cb.value);
    });

    try {
        await apiUpdateUserPackages(userId, activatedPackages);
        alert('Đã cập nhật gói cho học sinh!');
        closeUserDetailModal();
        await renderUsers();
    } catch (err) {
        alert('Lỗi cập nhật: ' + err.message);
    }
}

async function resetUserPassword() {
    const userId = document.getElementById('detailUserId').value;
    const newPassword = prompt('Nhập mật khẩu mới cho người dùng (ít nhất 6 ký tự):');

    if (!newPassword) return;
    if (newPassword.length < 6) {
        alert('Mật khẩu phải có ít nhất 6 ký tự!');
        return;
    }

    if (!confirm(`Bạn có chắc muốn đặt lại mật khẩu thành "${newPassword}"?`)) return;

    try {
        await apiResetUserPassword(userId, newPassword);
        alert('Đã đặt lại mật khẩu thành công!');
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
}


async function deleteUser(userId) {
    if (!confirm('Bạn có chắc muốn xóa người dùng này?')) return;

    try {
        await apiDeleteUser(userId);
        await renderUsers();
        await updateDashboardStats();
    } catch (err) {
        alert('Lỗi xóa user: ' + err.message);
    }
}

// ========== PACKAGE MANAGEMENT ==========
let cachedPackages = [];

async function getPackages() {
    try {
        cachedPackages = await apiGetPackages();
        return cachedPackages;
    } catch (err) {
        console.error('Error loading packages:', err);
        return cachedPackages;
    }
}

async function createPackage(packageData) {
    try {
        await apiCreatePackage(packageData);
        return true;
    } catch (err) {
        console.error('Error creating package:', err);
        alert('Lỗi tạo gói đề: ' + err.message);
        return false;
    }
}

async function updatePackage(packageId, packageData) {
    try {
        await apiUpdatePackage(packageId, packageData);
        return true;
    } catch (err) {
        console.error('Error updating package:', err);
        alert('Lỗi cập nhật gói đề: ' + err.message);
        return false;
    }
}

async function renderPackages() {
    const packages = await getPackages();
    const grid = document.getElementById('adminPackagesGrid');

    // Pre-load exam counts
    const examCounts = {};
    for (const pkg of packages) {
        const pkgId = pkg._id || pkg.id;
        examCounts[pkgId] = await countExamsInPackage(pkgId);
    }

    grid.innerHTML = packages.map(pkg => {
        const pkgId = pkg._id || pkg.id;
        return `
        <div class="admin-package-card">
            <div class="package-icon">${pkg.icon}</div>
            <div class="package-name">${pkg.name}</div>
            <div class="package-description">${pkg.description}</div>
            <div class="package-meta">
                <span>⏱️ ${pkg.duration} phút</span>
                <span>📝 ${examCounts[pkgId] || 0} đề</span>
            </div>
            <div class="package-actions">
                <button class="btn-action btn-edit" onclick="editPackage('${pkgId}')">✏️ Sửa</button>
                <button class="btn-action btn-delete" onclick="deletePackage('${pkgId}')">🗑️ Xóa</button>
            </div>
        </div>
    `}).join('');

    // Update package select in exam creator
    await updatePackageSelect();
}


async function countExamsInPackage(packageId) {
    try {
        const exams = await apiGetAdminExams(packageId);
        return exams.length;
    } catch (err) {
        return 0;
    }
}

async function updatePackageSelect() {
    console.log('📦 updatePackageSelect called');
    const packages = await getPackages();
    console.log('📦 packages loaded:', packages?.length, packages);

    const select = document.getElementById('examPackageSelect');
    console.log('📦 select element:', select);
    if (!select) return;

    select.innerHTML = '<option value="">-- Chọn gói đề --</option>' +
        packages.map(pkg => {
            const pkgId = pkg._id || pkg.id;
            return `<option value="${pkgId}">${pkg.name}</option>`;
        }).join('');
    console.log('📦 dropdown updated with', packages?.length, 'options');
}

function showPackageModal() {
    document.getElementById('packageModal').classList.add('active');
    document.getElementById('packageForm').reset();
    document.getElementById('packageForm').dataset.editId = '';
}

function closePackageModal() {
    document.getElementById('packageModal').classList.remove('active');
}

async function savePackage(event) {
    event.preventDefault();

    const editId = document.getElementById('packageForm').dataset.editId;

    const packageData = {
        id: editId || 'pkg-' + Date.now(), // Fixed: pkg- prefix
        name: document.getElementById('packageName').value,
        description: document.getElementById('packageDesc').value,
        icon: document.getElementById('packageIcon').value || '📝',
        duration: parseInt(document.getElementById('packageDuration').value) || 90,
        accessType: document.getElementById('packageAccessType').value || 'open'
    };

    let success;
    if (editId) {
        success = await updatePackage(editId, packageData);
    } else {
        success = await createPackage(packageData);
    }

    if (success) {
        closePackageModal();
        await renderPackages();
        await updateDashboardStats();
    }
}

async function editPackage(packageId) {
    const packages = await getPackages();
    const pkg = packages.find(p => (p._id || p.id) === packageId);
    if (!pkg) return;

    document.getElementById('packageName').value = pkg.name;
    document.getElementById('packageDesc').value = pkg.description;
    document.getElementById('packageIcon').value = pkg.icon;
    document.getElementById('packageDuration').value = pkg.duration;
    document.getElementById('packageAccessType').value = pkg.accessType || 'open';
    document.getElementById('packageForm').dataset.editId = packageId;

    document.getElementById('packageModal').classList.add('active');
}

async function deletePackage(packageId) {
    if (!confirm('Bạn có chắc muốn xóa gói đề này? Các đề thi trong gói cũng sẽ bị xóa!')) return;

    try {
        await apiDeletePackage(packageId);
        await renderPackages();
        await updateDashboardStats();
    } catch (err) {
        alert('Lỗi xóa gói đề: ' + err.message);
    }
}

// ========== EXAM MANAGEMENT ==========
let cachedExams = [];

async function getAllExams() {
    try {
        const result = await apiGetAdminExams();
        // Ensure we always return an array
        cachedExams = Array.isArray(result) ? result : [];
        return cachedExams;
    } catch (err) {
        console.error('Error loading exams:', err);
        return cachedExams || [];
    }
}

async function createExam(examData) {
    try {
        await apiCreateExam(examData);
        return true;
    } catch (err) {
        console.error('Error creating exam:', err);
        alert('Lỗi tạo đề: ' + err.message);
        return false;
    }
}

async function updateExamAPI(examId, examData) {
    try {
        await apiUpdateExam(examId, examData);
        return true;
    } catch (err) {
        console.error('Error updating exam:', err);
        alert('Lỗi cập nhật đề: ' + err.message);
        return false;
    }
}

function getExamHistory() {
    const stored = localStorage.getItem('luyende_examHistory');
    if (stored) return JSON.parse(stored);
    return [];
}

async function renderExams() {
    let exams = await getAllExams();
    const packages = await getPackages();
    const tbody = document.getElementById('examsTableBody');

    // Defensive check - ensure exams is an array
    if (!Array.isArray(exams)) {
        console.error('Exams is not an array:', exams);
        exams = [];
    }

    if (exams.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Chưa có đề thi nào</td></tr>';
        return;
    }

    // Apply search filter if provided
    const searchInput = document.getElementById('examSearchInput');
    const searchText = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let filteredExams = exams;
    if (searchText) {
        filteredExams = exams.filter(exam => {
            const examId = (exam._id || exam.id || '').toLowerCase();
            const title = (exam.title || '').toLowerCase();
            return examId.includes(searchText) || title.includes(searchText);
        });
    }

    if (filteredExams.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Không tìm thấy đề thi nào</td></tr>';
        return;
    }

    tbody.innerHTML = filteredExams.map(exam => {
        // Convert both to strings for comparison and log for debugging
        const examPkgId = String(exam.packageId || '');
        const pkg = packages.find(p => {
            const pid = String(p._id || p.id || '');
            return pid === examPkgId;
        });

        const pkgName = pkg ? pkg.name : 'Chưa gán';
        const date = exam.createdAt ? new Date(exam.createdAt).toLocaleDateString('vi-VN') : 'N/A';
        const examId = exam._id || exam.id || '';

        return `
            <tr>
                <td>${exam.displayId ? '#' + exam.displayId : '#' + (examId ? examId.slice(-6) : 'N/A')}</td>
                <td title="${exam.title || ''}"><strong>${exam.title || 'Không có tên'}</strong></td>
                <td>${pkgName}</td>
                <td>${date}</td>
                <td>${exam.createdBy || 'Admin'}</td>
                <td>
                    <button class="btn-action btn-edit" onclick="editExam('${examId}')">✏️ Sửa</button>
                    <button class="btn-action btn-copy" onclick="showCopyExamModal('${examId}')">📋 Copy</button>
                    <button class="btn-action btn-delete" onclick="deleteExam('${examId}')">🗑️ Xóa</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function showExamList() {
    document.getElementById('examListView').style.display = 'block';
    document.getElementById('examCreatorView').style.display = 'none';
    document.getElementById('btnCreateExam').style.display = 'inline-block';
    document.getElementById('btnBackToExamList').style.display = 'none';
    document.getElementById('examTabTitle').textContent = 'Quản lý Đề thi';
    await renderExams();
}

// Search exams by ID or title
async function searchExams() {
    await renderExams();
}

// Clear exam search
async function clearExamSearch() {
    const searchInput = document.getElementById('examSearchInput');
    if (searchInput) searchInput.value = '';
    await renderExams();
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
    document.getElementById('examDescription').value = '';
    document.getElementById('examTag').value = '';
    document.getElementById('examDisplayId').value = '';
    document.getElementById('examDuration').value = '90';
    document.getElementById('examStatus').value = 'published';
    document.getElementById('examPackageSelect').value = '';

    // Reset template to default
    currentTemplate = 'thpt_toan';
    document.getElementById('examTemplate').value = currentTemplate;

    initExamCreator();
}

async function editExam(examId) {
    const exams = await getAllExams();
    const exam = exams.find(e => (e._id || e.id) === examId);
    if (!exam) {
        alert('Đề thi không tồn tại!');
        return;
    }

    // Switch view
    document.getElementById('examListView').style.display = 'none';
    document.getElementById('examCreatorView').style.display = 'block';
    document.getElementById('btnCreateExam').style.display = 'none';
    document.getElementById('btnBackToExamList').style.display = 'inline-block';
    document.getElementById('examTabTitle').textContent = 'Chỉnh sửa Đề thi';

    // Set template first (before populating questions)
    currentTemplate = exam.template || 'thpt_toan';
    document.getElementById('examTemplate').value = currentTemplate;

    // Populate form
    document.getElementById('editingExamId').value = exam.id;
    document.getElementById('examTitle').value = exam.title;
    document.getElementById('examDescription').value = exam.description || '';
    document.getElementById('examTag').value = exam.tag || 'THPT Toán';
    document.getElementById('examDisplayId').value = exam.displayId || '';
    document.getElementById('examDuration').value = exam.duration || 90;
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

    // Populate existing questions (instead of creating empty ones)
    exam.questions.forEach(q => {
        if (q.type === 'multiple-choice') addMCQuestion(q);
        else if (q.type === 'true-false') addTFQuestion(q);
        else if (q.type === 'fill-in-blank') addFillQuestion(q);
    });

    // Update headers to match template
    updateSectionHeaders();
}

async function deleteExam(examId) {
    if (!confirm('Bạn có chắc muốn xóa đề thi này? Hành động này không thể hoàn tác!')) return;

    try {
        await apiDeleteExam(examId);
        alert('Đã xóa đề thi thành công!');
        await renderExams();
        await updateDashboardStats();
    } catch (err) {
        alert('Lỗi xóa đề: ' + err.message);
    }
}

// ========== COPY EXAM FUNCTIONS ==========
async function showCopyExamModal(examId) {
    const exams = await getAllExams();
    const exam = exams.find(e => (e._id || e.id) === examId);
    if (!exam) {
        alert('Không tìm thấy đề thi!');
        return;
    }

    // Populate source exam info
    document.getElementById('copyExamSourceId').value = examId;
    document.getElementById('copyExamSourceTitle').value = exam.title;
    document.getElementById('copyExamNewTitle').value = exam.title + ' (Copy)';

    // Populate package dropdown
    const packages = await getPackages();
    const packageSelect = document.getElementById('copyExamTargetPackage');
    packageSelect.innerHTML = packages.map(pkg =>
        `<option value="${pkg._id || pkg.id}">${pkg.name}</option>`
    ).join('');

    // Show modal
    document.getElementById('copyExamModal').classList.add('active');
}

function closeCopyExamModal() {
    document.getElementById('copyExamModal').classList.remove('active');
}

async function copyExam() {
    const sourceId = document.getElementById('copyExamSourceId').value;
    const newTitle = document.getElementById('copyExamNewTitle').value.trim();
    const targetPackageId = document.getElementById('copyExamTargetPackage').value;

    if (!newTitle) {
        alert('Vui lòng nhập tên đề mới!');
        return;
    }
    if (!targetPackageId) {
        alert('Vui lòng chọn gói đích!');
        return;
    }

    try {
        // Get source exam data
        const exams = await getAllExams();
        const sourceExam = exams.find(e => (e._id || e.id) === sourceId);
        if (!sourceExam) {
            alert('Không tìm thấy đề nguồn!');
            return;
        }

        // Create new exam with copied data
        const newExam = {
            id: generateExamId(), // New unique ID
            displayId: '', // Will be auto-generated
            packageId: targetPackageId,
            title: newTitle,
            description: sourceExam.description || '',
            tag: sourceExam.tag || '',
            template: sourceExam.template || 'thpt_toan',
            status: 'draft', // Start as draft
            duration: sourceExam.duration || 90,
            questions: sourceExam.questions || [],
            createdBy: currentAdmin?.username || 'admin'
        };

        await createExam(newExam);
        alert(`Đã sao chép đề "${sourceExam.title}" thành "${newTitle}" thành công!`);
        closeCopyExamModal();
        await renderExams();
    } catch (err) {
        alert('Lỗi sao chép đề: ' + err.message);
    }
}

// Exam creator state - template configurations
const EXAM_TEMPLATES = {
    thpt_toan: {
        name: 'THPT Toán',
        mcCount: 12,
        tfCount: 4,
        fillCount: 6,
        mcScore: 0.25,
        tfScore: 1,       // Max per question (lũy tiến)
        fillScore: 0.5
    },
    khtn_khxh: {
        name: 'KHTN/KHXH',
        mcCount: 18,
        tfCount: 4,
        fillCount: 6,
        mcScore: 0.25,
        tfScore: 1,       // Max per question (lũy tiến)
        fillScore: 0.25
    }
};

let currentTemplate = 'thpt_toan';

// Get current template config
function getTemplateConfig() {
    return EXAM_TEMPLATES[currentTemplate] || EXAM_TEMPLATES.thpt_toan;
}

// Handle template change
function onTemplateChange() {
    const templateSelect = document.getElementById('examTemplate');
    if (templateSelect) {
        currentTemplate = templateSelect.value;
        updateSectionHeaders();
        initExamCreator();
    }
}

// Update section headers based on template
function updateSectionHeaders() {
    const config = getTemplateConfig();

    // Update MC header
    const mcHeader = document.querySelector('#mcQuestions').previousElementSibling;
    if (mcHeader && mcHeader.tagName === 'H3') {
        mcHeader.textContent = `Phần I: Trắc nghiệm (${config.mcCount} câu - ${config.mcScore}đ/câu)`;
    }

    // Update Fill header
    const fillHeader = document.querySelector('#fillQuestions').previousElementSibling;
    if (fillHeader && fillHeader.tagName === 'H3') {
        fillHeader.textContent = `Phần III: Trả lời ngắn (${config.fillCount} câu - ${config.fillScore}đ/câu)`;
    }
}

function initExamCreator() {
    const config = getTemplateConfig();

    // Clear question containers
    document.getElementById('mcQuestions').innerHTML = '';
    document.getElementById('tfQuestions').innerHTML = '';
    document.getElementById('fillQuestions').innerHTML = '';

    // Add questions based on template
    for (let i = 0; i < config.mcCount; i++) addMCQuestion();
    for (let i = 0; i < config.tfCount; i++) addTFQuestion();
    for (let i = 0; i < config.fillCount; i++) addFillQuestion();

    // Update headers
    updateSectionHeaders();
}

function addMCQuestion(data = null) {
    const container = document.getElementById('mcQuestions');
    const index = container.children.length + 1;

    // Safety check
    if (index > getTemplateConfig().mcCount && !data) return;

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
                    <button type="button" onmousedown="event.preventDefault()" onclick="insertTableWYSIWYG()" title="Chèn bảng">📊</button>
                    <button type="button" onmousedown="event.preventDefault()" onclick="insertImageWYSIWYG()" title="Chèn ảnh">🖼</button>
                </div>
                <div class="wysiwyg-editor mc-question-text" contenteditable="true" data-placeholder="Nhập nội dung câu hỏi... (Dùng $...$ cho công thức, Ctrl+V để dán ảnh)">${data?.question || ''}</div>
            </div>
            <div class="options-grid">
                <div class="form-group option-group">
                    <label>A.</label>
                    <div class="wysiwyg-option mc-option" contenteditable="true" data-option="A" data-placeholder="Đáp án A">${data?.options?.[0] || ''}</div>
                </div>
                <div class="form-group option-group">
                    <label>B.</label>
                    <div class="wysiwyg-option mc-option" contenteditable="true" data-option="B" data-placeholder="Đáp án B">${data?.options?.[1] || ''}</div>
                </div>
                <div class="form-group option-group">
                    <label>C.</label>
                    <div class="wysiwyg-option mc-option" contenteditable="true" data-option="C" data-placeholder="Đáp án C">${data?.options?.[2] || ''}</div>
                </div>
                <div class="form-group option-group">
                    <label>D.</label>
                    <div class="wysiwyg-option mc-option" contenteditable="true" data-option="D" data-placeholder="Đáp án D">${data?.options?.[3] || ''}</div>
                </div>
            </div>
            <div class="form-row-2">
                <div class="form-group">
                    <label>Đáp án đúng</label>
                    <select class="mc-correct form-select">
                        <option value="A" ${data?.correct === 'A' || data?.correctAnswer === 'A' || data?.correct === data?.options?.[0] ? 'selected' : ''}>A</option>
                        <option value="B" ${data?.correct === 'B' || data?.correctAnswer === 'B' || data?.correct === data?.options?.[1] ? 'selected' : ''}>B</option>
                        <option value="C" ${data?.correct === 'C' || data?.correctAnswer === 'C' || data?.correct === data?.options?.[2] ? 'selected' : ''}>C</option>
                        <option value="D" ${data?.correct === 'D' || data?.correctAnswer === 'D' || data?.correct === data?.options?.[3] ? 'selected' : ''}>D</option>
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
    const globalIndex = getTemplateConfig().mcCount + index;

    // Safety check
    if (index > getTemplateConfig().tfCount && !data) return;

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
                    <button type="button" onmousedown="event.preventDefault()" onclick="insertTableWYSIWYG()" title="Chèn bảng">📊</button>
                    <button type="button" onmousedown="event.preventDefault()" onclick="insertImageWYSIWYG()" title="Chèn ảnh">🖼</button>
                </div>
                <div class="wysiwyg-editor tf-question-text" contenteditable="true" data-placeholder="VD: Xét tính đúng sai của các mệnh đề về đạo hàm...">${data?.question || ''}</div>
            </div>
            <div class="tf-options">
                ${['a', 'b', 'c', 'd'].map((label, idx) => {
        // Handle AI data structure (options is array of objects {content, correct})
        const optContent = data?.options?.[idx]?.content || data?.options?.[idx] || '';
        const isCorrect = data?.options?.[idx]?.correct === true || data?.options?.[idx]?.correct === 'true'; // Check boolean or string

        return `
                    <div class="tf-option-row">
                        <label>${label})</label>
                        <div class="wysiwyg-option tf-option-text" contenteditable="true" data-placeholder="Nội dung mệnh đề ${label}...">${optContent}</div>
                        <select class="tf-answer form-select">
                            <option value="Đúng" ${isCorrect ? 'selected' : ''}>Đúng</option>
                            <option value="Sai" ${!isCorrect ? 'selected' : ''}>Sai</option>
                        </select>
                    </div>
                    `;
    }).join('')}
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
    const config = getTemplateConfig();
    const globalIndex = config.mcCount + config.tfCount + index;

    // Safety check
    if (index > config.fillCount && !data) return;

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
                    <button type="button" onmousedown="event.preventDefault()" onclick="insertTableWYSIWYG()" title="Chèn bảng">📊</button>
                    <button type="button" onmousedown="event.preventDefault()" onclick="insertImageWYSIWYG()" title="Chèn ảnh">🖼</button>
                </div>
                <div class="wysiwyg-editor fill-question-text" contenteditable="true" data-placeholder="VD: Cho hàm số f(x) = x³ - 3x² + 2. Giá trị cực đại của hàm số là">${data?.question || ''}</div>
            </div>
            <div class="form-row-2">
                <div class="form-group">
                    <label>Đáp án đúng</label>
                    <div class="wysiwyg-option fill-correct" contenteditable="true" data-placeholder="VD: 2">${data?.correctAnswer || data?.correct || ''}</div>
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

async function saveExam() {
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
    const displayIdInput = document.getElementById('examDisplayId').value.trim();

    const newExam = {
        id: uniqueId,
        displayId: displayIdInput || uniqueId,
        packageId: packageId || null,
        title: examTitle,
        description: document.getElementById('examDescription').value.trim() || '',
        tag: examTag,
        template: currentTemplate || 'thpt_toan', // Store template type for scoring
        status: examStatus,
        duration: parseInt(document.getElementById('examDuration').value) || 90,
        questions: [...mcQuestions, ...tfQuestions, ...fillQuestions],
        createdBy: currentAdmin?.username || 'admin'
    };

    // Save exam via API
    try {
        if (editingId) {
            await updateExamAPI(editingId, newExam);
        } else {
            await createExam(newExam);
        }
        alert('Đã lưu đề thi thành công!');
        await showExamList();
        await updateDashboardStats();
    } catch (err) {
        alert('Lỗi lưu đề: ' + err.message);
    }
}

// ========== ADMIN MANAGEMENT ==========
async function renderAdmins() {
    const admins = await getAdmins();
    const tbody = document.getElementById('adminsTableBody');
    if (!tbody) return;

    if (admins.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#666;">Chưa có admin nào</td></tr>';
        return;
    }

    tbody.innerHTML = admins.map((admin, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${admin.name}</td>
            <td>${admin.username}</td>
            <td>${getRoleName(admin.role)}</td>
            <td>
                ${admin.username !== 'admin' ?
            `<button class="btn-action btn-delete" onclick="deleteAdmin('${admin._id}')">🗑️ Xóa</button>` :
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

async function saveNewAdmin(event) {
    event.preventDefault();

    const newAdmin = {
        name: document.getElementById('newAdminName').value,
        username: document.getElementById('newAdminUsername').value,
        password: document.getElementById('newAdminPassword').value,
        role: document.getElementById('newAdminRole').value
    };

    try {
        await apiCreateAdmin(newAdmin);
        closeAdminModal();
        renderAdmins();
        alert('Đã thêm admin mới!');

        // Clear form
        document.getElementById('adminForm').reset();
    } catch (err) {
        alert('Lỗi: ' + (err.message || 'Không thể tạo admin'));
    }
}

async function deleteAdmin(adminId) {
    if (!confirm('Bạn có chắc muốn xóa admin này?')) return;

    try {
        await apiDeleteAdmin(adminId);
        await renderAdmins();
        alert('Đã xóa admin!');
    } catch (err) {
        alert('Lỗi: ' + (err.message || 'Không thể xóa admin'));
    }
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', async function () {
    // Check if already logged in via token
    const token = getToken();
    if (token) {
        try {
            const user = await apiGetCurrentUser();
            if (user && (user.role === 'admin' || user.role === 'super')) {
                currentAdmin = user;
                showAdminDashboard();
            }
        } catch (err) {
            console.log('Token invalid, need to login');
        }
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
async function getAllHistory() {
    try {
        const history = await apiGetAllHistory();
        // Map server response to format expected by render functions
        return history.map(h => ({
            ...h,
            odl: h.odl || h.examId,
            userId: h.userId?._id || h.userId,
            userName: h.userId?.name || 'N/A',
            userUsername: h.userId?.username || 'N/A'
        }));
    } catch (err) {
        console.error('Error fetching history from server:', err);
        return [];
    }
}

async function renderAllHistory(filterText = '', packageFilter = '') {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    const history = await getAllHistory();
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

async function filterHistory() {
    const filterText = document.getElementById('historySearchInput')?.value || '';
    const packageFilter = document.getElementById('historyPackageFilter')?.value || '';
    await renderAllHistory(filterText, packageFilter);
}

async function clearHistorySearch() {
    const searchInput = document.getElementById('historySearchInput');
    const packageFilter = document.getElementById('historyPackageFilter');
    if (searchInput) searchInput.value = '';
    if (packageFilter) packageFilter.value = '';
    await renderAllHistory();
}

async function viewHistoryDetail(odl) {
    // Find the history entry
    const history = await getAllHistory();
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
                    <span class="preview-question-number">Câu ${getTemplateConfig().mcCount + idx + 1}</span>
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
                    <span class="preview-question-number">Câu ${getTemplateConfig().mcCount + getTemplateConfig().tfCount + idx + 1}</span>
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
    // MathJax will auto-parse $...$ with the new config, just return the text
    return text;
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
                <span class="exam-preview-option-text">${renderLatex(options[i] || '')}</span>
            </div>
        `).join('');
    }
    else if (type === 'tf') {
        questionNumber = getTemplateConfig().mcCount + index;
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
                <span class="exam-preview-option-text">${renderLatex(s.text)}</span>
                <span style="margin-left: auto; font-weight: 600; color: ${s.isCorrect ? '#22c55e' : '#ef4444'};">
                    ${s.isCorrect ? '✓ Đúng' : '✗ Sai'}
                </span>
            </div>
        `).join('');
    }
    else if (type === 'fill') {
        questionNumber = getTemplateConfig().mcCount + getTemplateConfig().tfCount + index;
        questionText = card.querySelector('.fill-question-text')?.innerHTML || '';
        const answer = card.querySelector('.fill-correct')?.innerHTML || '';

        optionsHtml = `
            <div class="exam-preview-option correct">
                <span class="exam-preview-option-label">→</span>
                <span class="exam-preview-option-text">Đáp án: <strong>${renderLatex(answer)}</strong></span>
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

    // For alignment commands, handle selected images specially
    if (command.startsWith('justify')) {
        const selectedImage = document.querySelector('.image-container.selected');
        if (selectedImage) {
            const align = command.replace('justify', '').toLowerCase();

            // Apply alignment directly to the image container using inline styles
            // This ensures the styles are saved with innerHTML and persist
            if (align === 'center') {
                selectedImage.style.display = 'block';
                selectedImage.style.marginLeft = 'auto';
                selectedImage.style.marginRight = 'auto';
                selectedImage.style.float = 'none';
            } else if (align === 'left') {
                selectedImage.style.display = 'inline-block';
                selectedImage.style.marginLeft = '0';
                selectedImage.style.marginRight = 'auto';
                selectedImage.style.float = 'none';
            } else if (align === 'right') {
                selectedImage.style.display = 'inline-block';
                selectedImage.style.marginLeft = 'auto';
                selectedImage.style.marginRight = '0';
                selectedImage.style.float = 'none';
            }

            console.log('📸 Image aligned:', align, selectedImage.style.cssText);
            return; // Don't apply text alignment if image is selected
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

// Insert LaTeX table at cursor position
function insertTableWYSIWYG() {
    const rows = parseInt(prompt('Số hàng:', '2')) || 2;
    const cols = parseInt(prompt('Số cột:', '3')) || 3;

    if (rows < 1 || cols < 1) return;

    // Generate column alignment string (all centered)
    const colAlign = '|' + 'c|'.repeat(cols);

    // Generate table rows with placeholders
    let tableRows = [];
    for (let r = 0; r < rows; r++) {
        let cells = [];
        for (let c = 0; c < cols; c++) {
            cells.push(r === 0 ? `Tiêu đề ${c + 1}` : `Ô ${r},${c + 1}`);
        }
        tableRows.push(cells.join(' & '));
    }

    // Create LaTeX array
    const latexTable = `$$\\begin{array}{${colAlign}}
\\hline
${tableRows.join(' \\\\ \\hline\n')} \\\\ \\hline
\\end{array}$$`;

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const tableSpan = document.createElement('div');
    tableSpan.className = 'latex-table';
    tableSpan.innerHTML = latexTable;
    tableSpan.style.fontFamily = 'monospace';
    tableSpan.style.background = '#f0f9ff';
    tableSpan.style.padding = '8px';
    tableSpan.style.borderRadius = '4px';
    tableSpan.style.margin = '8px 0';
    tableSpan.style.whiteSpace = 'pre-wrap';

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(tableSpan);
}

// Insert image via file picker
// Helper to upload image to server
async function uploadImageToServer(base64Data) {
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Data })
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        return data.url; // Return server URL
    } catch (err) {
        console.error('Image upload failed, using base64 fallback:', err);
        return base64Data; // Fallback to base64 if upload fails
    }
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
        reader.onload = async function (e) {
            // Upload to server then insert
            const url = await uploadImageToServer(e.target.result);
            insertImageAtCursor(url);
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

                    reader.onload = async function (e) {
                        // Upload to server then insert
                        const url = await uploadImageToServer(e.target.result);
                        insertImageIntoEditor(editor, url);
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

// ========== CONTACT SETTINGS ==========

// Load contact settings from API and populate form
async function loadContactSettings() {
    try {
        const settings = await apiGetSettings('contact');
        if (settings && Object.keys(settings).length > 0) {
            document.getElementById('contactZalo').value = settings.zalo || '';
            document.getElementById('contactFacebook').value = settings.facebook || '';
            document.getElementById('contactTelegram').value = settings.telegram || '';
            console.log('✅ Contact settings loaded:', settings);
        }
    } catch (err) {
        console.log('No contact settings found, using defaults');
    }
}

// Save contact settings to API
async function saveContactSettings(event) {
    event.preventDefault();

    const contactData = {
        zalo: document.getElementById('contactZalo').value.trim(),
        facebook: document.getElementById('contactFacebook').value.trim(),
        telegram: document.getElementById('contactTelegram').value.trim()
    };

    try {
        await apiSaveSettings('contact', contactData);
        alert('✅ Đã lưu thông tin liên hệ!');
        console.log('✅ Contact settings saved:', contactData);
    } catch (err) {
        alert('Lỗi lưu cài đặt: ' + err.message);
        console.error('Error saving contact settings:', err);
    }
}

// Load settings when settings tab is shown
const originalShowAdminTab = showAdminTab;
showAdminTab = async function (tabName) {
    originalShowAdminTab(tabName);
    if (tabName === 'settings') {
        await loadContactSettings();
    }
};

// ========== AI IMPORT FUNCTIONS (NotebookLM) ==========

function openImportModal() {
    const modal = document.getElementById('importAIModal');
    if (modal) {
        modal.classList.add('active');
        const promptTemplate = document.getElementById('aiPromptTemplate');
        if (promptTemplate) {
            const config = getTemplateConfig();
            promptTemplate.value = `Bạn là một máy quét OCR chính xác tuyệt đối. Nhiệm vụ là trích xuất dữ liệu đề thi thành JSON.

YÊU CẦU CẤU TRÚC ĐỀ THI (${currentTemplate === 'thpt_toan' ? 'Môn Toán' : 'Môn KHTN/KHXH'}):
- Phần 1 (Trắc nghiệm): ${config.mcCount} câu
- Phần 2 (Đúng/Sai): ${config.tfCount} câu
- Phần 3 (Điền khuyết): ${config.fillCount} câu
Tổng cộng: ${config.mcCount + config.tfCount + config.fillCount} câu.

⛔ CẢNH BÁO QUAN TRỌNG (VI PHẠM SẼ BỊ LỖI):
1. **TUYỆT ĐỐI KHÔNG TÓM TẮT:** Giữ nguyên văn bản gốc CẢ CÂU HỎI VÀ LỜI GIẢI. Không được rút gọn lời giải.
2. **LOẠI BỎ TIỀN TỐ:** KHÔNG ghi "Câu 1...", "A. ", "B. " ở đầu. CHỈ ghi nội dung.
3. **CÔNG THỨC TOÁN:** Dùng LaTeX $...$ cho TẤT CẢ các số và công thức (VD: $1$, $2$, $x^2$...). Đảm bảo font chữ đồng bộ.
4. **HÌNH ẢNH:** Thay thế hình ảnh bằng text: [HÌNH ẢNH].
5. **XUỐNG DÒNG TRONG LỜI GIẢI:** Dùng \\n để xuống dòng (mỗi bước giải một dòng).
6. **BẢNG SỐ LIỆU:** Nếu đề có bảng, dùng LaTeX array:
   $$\\begin{array}{|c|c|c|}\\hline Tiêu đề 1 & Tiêu đề 2 & ... \\\\ \\hline Giá trị 1 & Giá trị 2 & ... \\\\ \\hline \\end{array}$$

CẤU TRÚC JSON (Mảng đối tượng):
[
  {
    "type": "mc",
    "question": "Ghi đầy đủ nội dung câu hỏi (bao gồm cả công thức $...$ nếu có)",
    "options": ["Nội dung đáp án A (KHÔNG ghi chữ A.)", "Nội dung đáp án B", "Nội dung đáp án C", "Nội dung đáp án D"],
    "correct": "A (hoặc B, C, D)",
    "explanation": "Bước 1: ...\\nBước 2: ...\\nKết luận: ..."
  },
  {
    "type": "tf",
    "question": "Ghi đầy đủ nội dung câu hỏi đúng sai...",
    "options": [
      {"content": "Nội dung ý a", "correct": true},
      {"content": "Nội dung ý b", "correct": false},
      {"content": "Nội dung ý c", "correct": false},
      {"content": "Nội dung ý d", "correct": true}
    ],
    "explanation": "..."
  },
  {
    "type": "fill",
    "question": "Ghi đầy đủ nội dung câu hỏi điền đáp án...",
    "correct": "Đáp án đúng (số hoặc chữ)",
    "explanation": "..."
  }
]

Hãy chuyển đổi TOÀN BỘ đề thi (không bỏ sót câu nào) thành JSON hợp lệ theo mẫu trên.`;
        }
    }
}

function closeImportModal() {
    const modal = document.getElementById('importAIModal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('aiJsonInput').value = ''; // Clear input
    }
}

function copyAIPrompt() {
    const promptText = document.getElementById('aiPromptTemplate');
    promptText.select();
    document.execCommand('copy');
    alert('✅ Đã copy Prompt! Hãy gửi cho AI.');
}

function processAIImport() {
    let jsonInput = document.getElementById('aiJsonInput').value.trim();

    // Robust parsing: Find the first '[' and last ']' to ignore any AI conversational preamble/postscript
    const firstBracket = jsonInput.indexOf('[');
    const lastBracket = jsonInput.lastIndexOf(']');

    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        jsonInput = jsonInput.substring(firstBracket, lastBracket + 1);
    } else {
        // Fallback or error if no brackets found
        // Let JSON.parse throw the specific error if it's not valid
    }

    try {
        const questions = JSON.parse(jsonInput);

        if (!Array.isArray(questions)) {
            throw new Error('Format must be a JSON Array');
        }

        // Debug: Check if data exists
        if (questions.length > 0) {
            console.log('Sample parsed:', questions[0]);
            // alert('Debug Data Q1: ' + JSON.stringify(questions[0]).substring(0, 200));
        }

        // Helper to normalize keys (handle AI capitalization/aliases)
        const normalizeOb = (obj) => {
            const newObj = {};
            for (let key in obj) {
                const lowerKey = key.toLowerCase().trim();
                newObj[lowerKey] = obj[key];
            }
            // Map aliases
            if (newObj.content && !newObj.question) newObj.question = newObj.content;
            if (newObj.answers && !newObj.options) newObj.options = newObj.answers;
            if (newObj.choices && !newObj.options) newObj.options = newObj.choices;
            if (newObj.answer && !newObj.correct) newObj.correct = newObj.answer;
            if (newObj.correctanswer && !newObj.correct) newObj.correct = newObj.correctanswer;

            // Standardize 'type' if missing or mixed case
            if (!newObj.type) {
                // Guess type based on structure if missing
                if (newObj.options && newObj.options.length === 4 && typeof newObj.correct === 'string') newObj.type = 'mc';
                else if (newObj.options && typeof newObj.options[0] === 'object') newObj.type = 'tf';
                else newObj.type = 'fill';
            } else {
                newObj.type = newObj.type.toLowerCase();
            }

            return newObj;
        };

        // Helper to escape HTML (prevent < 5 from being treated as tag)
        const escapeHtml = (text) => {
            if (text === null || text === undefined) return '';
            return String(text)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;")
                .replace(/\\n/g, "<br>")  // Convert \n to line breaks
                .replace(/\n/g, "<br>");  // Also handle actual newlines
        };

        // CRITICAL: Clear existing empty cards before importing
        document.getElementById('mcQuestions').innerHTML = '';
        document.getElementById('tfQuestions').innerHTML = '';
        document.getElementById('fillQuestions').innerHTML = '';

        let addedCount = 0;

        questions.forEach(originQ => {
            let q = normalizeOb(originQ);

            // Fallback for empty question
            if (!q.question) q.question = "(Lỗi: Không tìm thấy nội dung câu hỏi trong JSON)";

            // Transform LaTeX for better display: \vec -> \overrightarrow, \frac -> \dfrac
            const transformLatex = (text) => {
                if (!text) return text;
                return text
                    .replace(/\\vec\{/g, '\\overrightarrow{')
                    .replace(/\\frac\{/g, '\\dfrac{');
            };

            q.question = transformLatex(q.question);
            q.explanation = transformLatex(q.explanation);
            if (Array.isArray(q.options)) {
                q.options = q.options.map(o => {
                    if (typeof o === 'object' && o.content) {
                        return { ...o, content: transformLatex(o.content) };
                    }
                    return transformLatex(o);
                });
            }
            if (q.correct) q.correct = transformLatex(q.correct);

            // Escape data before passing
            const safeQ = { ...q };
            safeQ.question = escapeHtml(q.question);
            safeQ.explanation = escapeHtml(q.explanation);

            if (q.type === 'mc') {
                if (Array.isArray(q.options)) {
                    safeQ.options = q.options.map(o => escapeHtml(o));
                }
                addMCQuestion(safeQ);
                addedCount++;
            } else if (q.type === 'tf') {
                // Options for TF are objects
                if (Array.isArray(q.options)) {
                    safeQ.options = q.options.map(o => {
                        if (typeof o === 'object') {
                            const normO = normalizeOb(o);
                            return { ...normO, content: escapeHtml(normO.content || normO.question || '') };
                        }
                        return escapeHtml(o);
                    });
                }
                addTFQuestion(safeQ);
                addedCount++;
            } else if (q.type === 'fill') {
                addFillQuestion({
                    question: safeQ.question,
                    correctAnswer: escapeHtml(q.correct),
                    explanation: safeQ.explanation
                });
                addedCount++;
            }
        });

        alert(`✅ Đã nhập thành công ${addedCount} câu hỏi!`);
        closeImportModal();
        updateSectionHeaders(); // Update counts

        // NOTE: Intentionally NOT rendering MathJax here
        // Admin needs to see raw LaTeX code for editing (e.g., $\vec{u}$)
        // MathJax will render on Preview and Student view only

        // Scroll to questions
        document.getElementById('mcQuestions').scrollIntoView({ behavior: 'smooth' });

    } catch (e) {
        alert('❌ Lỗi định dạng JSON: ' + e.message + '\nHãy chắc chắn bạn chỉ copy phần mã JSON từ AI.');
    }
}
