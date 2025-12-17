// ========== API CLIENT ==========
// Frontend API helper for connecting to backend

const API_BASE = window.location.origin + '/api';

// Token management
function getToken() {
    return localStorage.getItem('luyende_token');
}

function setToken(token) {
    localStorage.setItem('luyende_token', token);
}

function clearToken() {
    localStorage.removeItem('luyende_token');
    localStorage.removeItem('luyende_currentUser');
}

// API helper
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const token = getToken();
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(API_BASE + endpoint, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Đã xảy ra lỗi');
        }

        return result;
    } catch (err) {
        console.error('API Error:', err);
        throw err;
    }
}

// ========== AUTH API ==========

async function apiLogin(username, password) {
    const result = await apiCall('/auth/login', 'POST', { username, password });
    setToken(result.token);
    localStorage.setItem('luyende_currentUser', JSON.stringify(result.user));
    return result.user;
}

async function apiRegister(name, email, username, password) {
    return await apiCall('/auth/register', 'POST', { name, email, username, password });
}

async function apiAdminLogin(username, password) {
    const result = await apiCall('/auth/admin-login', 'POST', { username, password });
    setToken(result.token);
    localStorage.setItem('luyende_currentAdmin', JSON.stringify(result.admin));
    return result.admin;
}

async function apiGetCurrentUser() {
    return await apiCall('/auth/me');
}

function apiLogout() {
    clearToken();
    localStorage.removeItem('luyende_currentAdmin');
}

// ========== USER API ==========

async function apiGetUsers() {
    return await apiCall('/users');
}

async function apiUpdateUserPackages(userId, packages) {
    return await apiCall(`/users/${userId}/packages`, 'PUT', { packages });
}

async function apiDeleteUser(userId) {
    return await apiCall(`/users/${userId}`, 'DELETE');
}

async function apiResetUserPassword(userId, newPassword) {
    return await apiCall(`/users/${userId}/reset-password`, 'PUT', { newPassword });
}

async function apiChangePassword(currentPassword, newPassword) {
    return await apiCall('/auth/change-password', 'PUT', { currentPassword, newPassword });
}

async function apiAuthMe() {
    return await apiCall('/auth/me');
}

// ========== PACKAGE API ==========

async function apiGetPackages() {
    return await apiCall('/packages');
}

async function apiCreatePackage(packageData) {
    return await apiCall('/packages', 'POST', packageData);
}

async function apiUpdatePackage(packageId, packageData) {
    return await apiCall(`/packages/${packageId}`, 'PUT', packageData);
}

async function apiDeletePackage(packageId) {
    return await apiCall(`/packages/${packageId}`, 'DELETE');
}

// ========== EXAM API ==========

async function apiGetAdminExams(packageId = null) {
    const query = packageId ? `?packageId=${packageId}` : '';
    return await apiCall(`/admin/exams${query}`);
}

async function apiGetExams(packageId = null) {
    const query = packageId ? `?packageId=${packageId}` : '';
    return await apiCall(`/exams${query}`);
}

async function apiGetExam(examId) {
    return await apiCall(`/exams/${examId}`);
}

async function apiCreateExam(examData) {
    return await apiCall('/exams', 'POST', examData);
}

async function apiUpdateExam(examId, examData) {
    return await apiCall(`/exams/${examId}`, 'PUT', examData);
}

async function apiDeleteExam(examId) {
    return await apiCall(`/exams/${examId}`, 'DELETE');
}

// ========== RESULT API ==========

async function apiSaveResult(resultData) {
    return await apiCall('/results', 'POST', resultData);
}

// ========== HISTORY API ==========

async function apiSaveHistory(historyData) {
    return await apiCall('/history', 'POST', historyData);
}

async function apiGetHistory() {
    return await apiCall('/history');
}

async function apiGetAllHistory() {
    return await apiCall('/history/all');
}

// ========== SETTINGS API ==========

async function apiGetSettings(key) {
    return await apiCall(`/settings/${key}`);
}

async function apiSaveSettings(key, value) {
    return await apiCall('/settings', 'POST', { key, value });
}

// ========== ADMIN API ==========

async function apiGetAdmins() {
    return await apiCall('/admins');
}

async function apiCreateAdmin(adminData) {
    return await apiCall('/admins', 'POST', adminData);
}

async function apiDeleteAdmin(adminId) {
    return await apiCall(`/admins/${adminId}`, 'DELETE');
}

// ========== STATS API ==========

async function apiGetStats() {
    return await apiCall('/stats');
}

console.log('✅ API Client loaded');
