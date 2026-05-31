import mongoose from 'mongoose';
import ContentTemplate from '../models/ContentTemplate.js';
import QuizTemplate from '../models/QuizTemplate.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

export const seedTemplates = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check if templates already exist
        const existingContent = await ContentTemplate.findOne({ name: 'System Design 2024' });
        const existingQuiz = await QuizTemplate.findOne({ name: 'SD Quiz Set 1' });

        if (existingContent && existingQuiz) {
            console.log('Templates already exist!');
            console.log('Content Template ID:', existingContent._id);
            console.log('Quiz Template ID:', existingQuiz._id);
            process.exit(0);
        }

        // Create Content Template
        const contentTemplate = await ContentTemplate.create({
            _id: uuidv4(),
            name: 'System Design 2024',
            description: 'Comprehensive 30-day system design course',
            category: 'system-design',
            contentItems: Array.from({ length: 30 }, (_, i) => ({
                day: i + 1,
                title: [
                    'Introduction to System Design',
                    'Scalability Fundamentals',
                    'Database Design & SQL',
                    'NoSQL Databases',
                    'Caching Strategies',
                    'Load Balancing',
                    'Microservices Architecture',
                    'Message Queues',
                    'CDN & Edge Computing',
                    'CAP Theorem',
                    'Consistent Hashing',
                    'Database Sharding',
                    'Replication Strategies',
                    'Rate Limiting',
                    'API Gateway',
                    'Service Discovery',
                    'Circuit Breakers',
                    'Event-Driven Architecture',
                    'Data Pipeline',
                    'Search Systems',
                    'Notification Systems',
                    'Payment Systems',
                    'Distributed Transactions',
                    'Two-Phase Commit',
                    'Saga Pattern',
                    'Monitoring & Logging',
                    'Security Best Practices',
                    'Performance Optimization',
                    'Case Study: URL Shortener',
                    'Case Study: Social Media Feed'
                ][i],
                videoUrl: `https://cdn.example.com/sd2024/day${i + 1}.mp4`,
                description: `Day ${i + 1} covers essential system design concepts`,
                duration: 600
            }))
        });

        console.log('✅ Content Template created:', contentTemplate._id);

        // Create Quiz Template
        const quizTemplate = await QuizTemplate.create({
            _id: uuidv4(),
            name: 'SD Quiz Set 1',
            description: 'Quizzes for System Design 2024 course',
            category: 'system-design',
            quizDays: Array.from({ length: 30 }, (_, i) => ({
                day: i + 1,
                title: `Day ${i + 1} Quiz`,
                questions: [
                    {
                        question: `What is the main concept covered in Day ${i + 1}?`,
                        options: ['Scalability', 'Availability', 'Reliability', 'Performance'],
                        correctAnswer: i % 4,
                        score: 10
                    },
                    {
                        question: 'Which approach is best for horizontal scaling?',
                        options: ['Bigger server', 'More servers', 'Better code', 'Database optimization'],
                        correctAnswer: 1,
                        score: 10
                    },
                    {
                        question: 'What is the primary purpose of caching?',
                        options: ['Data persistence', 'Reduce latency', 'Data backup', 'Security'],
                        correctAnswer: 1,
                        score: 10
                    }
                ],
                timeLimit: 300
            }))
        });

        console.log('✅ Quiz Template created:', quizTemplate._id);
        console.log('\n📝 Use these IDs when creating admins:');
        console.log(`   contentTemplateId: "${contentTemplate._id}"`);
        console.log(`   quizTemplateId: "${quizTemplate._id}"`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

