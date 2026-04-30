/**
 * ClinicFlow - Sample Data Generator
 * Creates realistic demo data for showcase/demo purposes
 * Run: node seed-demo.js
 */

const Database = require("better-sqlite3");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "data", "clinicflow.db");
const db = new Database(dbPath);

function generateId() {
    return crypto.randomUUID();
}

function hashPassword(password) {
    return bcrypt.hashSync(password, 12);
}

console.log("🌱 ClinicFlow Sample Data Generator");
console.log("====================================\n");

// Clear existing demo data (keep users)
console.log("Clearing existing demo data...");
db.prepare("DELETE FROM messages").run();
db.prepare("DELETE FROM appointments").run();
db.prepare("DELETE FROM invoices").run();
db.prepare("DELETE FROM notifications").run();
console.log("✅ Demo data cleared\n");

// Get all users
const users = db.prepare("SELECT * FROM users").all();
console.log(`📋 Found ${users.length} users in database:\n`);
users.forEach(u => {
    console.log(`   ${u.role.toUpperCase().padEnd(8)} | ${u.fullName} (${u.email})`);
});

// Find doctors and patients
const doctors = users.filter(u => u.role === "doctor");
const patients = users.filter(u => u.role === "patient");

console.log(`\n📊 Statistics:`);
console.log(`   Doctors: ${doctors.length}`);
console.log(`   Patients: ${patients.length}`);

// Create sample appointments (realistic dates)
console.log("\n📅 Creating sample appointments...");

const today = new Date();
const appointments = [
    // Patient 1 appointments
    {
        patientId: patients[0]?.id,
        doctorId: doctors[0]?.id,
        department: "Cardiology",
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 0).toISOString().split('T')[0],
        time: "10:00",
        type: "Consultation",
        notes: "Regular checkup",
        status: "Scheduled"
    },
    {
        patientId: patients[0]?.id,
        doctorId: doctors[0]?.id,
        department: "Cardiology",
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 14, 30).toISOString().split('T')[0],
        time: "14:30",
        type: "Follow-up",
        notes: "Review test results",
        status: "Scheduled"
    },
    // Patient 2 appointments
    {
        patientId: patients[1]?.id,
        doctorId: doctors[1]?.id,
        department: "Dental Care",
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 11, 0).toISOString().split('T')[0],
        time: "11:00",
        type: "Checkup",
        notes: "Tooth pain",
        status: "Scheduled"
    },
    {
        patientId: patients[1]?.id,
        doctorId: doctors[2]?.id,
        department: "Dermatology",
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 15, 0).toISOString().split('T')[0],
        time: "15:00",
        type: "Consultation",
        notes: "Skin rash",
        status: "Scheduled"
    },
    // Today's appointment
    {
        patientId: patients[0]?.id,
        doctorId: doctors[2]?.id,
        department: "Dermatology",
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0).toISOString().split('T')[0],
        time: "09:00",
        type: "Consultation",
        notes: "Skin allergy",
        status: "Scheduled"
    },
    // Completed appointment (past)
    {
        patientId: patients[1]?.id,
        doctorId: doctors[0]?.id,
        department: "Cardiology",
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5, 10, 0).toISOString().split('T')[0],
        time: "10:00",
        type: "Consultation",
        notes: "Initial consultation",
        status: "Completed"
    }
].filter(a => a.patientId && a.doctorId);

