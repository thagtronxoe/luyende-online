// Script to check exam answers in MongoDB
require('dotenv').config();
const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({}, { strict: false });
const Exam = mongoose.model('Exam', examSchema);

async function checkAnswers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/luyenthionline');
        console.log('✅ Connected to MongoDB');

        const exams = await Exam.find({});
        console.log(`\n📊 Found ${exams.length} exams in database\n`);

        exams.forEach((exam, idx) => {
            console.log(`\n=== Exam ${idx + 1}: ${exam.title || exam.examTitle || 'Untitled'} ===`);
            console.log(`ID: ${exam._id}`);
            console.log(`Package: ${exam.packageId}`);

            if (exam.questions && exam.questions.length > 0) {
                // Check first 3 MC questions
                const mcQuestions = exam.questions.filter(q => q.type === 'multiple-choice').slice(0, 3);
                console.log(`\nFirst ${mcQuestions.length} Multiple Choice questions:`);

                mcQuestions.forEach((q, i) => {
                    console.log(`  Q${i + 1}: ${q.question?.substring(0, 50)}...`);
                    console.log(`      Options: ${q.options?.join(' | ')}`);
                    console.log(`      Correct Answer: "${q.correctAnswer}" ${!q.correctAnswer ? '⚠️ MISSING!' : '✓'}`);
                });
            } else {
                console.log('⚠️ No questions found!');
            }
        });

        await mongoose.connection.close();
        console.log('\n✅ Check complete');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkAnswers();
