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
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

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
    role: { type: String, enum: ['student', 'admin', 'super'], default: 'student' },
    activatedPackages: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

// Package Schema
const packageSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: String,
    icon: { type: String, default: '📝' },
    duration: { type: Number, default: 90 },
    accessType: { type: String, enum: ['open', 'register', 'updating'], default: 'register' },
    createdAt: { type: Date, default: Date.now }
});

// Exam Schema
const examSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    packageId: String,
    title: { type: String, required: true },
    tag: String,
    status: { type: String, enum: ['draft', 'published', 'view_only', 'updating'], default: 'draft' },
    questions: [{
        id: Number,
        type: { type: String, enum: ['multiple-choice', 'true-false', 'fill-in-blank'] },
        question: String,
        options: [String],
        correctAnswer: mongoose.Schema.Types.Mixed,
        correctAnswers: [mongoose.Schema.Types.Mixed],  // Support both Boolean and String
        explanation: String
    }],
    createdBy: String,
    createdAt: { type: Date, default: Date.now }
});

// Exam History Schema
const historySchema = new mongoose.Schema({
    odl: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    examId: String,
    packageId: String,
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
        if (req.user.role === 'admin' || req.user.role === 'super') {
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

// Admin Login
app.post('/api/auth/admin-login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username, role: { $in: ['admin', 'super'] } });
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

// Get current user
app.get('/api/auth/me', auth, (req, res) => {
    res.json({
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        username: req.user.username,
        role: req.user.role,
        activatedPackages: req.user.activatedPackages
    });
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
        res.json(packages);
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

// Get exams by package
app.get('/api/exams', async (req, res) => {
    try {
        const query = req.query.packageId ? { packageId: req.query.packageId } : {};
        const exams = await Exam.find(query);
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
        const exam = new Exam(req.body);
        await exam.save();
        res.status(201).json(exam);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update exam
app.put('/api/exams/:id', adminAuth, async (req, res) => {
    try {
        const exam = await Exam.findOneAndUpdate(
            { id: req.params.id },
            req.body,
            { new: true }
        );
        res.json(exam);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete exam
app.delete('/api/exams/:id', adminAuth, async (req, res) => {
    try {
        await Exam.findOneAndDelete({ id: req.params.id });
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
        const admins = await User.find({ role: { $in: ['admin', 'super'] } }).select('-password');
        res.json(admins);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create admin
app.post('/api/admins', adminAuth, async (req, res) => {
    try {
        const { name, username, password, role } = req.body;
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

// ========== CATCH-ALL ROUTE ==========
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    await initDefaultAdmin();
});