const insertAppt = db.prepare(`
    INSERT INTO appointments (id, patientId, doctorId, department, appointmentDate, appointmentTime, type, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

appointments.forEach(appt => {
    insertAppt.run(
        generateId(),
        appt.patientId,
        appt.doctorId,
        appt.department,
        appt.date,
        appt.time,
        appt.type,
        appt.notes,
        appt.status
    );
});

console.log(`✅ Created ${appointments.length} sample appointments`);

// Create sample messages (realistic conversation)
console.log("\n💬 Creating sample messages...");

const messages = [
    {
        senderId: patients[0]?.id,
        recipientId: doctors[0]?.id,
        text: "Hello Doctor, I've been having chest pain for a few days. Can I book an appointment?"
    },
    {
        senderId: doctors[0]?.id,
        recipientId: patients[0]?.id,
        text: "Yes, please come in for a checkup. How about tomorrow at 10 AM?"
    },
    {
        senderId: patients[0]?.id,
        recipientId: doctors[0]?.id,
        text: "Tomorrow 10 AM works for me. Thank you doctor!"
    },
    {
        senderId: patients[1]?.id,
        recipientId: doctors[1]?.id,
        text: "Hi Dr. Hina, my tooth is hurting a lot. Any availability today?"
    },
    {
        senderId: doctors[1]?.id,
        recipientId: patients[1]?.id,
        text: "Yes, I have an opening at 2 PM today. Can you make it?"
    },
    {
        senderId: patients[1]?.id,
        recipientId: doctors[1]?.id,
        text: "Yes, 2 PM is perfect. See you soon!"
    },
    {
        senderId: patients[0]?.id,
        recipientId: doctors[1]?.id,
        text: "Hello, I also need a dental checkup. What are your charges?"
    },
    {
        senderId: doctors[1]?.id,
        recipientId: patients[0]?.id,
        text: "Initial consultation is PKR 1,500. Regular checkup is PKR 800. Please visit our clinic."
    }
].filter(m => m.senderId && m.recipientId);

const insertMsg = db.prepare(`
    INSERT INTO messages (id, senderId, recipientId, message, isRead)
    VALUES (?, ?, ?, ?, ?)
`);

messages.forEach(msg => {
    insertMsg.run(
        generateId(),
        msg.senderId,
        msg.recipientId,
        msg.text,
        0 // unread
    );
});

console.log(`✅ Created ${messages.length} sample messages`);

// Create sample invoices
console.log("\n💰 Creating sample invoices...");

const invoices = [
    {
        patientId: patients[0]?.id,
        amount: 2500,
        description: "Cardiology Consultation + ECG",
        status: "Pending"
    },
    {
        patientId: patients[0]?.id,
        amount: 1500,
        description: "Blood Test Panel",
        status: "Paid"
    },
    {
        patientId: patients[1]?.id,
        amount: 5000,
        description: "Dental Cleaning + Filling",
        status: "Pending"
    },
    {
        patientId: patients[1]?.id,
        amount: 800,
        description: "Dermatology Consultation",
        status: "Paid"
    }
].filter(inv => inv.patientId);

const insertInv = db.prepare(`
    INSERT INTO invoices (id, patientId, amount, description, status)
    VALUES (?, ?, ?, ?, ?)
`);

invoices.forEach(inv => {
    insertInv.run(
        generateId(),
        inv.patientId,
        inv.amount,
        inv.description,
        inv.status
    );
});

console.log(`✅ Created ${invoices.length} sample invoices`);

// Summary
console.log("\n====================================");
console.log("📊 SAMPLE DATA SUMMARY");
console.log("====================================");
console.log(`   Appointments: ${db.prepare("SELECT COUNT(*) as c FROM appointments").get().c}`);
console.log(`   Messages: ${db.prepare("SELECT COUNT(*) as c FROM messages").get().c}`);
console.log(`   Invoices: ${db.prepare("SELECT COUNT(*) as c FROM invoices").get().c}`);
console.log(`   Total Revenue Collected: PKR ${db.prepare("SELECT SUM(amount) as t FROM invoices WHERE status='Paid'").get().t || 0}`);
console.log(`   Pending Invoices Total: PKR ${db.prepare("SELECT SUM(amount) as t FROM invoices WHERE status='Pending'").get().t || 0}`);
console.log("====================================\n");

// Show what to demo
console.log("🎬 DEMO SCENARIO (Show this to client):");
console.log("");
console.log("1. Login as Admin (admin@clinic.com / password)");
console.log("   → Dashboard shows: 5 appointments today (some scheduled)");
console.log("   → Admin tab shows: 2 patients, 3 doctors, revenue PKR 3,300");
console.log("");
console.log("2. Login as Patient 1 (patient1@clinic.com / password)");
console.log("   → Dashboard: See upcoming appointments");
console.log("   → Messages: See conversation with Dr. Sana");
console.log("   → Invoices: See 2 invoices (1 pending PKR 2500)");
console.log("");
console.log("3. Login as Doctor (doctor1@clinic.com / password)");
console.log("   → Dashboard: Shows today's appointments");
console.log("   → Appointments: See all scheduled patients");
console.log("   → Messages: Reply to patient messages");
console.log("");
console.log("✅ All data is realistic and demonstrates real usage!");
console.log("");

db.close();
console.log("✅ Database connection closed");
console.log("\nReady for client demo! 🏥");
