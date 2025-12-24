const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Allow large base64 uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files

// Ensure uploads directory exists
const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Upload Endpoint (Base64 -> File)
app.post('/api/upload', (req, res) => {
    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: 'No image provided' });

        // Extract extension and data
        const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).json({ error: 'Invalid base64 string' });
        }

        const type = matches[1];
        const data = matches[2];
        const buffer = Buffer.from(data, 'base64');

        // Generate filename
        const ext = type.split('/')[1] || 'png';
        const filename = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
        const filePath = path.join(uploadDir, filename);

        // Write file
        fs.writeFileSync(filePath, buffer);

        // Return URL
        res.json({ url: `/uploads/${filename}` });
        console.log(`✅ File uploaded: ${filename}`);

    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/luyenthionline')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// ========== SCHEMAS ==========

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin', 'super', 'editor'], default: 'student' },
    // Legacy field - kept for backwards compatibility
    activatedPackages: [{ type: String }],
    // NEW: VIP subjects registered by user
    vipSubjects: [{
        subjectId: String,      // e.g., "toan", "ly", "hoa"
        grade: String,          // e.g., "10", "11", "12", "thpt"
        activatedAt: { type: Date, default: Date.now },
        expiresAt: Date         // Optional expiration
    }],
    createdAt: { type: Date, default: Date.now }
});

// Subject Schema (NEW)
const subjectSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },    // e.g., "toan", "ly", "hoa"
    name: { type: String, required: true },                // e.g., "Toán", "Vật Lý", "Hóa Học"
    icon: { type: String, default: '📚' },
    color: { type: String, default: '#3b82f6' },           // Primary color for UI
    order: { type: Number, default: 0 },                   // Display order
    createdAt: { type: Date, default: Date.now }
});

// Package Schema (LEGACY - kept for backwards compatibility)
const packageSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: String,
    icon: { type: String, default: '📝' },
    duration: { type: Number, default: 90 },
    accessType: { type: String, enum: ['open', 'register', 'updating', 'free_registration'], default: 'register' },
    createdAt: { type: Date, default: Date.now }
});

// Exam Schema (UPDATED)
const examSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    displayId: String,

    // NEW STRUCTURE - Grade/Subject/Semester based
    subjectId: { type: String },                           // Reference to subject
    grade: { type: String, enum: ['10', '11', '12', 'thpt'] },
    semester: { type: String, enum: ['gk1', 'ck1', 'gk2', 'ck2', null] }, // null for THPT
    accessType: { type: String, enum: ['free', 'vip'], default: 'free' },

    // LEGACY - kept for backwards compatibility
    packageId: String,

    // Standard fields
    title: { type: String, required: true },
    description: String,
    tag: String,
    template: { type: String, enum: ['thpt_toan', 'khtn_khxh'], default: 'thpt_toan' },
    duration: { type: Number, default: 90, min: 10, max: 180 },
    status: { type: String, enum: ['draft', 'published', 'view_only', 'updating'], default: 'draft' },
    questions: [{
        id: Number,
        type: { type: String, enum: ['multiple-choice', 'true-false', 'fill-in-blank'] },
        question: String,
        options: [String],
        correctAnswer: mongoose.Schema.Types.Mixed,
        correctAnswers: [mongoose.Schema.Types.Mixed],
        explanation: String
    }],
    createdBy: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now }
});

// Exam History Schema
const historySchema = new mongoose.Schema({
    odl: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    examId: String,
    packageId: String,
    subjectId: String,                                      // NEW
    grade: String,                                          // NEW
    examTitle: String,
    score: String,
    correct: Number,
    total: Number,
    actualTime: String,
    answers: [mongoose.Schema.Types.Mixed],
    date: { type: Date, default: Date.now }
});

// Settings Schema
const settingsSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed
});

// Models
const User = mongoose.model('User', userSchema);
const Subject = mongoose.model('Subject', subjectSchema);
const Package = mongoose.model('Package', packageSchema);
const Exam = mongoose.model('Exam', examSchema);
const History = mongoose.model('History', historySchema);
const Settings = mongoose.model('Settings', settingsSchema);

