import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load data
let users = [];
let cases = [];
let userCases = [];
let mfaCodes = [];
let auditLogs = [];

try { users = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users.json'), 'utf8')); } catch(e) { users = []; }
try { cases = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'cases.json'), 'utf8')); } catch(e) { cases = []; }
try { userCases = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'user_cases.json'), 'utf8')); } catch(e) { userCases = []; }
try { mfaCodes = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'mfa_codes.json'), 'utf8')); } catch(e) { mfaCodes = []; }
try { auditLogs = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'audit_logs.json'), 'utf8')); } catch(e) { auditLogs = []; }

// Save functions
const saveUsers = () => fs.writeFileSync(path.join(DATA_DIR, 'users.json'), JSON.stringify(users, null, 2));
const saveCases = () => fs.writeFileSync(path.join(DATA_DIR, 'cases.json'), JSON.stringify(cases, null, 2));
const saveUserCases = () => fs.writeFileSync(path.join(DATA_DIR, 'user_cases.json'), JSON.stringify(userCases, null, 2));
const saveMfaCodes = () => fs.writeFileSync(path.join(DATA_DIR, 'mfa_codes.json'), JSON.stringify(mfaCodes, null, 2));
const saveAuditLogs = () => fs.writeFileSync(path.join(DATA_DIR, 'audit_logs.json'), JSON.stringify(auditLogs, null, 2));

// Initialize with test data if empty
if (users.length === 0) {
    users = [{
        id: 1,
        uuid: 'test-uuid-1',
        name: 'Victim User',
        email: 'victim@example.com',
        vin: 'VIN12345',
        password_hash: '$2a$12$testhash', // Will be set properly
        role: 'victim',
        email_verified: true,
        is_active: true,
        created_at: new Date().toISOString()
    }];
    saveUsers();
}

if (cases.length === 0) {
    cases = [
        { id: 1, case_number: 'CASE001', title: 'Theft Investigation', description: 'Vehicle theft case', status: 'Active', priority: 'High', assigned_officer: 'Detective Smith' },
        { id: 2, case_number: 'CASE002', title: 'Fraud Case', description: 'Financial fraud investigation', status: 'Under Review', priority: 'Medium', assigned_officer: 'Agent Johnson' }
    ];
    saveCases();
}

if (userCases.length === 0) {
    userCases = [
        { user_id: 1, case_id: 1, subscribed_to_notifications: true },
        { user_id: 1, case_id: 2, subscribed_to_notifications: true }
    ];
    saveUserCases();
}

export const query = async (text, params) => {
    // SELECT user by email/vin
    if (text.includes('SELECT id, name, email, vin, password_hash FROM users') && text.includes('WHERE email = $1 OR vin = $1')) {
        const searchValue = params[0];
        const user = users.find(u => u.email === searchValue || u.vin === searchValue);
        return { rows: user ? [user] : [] };
    }
    
    // SELECT user by email
    if (text.includes('SELECT id, name, email, vin FROM users WHERE email = $1')) {
        const email = params[0];
        const user = users.find(u => u.email === email);
        return { rows: user ? [user] : [] };
    }
    
    // INSERT new user
    if (text.includes('INSERT INTO users')) {
        const newId = users.length + 1;
        const newUser = {
            id: newId,
            uuid: require('crypto').randomUUID(),
            name: params[0],
            email: params[1],
            vin: params[2],
            password_hash: params[3],
            role: 'victim',
            email_verified: false,
            is_active: true,
            created_at: new Date().toISOString()
        };
        users.push(newUser);
        saveUsers();
        return { rows: [newUser] };
    }
    
    // UPDATE users last_login
    if (text.includes('UPDATE users SET last_login')) {
        const userId = params[0];
        const user = users.find(u => u.id === userId);
        if (user) {
            user.last_login = new Date().toISOString();
            saveUsers();
        }
        return { rows: [] };
    }
    
    // INSERT mfa code
    if (text.includes('INSERT INTO mfa_codes')) {
        const newId = mfaCodes.length + 1;
        const newCode = {
            id: newId,
            user_id: params[0],
            email: params[1],
            code: params[2],
            purpose: params[3],
            expires_at: params[4],
            attempts: 0,
            used: false,
            created_at: new Date().toISOString()
        };
        mfaCodes.push(newCode);
        saveMfaCodes();
        return { rows: [newCode] };
    }
    
    // SELECT mfa code
    if (text.includes('SELECT id, user_id, purpose, expires_at, attempts FROM mfa_codes')) {
        const email = params[0];
        const code = params[1];
        const mfaRecord = mfaCodes.find(m => m.email === email && m.code === code && !m.used);
        return { rows: mfaRecord ? [mfaRecord] : [] };
    }
    
    // UPDATE mfa code
    if (text.includes('UPDATE mfa_codes SET used = true')) {
        const codeId = params[0];
        const mfaRecord = mfaCodes.find(m => m.id === codeId);
        if (mfaRecord) {
            mfaRecord.used = true;
            saveMfaCodes();
        }
        return { rows: [] };
    }
    
    // INSERT audit log
    if (text.includes('INSERT INTO audit_log')) {
        const newId = auditLogs.length + 1;
        auditLogs.push({
            id: newId,
            user_id: params[0],
            email: params[1],
            action: params[2],
            success: params[3],
            details: params[4] ? JSON.parse(params[4]) : null,
            created_at: new Date().toISOString()
        });
        saveAuditLogs();
        return { rows: [] };
    }
    
    // SELECT user cases
    if (text.includes('SELECT c.case_number, c.title, c.description, c.status, c.priority, c.assigned_officer')) {
        const userId = params[0];
        const userCaseIds = userCases.filter(uc => uc.user_id === userId).map(uc => uc.case_id);
        const userCasesList = cases.filter(c => userCaseIds.includes(c.id));
        return { rows: userCasesList };
    }
    
    console.log('Unhandled query:', text.substring(0, 100));
    return { rows: [] };
};

export const testConnection = async () => {
    console.log('✅ File storage ready');
    return true;
};

export default { query, testConnection };
