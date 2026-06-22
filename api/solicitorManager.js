import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'data', 'solicitors.json');
const HEARINGS_FILE = path.join(__dirname, 'data', 'hearings.json');
const NOTIFICATIONS_FILE = path.join(__dirname, 'data', 'notifications.json');

// Load data
let solicitors = [];
let hearings = [];
let cases = [];
let notifications = [];

try { solicitors = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e) { solicitors = []; }
try { hearings = JSON.parse(fs.readFileSync(HEARINGS_FILE, 'utf8')); } catch(e) { hearings = []; }
try { notifications = JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf8')); } catch(e) { notifications = []; }

const saveData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// Default solicitors
if (solicitors.length === 0) {
    solicitors = [
        { id: 1, name: "Sarah Thornton", email: "sarah.thornton@lawfirm.com", phone: "+44 7700 900001", specialization: "Criminal Defense", active: true, cases: 0 },
        { id: 2, name: "James Mitchell", email: "james.mitchell@lawfirm.com", phone: "+44 7700 900002", specialization: "Family Law", active: true, cases: 0 },
        { id: 3, name: "Emily Roberts", email: "emily.roberts@lawfirm.com", phone: "+44 7700 900003", specialization: "Civil Rights", active: true, cases: 0 },
        { id: 4, name: "David Okafor", email: "david.okafor@lawfirm.com", phone: "+44 7700 900004", specialization: "Immigration Law", active: true, cases: 0 },
        { id: 5, name: "Rachel Chen", email: "rachel.chen@lawfirm.com", phone: "+44 7700 900005", specialization: "Corporate Law", active: true, cases: 0 },
        { id: 6, name: "Michael Brown", email: "michael.brown@lawfirm.com", phone: "+44 7700 900006", specialization: "Criminal Defense", active: true, cases: 0 },
        { id: 7, name: "Patricia Williams", email: "patricia.williams@lawfirm.com", phone: "+44 7700 900007", specialization: "Human Rights", active: true, cases: 0 },
        { id: 8, name: "Robert Johnson", email: "robert.johnson@lawfirm.com", phone: "+44 7700 900008", specialization: "Property Law", active: true, cases: 0 },
    ];
    saveData(DATA_FILE, solicitors);
    console.log('✅ Default solicitors created');
}

// Default hearings
if (hearings.length === 0) {
    hearings = [
        { id: 1, caseNumber: "CASE-2024-001", userId: 1, hearingDate: "2026-07-15T10:00:00", court: "Magistrates Court #3", judge: "Hon. Justice Thompson", status: "Scheduled", notes: "Initial hearing" },
        { id: 2, caseNumber: "CASE-2024-002", userId: 1, hearingDate: "2026-08-20T14:00:00", court: "Crown Court #1", judge: "Hon. Justice Williams", status: "Scheduled", notes: "Evidence review" },
    ];
    saveData(HEARINGS_FILE, hearings);
    console.log('✅ Default hearings created');
}

// Random solicitor assignment
export function assignRandomSolicitor(userId, caseNumber) {
    const active = solicitors.filter(s => s.active);
    if (active.length === 0) return null;
    
    const random = active[Math.floor(Math.random() * active.length)];
    random.cases = (random.cases || 0) + 1;
    saveData(DATA_FILE, solicitors);
    
    const assignment = {
        userId,
        caseNumber,
        solicitorId: random.id,
        solicitorName: random.name,
        solicitorEmail: random.email,
        assignedAt: new Date().toISOString()
    };
    
    console.log(`👨‍⚖️ Solicitor ${random.name} assigned to case ${caseNumber}`);
    return assignment;
}

// Rotate solicitor for a case
export function rotateSolicitor(userId, caseNumber) {
    const active = solicitors.filter(s => s.active);
    if (active.length === 0) return null;
    
    // Find current solicitor and exclude them
    const currentAssignment = getSolicitorForCase(caseNumber);
    const available = currentAssignment 
        ? active.filter(s => s.id !== currentAssignment.solicitorId)
        : active;
    
    const random = available[Math.floor(Math.random() * available.length)];
    random.cases = (random.cases || 0) + 1;
    
    if (currentAssignment) {
        const oldSolicitor = solicitors.find(s => s.id === currentAssignment.solicitorId);
        if (oldSolicitor) oldSolicitor.cases = Math.max(0, (oldSolicitor.cases || 1) - 1);
    }
    
    saveData(DATA_FILE, solicitors);
    
    console.log(`🔄 Solicitor rotated to ${random.name} for case ${caseNumber}`);
    return {
        userId,
        caseNumber,
        solicitorId: random.id,
        solicitorName: random.name,
        solicitorEmail: random.email,
        assignedAt: new Date().toISOString(),
        rotated: true
    };
}

// Get solicitor for a case
export function getSolicitorForCase(caseNumber) {
    return null; // Implement case-solicitor mapping if needed
}

// Get all solicitors
export function getAllSolicitors() {
    return solicitors;
}

// Get upcoming hearings for a user
export function getUserHearings(userId) {
    return hearings.filter(h => h.userId === userId)
        .sort((a, b) => new Date(a.hearingDate) - new Date(b.hearingDate));
}

// Add hearing
export function addHearing(userId, caseNumber, hearingDate, court, judge, notes = '') {
    const newHearing = {
        id: hearings.length + 1,
        caseNumber,
        userId,
        hearingDate,
        court,
        judge,
        status: "Scheduled",
        notes,
        createdAt: new Date().toISOString()
    };
    hearings.push(newHearing);
    saveData(HEARINGS_FILE, hearings);
    console.log(`📅 Hearing scheduled: ${caseNumber} on ${hearingDate}`);
    return newHearing;
}

// Add notification (admin messages only)
export function addNotification(userId, message, type = 'admin_message') {
    const notification = {
        id: notifications.length + 1,
        userId,
        message,
        type,
        read: false,
        createdAt: new Date().toISOString()
    };
    notifications.push(notification);
    saveData(NOTIFICATIONS_FILE, notifications);
    console.log(`🔔 Notification for user ${userId}: ${message.substring(0, 50)}...`);
    return notification;
}

// Get user notifications
export function getUserNotifications(userId) {
    return notifications.filter(n => n.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Mark notification as read
export function markNotificationRead(notificationId) {
    const notif = notifications.find(n => n.id === notificationId);
    if (notif) {
        notif.read = true;
        saveData(NOTIFICATIONS_FILE, notifications);
    }
}

// Check for upcoming hearings (within 48 hours)
export function checkUpcomingHearings() {
    const now = new Date();
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    
    const upcoming = hearings.filter(h => {
        const hearingTime = new Date(h.hearingDate);
        return hearingTime > now && hearingTime <= in48Hours && h.status === 'Scheduled';
    });
    
    return upcoming;
}


// Case management
export { notifications, hearings, cases };
export { notifications, hearings, cases };
export { notifications, hearings, cases };
export function getUserCases(userId) {
    return cases.filter(c => c.userId === userId);
}
export function addCase(userId, title, offence, status, hearingDate) {
    const newCase = {
        id: cases.length + 1,
        case_number: `CASE-${Date.now()}`,
        userId,
        title: title || 'New Case',
        offence: offence || 'TBD',
        status: status || 'Active',
        hearingDate: hearingDate || null,
        assignedAt: new Date().toISOString()
    };
    cases.push(newCase);
    return newCase;
}

// Automated hearing reminder (runs every hour)
cron.schedule('0 * * * *', () => {
    console.log('🔍 Checking for upcoming hearings...');
    const upcoming = checkUpcomingHearings();
    upcoming.forEach(h => {
        addNotification(h.userId, 
            `📅 HEARING REMINDER: Your hearing for case ${h.caseNumber} is on ${new Date(h.hearingDate).toLocaleString()} at ${h.court} with ${h.judge}. Please arrive 30 minutes early.`,
            'hearing_reminder'
        );
    });
    if (upcoming.length > 0) {
        console.log(`📢 Sent ${upcoming.length} hearing reminders`);
    }
});

// Weekly solicitor rotation (every Monday at 9am)
cron.schedule('0 9 * * 1', () => {
    console.log('🔄 Running weekly solicitor rotation...');
    const allCases = [...new Set(hearings.map(h => h.caseNumber))];
    allCases.forEach(caseNum => {
        const hearing = hearings.find(h => h.caseNumber === caseNum);
        if (hearing) {
            const newSolicitor = rotateSolicitor(hearing.userId, caseNum);
            if (newSolicitor) {
                addNotification(hearing.userId,
                    `👨‍⚖️ SOLICITOR UPDATE: Your solicitor for case ${caseNum} has been changed to ${newSolicitor.solicitorName} (${newSolicitor.solicitorEmail}).`,
                    'solicitor_rotation'
                );
            }
        }
    });
});

console.log('📋 Solicitor Manager initialized');
console.log('📅 Hearing reminders: Every hour');
console.log('🔄 Solicitor rotation: Every Monday 9am');

export default {
    getUserCases,
    addCase,
    assignRandomSolicitor,
    rotateSolicitor,
    getAllSolicitors,
    getUserHearings,
    addHearing,
    addNotification,
    getUserNotifications,
    markNotificationRead,
    checkUpcomingHearings
};