// ========== AUTH MIDDLEWARE ==========
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) throw new Error();
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
        const user = await User.findById(decoded.id);
        if (!user) throw new Error();
        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }
};

const adminAuth = async (req, res, next) => {
    await auth(req, res, () => {
        if (req.user.role === 'admin' || req.user.role === 'super' || req.user.role === 'editor') {
            req.admin = req.user; // Set req.admin for admin routes
            next();
        } else {
            res.status(403).json({ error: 'Không có quyền truy cập' });
        }
    });
};

// ========== AUTH ROUTES ==========

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, username, password } = req.body;

        // Check existing
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Email hoặc username đã tồn tại' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({
            name: name.toUpperCase(),
            email,
            username,
            password: hashedPassword,
            role: 'student'
        });

        await user.save();
        res.status(201).json({ message: 'Đăng ký thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user by username or email
        const user = await User.findOne({
            $or: [{ username }, { email: username }]
        });

        if (!user) {
            return res.status(400).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                role: user.role,
                activatedPackages: user.activatedPackages
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get current user info
app.get('/api/auth/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Login
app.post('/api/auth/admin-login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username, role: { $in: ['admin', 'super', 'editor'] } });
        if (!user) {
            return res.status(400).json({ error: 'Tài khoản admin không tồn tại' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Mật khẩu không đúng' });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            admin: {
                id: user._id,
                name: user.name,
                username: user.username,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// ========== USER ROUTES ==========

// Get all users (admin only)
app.get('/api/users', adminAuth, async (req, res) => {
    try {
        const users = await User.find({ role: 'student' }).select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update user packages
app.put('/api/users/:id/packages', adminAuth, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { activatedPackages: req.body.packages },
            { new: true }
        ).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete user
app.delete('/api/users/:id', adminAuth, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Đã xóa user' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin reset user password
app.put('/api/users/:id/reset-password', adminAuth, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findByIdAndUpdate(req.params.id, { password: hashedPassword });
        res.json({ message: 'Đã đặt lại mật khẩu' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// User change own password
app.put('/api/auth/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, req.user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
        }

        // Update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findByIdAndUpdate(req.user._id, { password: hashedPassword });
        res.json({ message: 'Đã đổi mật khẩu thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== PACKAGE ROUTES ==========

// Get all packages
app.get('/api/packages', async (req, res) => {
    try {
        const packages = await Package.find();

        // Populate examCount for each package
        const packagesWithCount = await Promise.all(packages.map(async (pkg) => {
            const pkgObj = pkg.toObject();
            const pkgId = String(pkg._id);
            // Count exams for this package
            const examCount = await Exam.countDocuments({
                packageId: pkgId,
                status: 'published'  // Only count published exams
            });
            pkgObj.examCount = examCount;
            return pkgObj;
        }));

        res.json(packagesWithCount);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Activate package (for students)
app.post('/api/packages/:id/activate', auth, async (req, res) => {
    try {
        let pkg = await Package.findById(req.params.id);
        if (!pkg) {
            pkg = await Package.findOne({ id: req.params.id });
        }
        if (!pkg) return res.status(404).json({ error: 'Gói đề không tồn tại' });

        if (pkg.accessType !== 'open' && pkg.accessType !== 'free_registration') {
            return res.status(403).json({ error: 'Gói đề này cần kích hoạt bởi admin' });
        }

        const user = await User.findById(req.user._id);
        const pkgId = pkg.id || pkg._id.toString();
        const pkgMongoId = pkg._id.toString();

        if (!user.activatedPackages) user.activatedPackages = [];

        // Add both IDs to be safe (client uses mix)
        let changed = false;
        if (!user.activatedPackages.includes(pkgId)) {
            user.activatedPackages.push(pkgId);
            changed = true;
        }
        if (!user.activatedPackages.includes(pkgMongoId)) {
            user.activatedPackages.push(pkgMongoId);
            changed = true;
        }

        if (changed) {
            await user.save();
        }

        res.json({ message: 'Đã kích hoạt gói đề', activatedPackages: user.activatedPackages });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create package
app.post('/api/packages', adminAuth, async (req, res) => {
    try {
        const pkg = new Package(req.body);
        await pkg.save();
        res.status(201).json(pkg);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update package
app.put('/api/packages/:id', adminAuth, async (req, res) => {
    try {
        // Try to find by MongoDB _id first, then by custom id field
        let pkg = await Package.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!pkg) {
            pkg = await Package.findOneAndUpdate(
                { id: req.params.id },
                req.body,
                { new: true }
            );
        }
        res.json(pkg);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete package
app.delete('/api/packages/:id', adminAuth, async (req, res) => {
    try {
        // Try to delete by MongoDB _id first, then by custom id field
        let result = await Package.findByIdAndDelete(req.params.id);
        if (!result) {
            result = await Package.findOneAndDelete({ id: req.params.id });
        }
        res.json({ message: 'Đã xóa gói đề' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== EXAM ROUTES ==========

// Get exams for admin (with role-based filtering)
app.get('/api/admin/exams', adminAuth, async (req, res) => {
    try {
        let query = {};

        // Editors can only see their own exams
        if (req.admin.role === 'editor') {
            // Match either ObjectId or string username
            query.$or = [
                { createdBy: req.admin._id },
                { createdBy: req.admin._id.toString() }
            ];
        }

        // Optional package filter
        if (req.query.packageId) {
            query.packageId = req.query.packageId;
        }

        const exams = await Exam.find(query);
        res.json(exams);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get exams by package (public - for students)
app.get('/api/exams', async (req, res) => {
    try {
        const query = req.query.packageId ? { packageId: req.query.packageId } : {};
        const exams = await Exam.find(query);
        res.json(exams);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get exam statistics by subject/grade (for dashboard)
app.get('/api/exams/stats', async (req, res) => {
    try {
        const stats = await Exam.aggregate([
            { $match: { status: 'published' } },
            {
                $group: {
                    _id: { subjectId: '$subjectId', grade: '$grade' },
                    total: { $sum: 1 },
                    vipCount: {
                        $sum: { $cond: [{ $eq: ['$accessType', 'vip'] }, 1, 0] }
                    },
                    freeCount: {
                        $sum: { $cond: [{ $ne: ['$accessType', 'vip'] }, 1, 0] }
                    }
                }
            }
        ]);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Filter exams by subject, grade, semester
app.get('/api/exams/filter', async (req, res) => {
    try {
        const query = { status: 'published' };

        if (req.query.subjectId) query.subjectId = req.query.subjectId;
        if (req.query.grade) query.grade = req.query.grade;
        if (req.query.semester) query.semester = req.query.semester;
        if (req.query.accessType) query.accessType = req.query.accessType;

        const exams = await Exam.find(query).select('-questions.correctAnswer -questions.correctAnswers -questions.explanation').sort({ createdAt: -1 });
        res.json(exams);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single exam
app.get('/api/exams/:id', async (req, res) => {
    try {
        const exam = await Exam.findOne({ id: req.params.id });
        res.json(exam);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create exam
app.post('/api/exams', adminAuth, async (req, res) => {
    try {
        const examData = {
            ...req.body,
            createdBy: req.admin.username // Track who created this exam (store username for display)
        };
        const exam = new Exam(examData);
        await exam.save();
        res.status(201).json(exam);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper to check if string is valid ObjectId
function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id) && (String(new mongoose.Types.ObjectId(id)) === id);
}

// Update exam
app.put('/api/exams/:id', adminAuth, async (req, res) => {
    try {
        let exam;

        // First, find the exam to check ownership
        if (isValidObjectId(req.params.id)) {
            exam = await Exam.findById(req.params.id);
        }
        if (!exam) {
            exam = await Exam.findOne({ id: req.params.id });
        }
        if (!exam) {
            return res.status(404).json({ error: 'Không tìm thấy đề thi' });
        }

        // Editors can only update their own exams, super admin can edit any
        const isSuperAdmin = req.admin.role === 'admin' || req.admin.role === 'superadmin';
        const isCreator = exam.createdBy === req.admin.username ||
            (exam.createdBy && exam.createdBy.toString() === req.admin._id.toString());

        if (!isSuperAdmin && exam.createdBy && !isCreator) {
            return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa đề thi này' });
        }

        // Perform update
        Object.assign(exam, req.body);
        await exam.save();

        res.json(exam);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete exam
app.delete('/api/exams/:id', adminAuth, async (req, res) => {
    try {
        let result;
        // Only try findByIdAndDelete if ID is valid ObjectId format
        if (isValidObjectId(req.params.id)) {
            result = await Exam.findByIdAndDelete(req.params.id);
        }
        // If not found, try custom id field
        if (!result) {
            result = await Exam.findOneAndDelete({ id: req.params.id });
        }
        if (!result) {
            return res.status(404).json({ error: 'Không tìm thấy đề thi' });
        }
        res.json({ message: 'Đã xóa đề thi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== HISTORY ROUTES ==========

// Save exam result
app.post('/api/history', auth, async (req, res) => {
    try {
        const history = new History({
            ...req.body,
            userId: req.user._id,
            odl: 'odl-' + Date.now()
        });
        await history.save();
        res.status(201).json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save exam result
app.post('/api/results', auth, async (req, res) => {
    try {
        const result = new History({
            ...req.body,
            userId: req.user._id, // Enforce user ID from token
            date: new Date()
        });
        await result.save();
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get user history
app.get('/api/history', auth, async (req, res) => {
    try {
        const history = await History.find({ userId: req.user._id }).sort({ date: -1 });
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all history (admin)
app.get('/api/history/all', adminAuth, async (req, res) => {
    try {
        const history = await History.find()
            .populate('userId', 'name username')
            .sort({ date: -1 });
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== SETTINGS ROUTES ==========

// Get settings
app.get('/api/settings/:key', async (req, res) => {
    try {
        const setting = await Settings.findOne({ key: req.params.key });
        res.json(setting?.value || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save settings
app.post('/api/settings', adminAuth, async (req, res) => {
    try {
        const { key, value } = req.body;
        await Settings.findOneAndUpdate(
            { key },
            { key, value },
            { upsert: true }
        );
        res.json({ message: 'Saved' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== ADMIN MANAGEMENT ==========

// Get all admins
app.get('/api/admins', adminAuth, async (req, res) => {
    try {
        const admins = await User.find({ role: { $in: ['admin', 'super', 'editor'] } }).select('-password');
        res.json(admins);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create admin
app.post('/api/admins', adminAuth, async (req, res) => {
    try {
        const { name, username, password, role } = req.body;

        // Check if username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại!' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = new User({
            name,
            email: username + '@admin.local',
            username,
            password: hashedPassword,
            role: role || 'admin'
        });

        await admin.save();
        res.status(201).json({ message: 'Tạo admin thành công' });
    } catch (err) {
        // Handle duplicate key error
        if (err.code === 11000) {
            return res.status(400).json({ error: 'Tên đăng nhập hoặc email đã tồn tại!' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Delete admin
app.delete('/api/admins/:id', adminAuth, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Đã xóa admin' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== STATS ==========

app.get('/api/stats', adminAuth, async (req, res) => {
    try {
        const [users, packages, exams, history] = await Promise.all([
            User.countDocuments({ role: 'student' }),
            Package.countDocuments(),
            Exam.countDocuments(),
            History.countDocuments()
        ]);
        res.json({ users, packages, exams, history });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== SETTINGS ROUTES ==========

// Get settings by key (public - for contact info etc)
app.get('/api/settings/:key', async (req, res) => {
    try {
        const setting = await Settings.findOne({ key: req.params.key });
        if (!setting) {
            return res.json({}); // Return empty object if not found
        }
        res.json(setting.value);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save settings (admin only)
app.post('/api/settings', adminAuth, async (req, res) => {
    try {
        const { key, value } = req.body;
        if (!key) {
            return res.status(400).json({ error: 'Key is required' });
        }

        // Upsert - update if exists, create if not
        const setting = await Settings.findOneAndUpdate(
            { key },
            { key, value },
            { upsert: true, new: true }
        );
        res.json(setting);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== INIT DEFAULT ADMIN ==========
async function initDefaultAdmin() {
    try {
        const adminExists = await User.findOne({ role: 'super' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash(
                process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
                10
            );
            await User.create({
                name: 'Super Admin',
                email: 'admin@luyenthionline.io.vn',
                username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
                password: hashedPassword,
                role: 'super'
            });
            console.log('✅ Created default admin: admin / admin123');
        }
    } catch (err) {
        console.error('Error creating default admin:', err.message);
    }
}

// ========== INIT DEFAULT SUBJECTS ==========
async function initDefaultSubjects() {
    try {
        const subjectCount = await Subject.countDocuments();
        if (subjectCount === 0) {
            const defaultSubjects = [
                { id: 'toan', name: 'Toán', icon: '📐', color: '#3b82f6', order: 1 },
                { id: 'ly', name: 'Vật Lý', icon: '⚡', color: '#8b5cf6', order: 2 },
                { id: 'hoa', name: 'Hóa Học', icon: '⚗️', color: '#10b981', order: 3 },
                { id: 'sinh', name: 'Sinh Học', icon: '🧬', color: '#f59e0b', order: 4 },
                { id: 'van', name: 'Ngữ Văn', icon: '📖', color: '#ef4444', order: 5 },
                { id: 'anh', name: 'Tiếng Anh', icon: '🌍', color: '#06b6d4', order: 6 },
                { id: 'su', name: 'Lịch Sử', icon: '🏛️', color: '#f97316', order: 7 },
                { id: 'dia', name: 'Địa Lý', icon: '🗺️', color: '#84cc16', order: 8 },
                { id: 'gdcd', name: 'GDCD', icon: '⚖️', color: '#ec4899', order: 9 },
                { id: 'tin', name: 'Tin Học', icon: '💻', color: '#6366f1', order: 10 }
            ];
            await Subject.insertMany(defaultSubjects);
            console.log('✅ Created default subjects');
        }
    } catch (err) {
        console.error('Error creating default subjects:', err.message);
    }
}

// ========== SUBJECT ROUTES ==========

// Get all subjects (public)
app.get('/api/subjects', async (req, res) => {
    try {
        const subjects = await Subject.find().sort({ order: 1 });
        res.json(subjects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create subject (admin only)
app.post('/api/subjects', adminAuth, async (req, res) => {
    try {
        const subject = new Subject(req.body);
        await subject.save();
        res.status(201).json(subject);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update subject (admin only)
app.put('/api/subjects/:id', adminAuth, async (req, res) => {
    try {
        const subject = await Subject.findOneAndUpdate(
            { id: req.params.id },
            req.body,
            { new: true }
        );
        if (!subject) {
            return res.status(404).json({ error: 'Không tìm thấy môn học' });
        }
        res.json(subject);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete subject (admin only)
app.delete('/api/subjects/:id', adminAuth, async (req, res) => {
    try {
        await Subject.findOneAndDelete({ id: req.params.id });
        res.json({ message: 'Đã xóa môn học' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== EXAM ROUTES (UPDATED) ==========

// Get exams with new filters (public - for students)
app.get('/api/exams/filter', async (req, res) => {
    try {
        const { grade, subjectId, semester, accessType } = req.query;
        const query = { status: 'published' };

        if (grade) query.grade = grade;
        if (subjectId) query.subjectId = subjectId;
        if (semester) query.semester = semester;
        if (accessType) query.accessType = accessType;

        const exams = await Exam.find(query).select('-questions');
        res.json(exams);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get exam counts by grade and subject
app.get('/api/exams/stats', async (req, res) => {
    try {
        const stats = await Exam.aggregate([
            { $match: { status: 'published' } },
            {
                $group: {
                    _id: { grade: '$grade', subjectId: '$subjectId' },
                    total: { $sum: 1 },
                    freeCount: { $sum: { $cond: [{ $eq: ['$accessType', 'free'] }, 1, 0] } },
                    vipCount: { $sum: { $cond: [{ $eq: ['$accessType', 'vip'] }, 1, 0] } }
                }
            }
        ]);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== VIP ROUTES ==========

// Check if user has VIP access for subject+grade
app.get('/api/vip/check', auth, async (req, res) => {
    try {
        const { subjectId, grade } = req.query;
        const user = await User.findById(req.user._id);

        const hasVip = user.vipSubjects?.some(vip =>
            vip.subjectId === subjectId &&
            vip.grade === grade &&
            (!vip.expiresAt || new Date(vip.expiresAt) > new Date())
        );

        res.json({ hasVip });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get user's VIP subjects
app.get('/api/vip/my', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json(user.vipSubjects || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Activate VIP for user
app.post('/api/vip/activate', adminAuth, async (req, res) => {
    try {
        const { userId, subjectId, grade, expiresAt } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Không tìm thấy user' });
        }

        if (!user.vipSubjects) user.vipSubjects = [];

        // Check if already has this VIP
        const existingIndex = user.vipSubjects.findIndex(
            v => v.subjectId === subjectId && v.grade === grade
        );

        if (existingIndex >= 0) {
            // Update existing
            user.vipSubjects[existingIndex].expiresAt = expiresAt || null;
            user.vipSubjects[existingIndex].activatedAt = new Date();
        } else {
            // Add new
            user.vipSubjects.push({
                subjectId,
                grade,
                activatedAt: new Date(),
                expiresAt: expiresAt || null
            });
        }

        await user.save();
        res.json({ message: 'Đã kích hoạt VIP', vipSubjects: user.vipSubjects });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Deactivate VIP for user
app.post('/api/vip/deactivate', adminAuth, async (req, res) => {
    try {
        const { userId, subjectId, grade } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Không tìm thấy user' });
        }

        user.vipSubjects = (user.vipSubjects || []).filter(
            v => !(v.subjectId === subjectId && v.grade === grade)
        );

        await user.save();
        res.json({ message: 'Đã hủy VIP', vipSubjects: user.vipSubjects });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all users with VIP (admin)
app.get('/api/vip/users', adminAuth, async (req, res) => {
    try {
        const users = await User.find({
            'vipSubjects.0': { $exists: true }
        }).select('name username email vipSubjects');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== PDF SETTINGS API ==========

// Get PDF settings
app.get('/api/settings/pdf', async (req, res) => {
    try {
        const settings = await Settings.findOne({ key: 'pdf' });
        if (settings) {
            res.json(settings.value);
        } else {
            // Default settings
            res.json({
                headerLeft1: 'LUYỆN ĐỀ ONLINE',
                headerRight1: 'ĐỀ LUYỆN TẬP',
                headerLeft2: 'ĐỀ THI THỬ',
                showPageCount: true,
                showDuration: true,
                showStudentInfo: true,
                footerNote: '- Thí sinh KHÔNG được sử dụng tài liệu.'
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update PDF settings (admin only)
app.put('/api/settings/pdf', adminAuth, async (req, res) => {
    try {
        const settings = await Settings.findOneAndUpdate(
            { key: 'pdf' },
            { key: 'pdf', value: req.body },
            { upsert: true, new: true }
        );
        res.json(settings.value);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== CATCH-ALL ROUTE ==========
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    await initDefaultAdmin();
    await initDefaultSubjects();
});
