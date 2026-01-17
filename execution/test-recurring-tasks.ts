// Quick Test Script for Recurring Tasks
// Open browser console and paste this to create test recurring tasks

import { createRecurringTask } from '../src/database';

// Test Function 1: Create "GYMMA" daily task
async function createGymmaTask() {
    const task = await createRecurringTask('GYMMA', 'daily', 'fitness', '#FF5733', '06:00');
    console.log('✅ Created GYMMA recurring task:', task);
    return task;
}

// Test Function 2: Create "10K Steps" daily task
async function create10KStepsTask() {
    const task = await createRecurringTask('10K Steps', 'daily', 'health', '#4CAF50', '18:00');
    console.log('✅ Created 10K Steps recurring task:', task);
    return task;
}

// Test Function 3: Create "Morning Meditation" daily task
async function createMeditationTask() {
    const task = await createRecurringTask('Morning Meditation', 'daily', 'wellness', '#9C27B0', '07:00');
    console.log('✅ Created Morning Meditation recurring task:', task);
    return task;
}

// Test Function 4: Create all test tasks
async function createAllTestTasks() {
    console.log('🚀 Creating test recurring tasks...');
    await createGymmaTask();
    await create10KStepsTask();
    await createMeditationTask();
    console.log('🎉 All test recurring tasks created! Reload the app to see them.');
}

// Export for console use
if (typeof window !== 'undefined') {
    (window as any).createGymmaTask = createGymmaTask;
    (window as any).create10KStepsTask = create10KStepsTask;
    (window as any).createMeditationTask = createMeditationTask;
    (window as any).createAllTestTasks = createAllTestTasks;

    console.log('📝 Recurring task test functions loaded!');
    console.log('Available commands:');
    console.log('  - createGymmaTask()');
    console.log('  - create10KStepsTask()');
    console.log('  - createMeditationTask()');
    console.log('  - createAllTestTasks()');
}

export { createGymmaTask, create10KStepsTask, createMeditationTask, createAllTestTasks };
