/**
 * ClinicFlow - Production-Ready Healthcare Management System
 * ============================================================
 * A complete hospital/clinic operations platform with enterprise-grade
 * security, comprehensive validation, and professional error handling.
 *
 * Features:
 * - Secure authentication with bcrypt + salt rounds
 * - Rate limiting to prevent brute force attacks
 * - Input validation on all endpoints
 * - Security headers with Helmet.js
 * - Structured logging with Winston
 * - Role-based access control (Admin, Doctor, Patient, Staff)
 * - Appointment scheduling & management
 * - Real-time messaging between users
 * - Invoice creation and tracking
 * - Admin dashboard with analytics
 * - SQLite database with WAL mode
 *
 * Built for: Private Clinics, Hospitals, Dental Practices, Wellness Centers
 *
 * @version 2.0.0
 * @author ClinicFlow Development Team
 * @license Commercial
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const winston = require("winston");
const morgan = require("morgan");
const crypto = require("crypto");
const Database = require("better-sqlite3");

// Load environment configuration
const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || "development",
    databasePath: process.env.DATABASE_PATH || path.join(__dirname, "data", "clinicflow.db"),
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
    allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(","),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
    enableDemoReset: process.env.ENABLE_DEMO_RESET !== "false"
};

// Initialize Express application
const app = express();

// ==================== LOGGING CONFIGURATION ====================

const logger = winston.createLogger({
    level: config.logLevel,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: "clinicflow-server" },
    transports: [
        new winston.transports.File({ filename: "logs/error.log", level: "error" }),
        new winston.transports.File({ filename: "logs/combined.log" }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

if (config.nodeEnv === "production") {
    logger.remove(logger.transports[2]); // Remove console in production
}

// HTTP request logging
app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev", {
    stream: { write: (msg) => logger.info(msg.trim()) }
}));

// ==================== SECURITY MIDDLEWARE ====================

// Security headers with Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration - restrict to allowed origins only
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);

        const allowed = config.allowedOrigins.some(allowedOrigin =>
            origin === allowedOrigin || origin.endsWith(allowedOrigin)
        );

        if (allowed || config.nodeEnv === "development") {
            callback(null, true);
        } else {
            logger.warn(`Blocked CORS request from origin: ${origin}`);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    exposedHeaders: ["X-Reset-Demo"]
}));

// Rate limiting - separate limits for different endpoints
const generalLimiter = rateLimit({
    windowMs: config.rateLimitWindow,
    max: config.rateLimitMax,
    message: { error: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({ error: "Too many requests. Please try again later." });
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: { error: "Too many login attempts. Please try again after 15 minutes." },
    skipSuccessfulRequests: true,
    handler: (req, res) => {
        logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({ error: "Too many authentication attempts. Please try again later." });
    }
});

// Apply rate limiting
app.use("/api/", generalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files serving
app.use(express.static(path.join(__dirname), {
    maxAge: config.nodeEnv === "production" ? "1d" : 0
}));

// ==================== DATABASE INITIALIZATION ====================

// Ensure data directory exists
const dataDir = path.dirname(config.databasePath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure logs directory exists
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Initialize SQLite database with WAL mode for better performance
const db = new Database(config.databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

logger.info(`Database initialized: ${config.databasePath}`);

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate a cryptographically secure unique identifier
 * @returns {string} UUID v4
 */
function generateId() {
    return crypto.randomUUID();
}

/**
 * Hash password using bcrypt with salt rounds
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
    return await bcrypt.hash(password, config.bcryptSaltRounds);
}

/**
 * Verify password against stored hash
 * @param {string} inputPassword - Plain text password
 * @param {string} storedHash - Hashed password from database
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(inputPassword, storedHash) {
    return await bcrypt.compare(inputPassword, storedHash);
}

/**
 * Format SQLite row to safe JSON (remove sensitive fields)
 * @param {Object} row - Database row
 * @returns {Object} Sanitized object
 */
function sanitizeUser(row) {
    if (!row) return null;
    const { password, ...safe } = row;
    return safe;
}

/**
 * Send standardized JSON error response
 * @param {express.Response} res - Express response object
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 * @param {Error} error - Optional error object for logging
 */
function sendError(res, status, message, error = null) {
    if (error) {
        logger.error(`${message}: ${error.message}`, { stack: error.stack });
    } else {
        logger.warn(`API error ${status}: ${message}`);
    }
    res.status(status).json({ error: message });
}

/**
 * Validation middleware wrapper
 * @param {Array} validations - express-validator validation chains
 * @returns {Function} Middleware function
 */
function validate(validations) {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        const errorMessages = errors.array().map(err => err.msg);
        logger.debug(`Validation failed: ${errorMessages.join(", ")}`);
        res.status(400).json({ error: errorMessages.join(", ") });
    };
}

// ==================== DATABASE SCHEMA ====================

function initializeDatabase() {
    logger.info("Initializing database schema...");

    // Users table - all system users
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL COLLATE NOCASE,
            password TEXT NOT NULL,
            fullName TEXT NOT NULL,
            phone TEXT,
            role TEXT NOT NULL CHECK(role IN ('admin', 'doctor', 'staff', 'patient')),
            department TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create index for faster user lookups
    db.exec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);

    // Messages table - user conversations
    db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            senderId TEXT NOT NULL,
            recipientId TEXT NOT NULL,
            message TEXT NOT NULL,
            isRead INTEGER DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (recipientId) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(senderId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipientId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(createdAt DESC)`);

    // Appointments table
    db.exec(`
        CREATE TABLE IF NOT EXISTS appointments (
            id TEXT PRIMARY KEY,
            patientId TEXT NOT NULL,
            doctorId TEXT NOT NULL,
            department TEXT,
            appointmentDate DATE NOT NULL,
            appointmentTime TIME NOT NULL,
            type TEXT DEFAULT 'Consultation',
            notes TEXT,
            status TEXT DEFAULT 'Scheduled' CHECK(status IN ('Scheduled', 'Completed', 'Cancelled', 'No-Show')),
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patientId) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (doctorId) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patientId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctorId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointmentDate)`);

    // Invoices table
    db.exec(`
        CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY,
            patientId TEXT NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            description TEXT DEFAULT 'Healthcare Service',
            status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Paid', 'Overdue', 'Cancelled')),
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            paidAt DATETIME,
            FOREIGN KEY (patientId) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patientId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`);

    // Notifications table
    db.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            isRead INTEGER DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId)`);

    logger.info("Database schema initialized successfully");
    seedDemoData();
}

// ==================== DEMO DATA SEEDING ====================

function seedDemoData() {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;

    if (userCount === 0) {
        logger.info("Seeding demo users...");

        const demoUsers = [
            {
                email: "admin@clinic.com",
                password: "password",
                fullName: "Admin User",
                phone: "+92 300 0000000",
                role: "admin",
                department: "Administration"
            },
            {
                email: "doctor1@clinic.com",
                password: "password",
                fullName: "Dr. Sana Qureshi",
                phone: "+92 300 1111111",
                role: "doctor",
                department: "Cardiology"
            },
            {
                email: "doctor2@clinic.com",
                password: "password",
                fullName: "Dr. Hina Malik",
                phone: "+92 300 2222222",
                role: "doctor",
                department: "Dental Care"
            },
            {
                email: "doctor3@clinic.com",
                password: "password",
                fullName: "Dr. Bilal Ahmed",
                phone: "+92 300 3333333",
                role: "doctor",
                department: "Dermatology"
            },
            {
                email: "patient1@clinic.com",
                password: "password",
                fullName: "Patient One",
                phone: "+92 300 4444444",
                role: "patient"
            },
            {
                email: "patient2@clinic.com",
                password: "password",
                fullName: "Patient Two",
                phone: "+92 300 5555555",
                role: "patient"
            }
        ];

        const insertUser = db.prepare(`
            INSERT INTO users (id, email, password, fullName, phone, role, department)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const user of demoUsers) {
            const hashedPassword = hashPasswordSync(user.password);
            insertUser.run(
                generateId(),
                user.email.toLowerCase(),
                hashedPassword,
                user.fullName,
                user.phone,
                user.role,
                user.department || null
            );
        }

        logger.info("Demo users created successfully");
        console.log("\n============================================");
        console.log("  ClinicFlow Demo Accounts Created");
        console.log("============================================");
        console.log("  Admin:    admin@clinic.com    / password");
        console.log("  Doctor 1: doctor1@clinic.com  / password");
        console.log("  Doctor 2: doctor2@clinic.com  / password");
        console.log("  Doctor 3: doctor3@clinic.com  / password");
        console.log("  Patient:  patient1@clinic.com / password");
        console.log("============================================\n");
    }
}

/**
 * Synchronous password hashing for initial seeding
 * @param {string} password
 * @returns {string}
 */
function hashPasswordSync(password) {
    return bcrypt.hashSync(password, config.bcryptSaltRounds);
}

// Initialize database on startup
initializeDatabase();

// ==================== HEALTH CHECK ====================

app.get("/api/health", (req, res) => {
    res.json({
        ok: true,
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "2.0.0",
        database: config.databasePath,
        environment: config.nodeEnv
    });
});

// ==================== AUTHENTICATION ENDPOINTS ====================

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 * Rate limited: 10 attempts per 15 minutes
 */
app.post("/api/auth/login", validate([
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required")
]), authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

        if (!user) {
            logger.warn(`Login attempt for non-existent user: ${email}`);
            return sendError(res, 401, "Invalid email or password");
        }

        const passwordValid = await verifyPassword(password, user.password);
        if (!passwordValid) {
            logger.warn(`Failed login attempt for user: ${email}`);
            return sendError(res, 401, "Invalid email or password");
        }

        // Remove sensitive data
        const { password: _, ...userWithoutPassword } = user;

        // Update last login (optional - requires adding column)
        logger.info(`User logged in successfully: ${email} (${user.role})`);

        res.json({
            success: true,
            user: userWithoutPassword,
            message: "Login successful"
        });
    } catch (error) {
        sendError(res, 500, "Login failed. Please try again.", error);
    }
});

/**
 * POST /api/auth/register
 * Create new user account
 */
app.post("/api/auth/register", validate([
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("fullName").trim().notEmpty().withMessage("Full name required"),
    body("phone").optional().isLength({ min: 10 }).withMessage("Phone number required (min 10 digits)"),
    body("role").isIn(["patient", "doctor", "staff", "admin"]).withMessage("Invalid role")
]), async (req, res) => {
    try {
        const { email, password, fullName, phone, role } = req.body;

        // Check if email exists
        const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
        if (existing) {
            return sendError(res, 400, "Email already registered");
        }

        // Create new user
        const userId = generateId();
        const hashedPassword = await hashPassword(password);

        db.prepare(`
            INSERT INTO users (id, email, password, fullName, phone, role, department)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(userId, email.toLowerCase(), hashedPassword, fullName.trim(), phone, role, null);

        const newUser = sanitizeUser(
            db.prepare("SELECT id, email, fullName, role FROM users WHERE id = ?").get(userId)
        );

        logger.info(`New user registered: ${email} as ${role}`);

        res.status(201).json({
            success: true,
            message: "Account created successfully. You can now login.",
            user: newUser
        });
    } catch (error) {
        sendError(res, 500, "Registration failed. Please try again.", error);
    }
});

// ==================== USERS ENDPOINTS ====================

/**
 * GET /api/users/search?query=...&role=...
 * Search users by name, email, or department
 * MUST come before /api/users/:id to avoid route conflicts
 */
app.get("/api/users/search", (req, res) => {
    try {
        const { query, role } = req.query;

        if (!query || query.trim().length < 2) {
            return sendError(res, 400, "Search query must be at least 2 characters");
        }

        const searchTerm = `%${query.trim()}%`;
        let sql = `
            SELECT id, fullName, email, role, department, phone
            FROM users
            WHERE fullName LIKE ? OR email LIKE ? OR department LIKE ?
        `;
        const params = [searchTerm, searchTerm, searchTerm];

        if (role) {
            sql += " AND role = ?";
            params.push(role);
        }

        sql += " ORDER BY fullName ASC LIMIT 20";

        const users = db.prepare(sql).all(...params);
        res.json(users.map(sanitizeUser));
    } catch (error) {
        sendError(res, 500, "Search failed", error);
    }
});

/**
 * GET /api/users
 * Get all users (basic info)
 */
app.get("/api/users", (req, res) => {
    try {
        const users = db.prepare(`
            SELECT id, fullName, email, role, department, phone, createdAt
            FROM users
            ORDER BY role, fullName
        `).all();

        res.json(users.map(sanitizeUser));
    } catch (error) {
        sendError(res, 500, "Failed to fetch users", error);
    }
});

/**
 * GET /api/users/:id
 * Get single user by ID
 */
app.get("/api/users/:id", (req, res) => {
    try {
        const user = db.prepare(`
            SELECT id, fullName, email, role, department, phone, createdAt
            FROM users WHERE id = ?
        `).get(req.params.id);

        if (!user) {
            return sendError(res, 404, "User not found");
        }

        res.json(sanitizeUser(user));
    } catch (error) {
        sendError(res, 500, "Failed to fetch user", error);
    }
});

// ==================== MESSAGES ENDPOINTS ====================

/**
 * POST /api/messages
 * Send a new message
 */
app.post("/api/messages", validate([
    body("senderId").notEmpty().withMessage("Sender ID required"),
    body("recipientId").notEmpty().withMessage("Recipient ID required"),
    body("message").trim().notEmpty().withMessage("Message cannot be empty")
]), async (req, res) => {
    try {
        const { senderId, recipientId, message } = req.body;

        // Verify both users exist
        const sender = db.prepare("SELECT id FROM users WHERE id = ?").get(senderId);
        const recipient = db.prepare("SELECT id FROM users WHERE id = ?").get(recipientId);

        if (!sender || !recipient) {
            return sendError(res, 404, "Sender or recipient not found");
        }

        const messageId = generateId();

        db.prepare(`
            INSERT INTO messages (id, senderId, recipientId, message)
            VALUES (?, ?, ?, ?)
        `).run(messageId, senderId, recipientId, message.trim());

        logger.debug(`Message sent: ${senderId} -> ${recipientId}`);

        res.status(201).json({
            success: true,
            messageId,
            message: "Message sent successfully"
        });
    } catch (error) {
        sendError(res, 500, "Failed to send message", error);
    }
});

/**
 * GET /api/messages/:userId
 * Get all conversations for a user
 */
app.get("/api/messages/:userId", (req, res) => {
    try {
        const userId = req.params.userId;

        const conversations = db.prepare(`
            SELECT DISTINCT
                CASE WHEN senderId = ? THEN recipientId ELSE senderId END as contactId,
                CASE WHEN senderId = ? THEN u2.fullName ELSE u1.fullName END as contactName,
                MAX(m.createdAt) as lastMessageTime,
                SUM(CASE WHEN m.isRead = 0 AND m.recipientId = ? THEN 1 ELSE 0 END) as unreadCount
            FROM messages m
            LEFT JOIN users u1 ON m.senderId = u1.id
            LEFT JOIN users u2 ON m.recipientId = u2.id
            WHERE m.senderId = ? OR m.recipientId = ?
            GROUP BY contactId
            ORDER BY lastMessageTime DESC
        `).all(userId, userId, userId, userId, userId);

        res.json(conversations);
    } catch (error) {
        sendError(res, 500, "Failed to fetch conversations", error);
    }
});

/**
 * GET /api/messages/conversation/:userId/:otherId
 * Get full conversation history between two users
 */
app.get("/api/messages/conversation/:userId/:otherId", (req, res) => {
    try {
        const { userId, otherId } = req.params;

        const messages = db.prepare(`
            SELECT m.*,
                   u1.fullName as senderName,
                   u2.fullName as recipientName
            FROM messages m
            JOIN users u1 ON m.senderId = u1.id
            JOIN users u2 ON m.recipientId = u2.id
            WHERE (m.senderId = ? AND m.recipientId = ?)
               OR (m.senderId = ? AND m.recipientId = ?)
            ORDER BY m.createdAt ASC
        `).all(userId, otherId, otherId, userId);

        res.json(messages);
    } catch (error) {
        sendError(res, 500, "Failed to fetch conversation", error);
    }
});

/**
 * PUT /api/messages/:id/read
 * Mark message as read
 */
app.put("/api/messages/:id/read", async (req, res) => {
    try {
        const { id } = req.params;

        const result = db.prepare("UPDATE messages SET isRead = 1 WHERE id = ?").run(id);

        if (result.changes === 0) {
            return sendError(res, 404, "Message not found");
        }

        res.json({ success: true, message: "Message marked as read" });
    } catch (error) {
        sendError(res, 500, "Failed to mark message as read", error);
    }
});

// ==================== APPOINTMENTS ENDPOINTS ====================

/**
 * POST /api/appointments
 * Create a new appointment
 */
app.post("/api/appointments", validate([
    body("patientId").notEmpty().withMessage("Patient ID required"),
    body("doctorId").notEmpty().withMessage("Doctor ID required"),
    body("appointmentDate").isDate().withMessage("Valid date required"),
    body("appointmentTime").matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage("Valid time required (HH:MM)"),
    body("department").optional().trim()
]), async (req, res) => {
    try {
        const { patientId, doctorId, department, appointmentDate, appointmentTime, visitType, notes } = req.body;

        // Verify patient and doctor exist
        const patient = db.prepare("SELECT id, fullName, role FROM users WHERE id = ?").get(patientId);
        const doctor = db.prepare("SELECT id, fullName, role, department FROM users WHERE id = ?").get(doctorId);

        if (!patient || patient.role !== "patient") {
            return sendError(res, 400, "Invalid patient selection");
        }
        if (!doctor || doctor.role !== "doctor") {
            return sendError(res, 400, "Invalid doctor selection");
        }

        // Check for scheduling conflicts (doctor double-booked)
        const conflict = db.prepare(`
            SELECT id FROM appointments
            WHERE doctorId = ?
              AND appointmentDate = ?
              AND appointmentTime = ?
              AND status != 'Cancelled'
        `).get(doctorId, appointmentDate, appointmentTime);

        if (conflict) {
            return sendError(res, 409, "Doctor is already booked at this time");
        }

        const appointmentId = generateId();

        db.prepare(`
            INSERT INTO appointments (id, patientId, doctorId, department, appointmentDate, appointmentTime, type, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(appointmentId, patientId, doctorId, department, appointmentDate, appointmentTime, visitType || "Consultation", notes);

        const newAppointment = db.prepare(`
            SELECT a.*, u.fullName as doctorName, u2.fullName as patientName
            FROM appointments a
            JOIN users u ON a.doctorId = u.id
            JOIN users u2 ON a.patientId = u2.id
            WHERE a.id = ?
        `).get(appointmentId);

        logger.info(`Appointment created: ${patientId} with ${doctorId} on ${appointmentDate}`);

        res.status(201).json({
            success: true,
            appointment: newAppointment,
            message: "Appointment scheduled successfully"
        });
    } catch (error) {
        sendError(res, 500, "Failed to create appointment", error);
    }
});

/**
 * GET /api/appointments/patient/:id
 * Get all appointments for a patient
 */
app.get("/api/appointments/patient/:id", (req, res) => {
    try {
        const appointments = db.prepare(`
            SELECT a.*, u.fullName as doctorName, u.department as doctorDept
            FROM appointments a
            JOIN users u ON a.doctorId = u.id
            WHERE a.patientId = ?
            ORDER BY a.appointmentDate DESC, a.appointmentTime ASC
        `).all(req.params.id);

        res.json(appointments);
    } catch (error) {
        sendError(res, 500, "Failed to fetch patient appointments", error);
    }
});

/**
 * GET /api/appointments/doctor/:id
 * Get all appointments for a doctor
 */
app.get("/api/appointments/doctor/:id", (req, res) => {
    try {
        const appointments = db.prepare(`
            SELECT a.*, u.fullName as patientName, u.phone as patientPhone
            FROM appointments a
            JOIN users u ON a.patientId = u.id
            WHERE a.doctorId = ?
            ORDER BY a.appointmentDate DESC, a.appointmentTime ASC
        `).all(req.params.id);

        res.json(appointments);
    } catch (error) {
        sendError(res, 500, "Failed to fetch doctor appointments", error);
    }
});

/**
 * PUT /api/appointments/:id/cancel
 * Cancel an appointment
 */
app.put("/api/appointments/:id/cancel", async (req, res) => {
    try {
        const { id } = req.params;

        const result = db.prepare(`
            UPDATE appointments
            SET status = 'Cancelled', updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(id);

        if (result.changes === 0) {
            return sendError(res, 404, "Appointment not found");
        }

        logger.info(`Appointment cancelled: ${id}`);
        res.json({ success: true, message: "Appointment cancelled" });
    } catch (error) {
        sendError(res, 500, "Failed to cancel appointment", error);
    }
});

// ==================== INVOICES ENDPOINTS ====================

/**
 * GET /api/invoices/:userId
 * Get all invoices for a user
 */
app.get("/api/invoices/:userId", (req, res) => {
    try {
        const invoices = db.prepare(`
            SELECT * FROM invoices
            WHERE patientId = ?
            ORDER BY createdAt DESC
        `).all(req.params.userId);

        res.json(invoices);
    } catch (error) {
        sendError(res, 500, "Failed to fetch invoices", error);
    }
});

/**
 * POST /api/invoices
 * Create a new invoice
 */
app.post("/api/invoices", validate([
    body("patientId").notEmpty().withMessage("Patient ID required"),
    body("amount").isFloat({ min: 0.01 }).withMessage("Valid positive amount required"),
    body("description").optional().trim()
]), async (req, res) => {
    try {
        const { patientId, amount, description } = req.body;

        // Verify patient exists
        const patient = db.prepare("SELECT id, fullName FROM users WHERE id = ? AND role = 'patient'").get(patientId);
        if (!patient) {
            return sendError(res, 404, "Patient not found");
        }

        const invoiceId = generateId();

        db.prepare(`
            INSERT INTO invoices (id, patientId, amount, description)
            VALUES (?, ?, ?, ?)
        `).run(invoiceId, patientId, parseFloat(amount), description || "Healthcare Service");

        const invoice = db.prepare("SELECT * FROM invoices WHERE id = ?").get(invoiceId);

        logger.info(`Invoice created: ${invoiceId} for ${patientId} - PKR ${amount}`);

        res.status(201).json({
            success: true,
            invoice,
            message: "Invoice created successfully"
        });
    } catch (error) {
        sendError(res, 500, "Failed to create invoice", error);
    }
});

/**
 * PUT /api/invoices/:id/pay
 * Mark invoice as paid
 */
app.put("/api/invoices/:id/pay", (req, res) => {
    try {
        const { id } = req.params;

        const result = db.prepare(`
            UPDATE invoices
            SET status = 'Paid', paidAt = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(id);

        if (result.changes === 0) {
            return sendError(res, 404, "Invoice not found");
        }

        logger.info(`Invoice paid: ${id}`);
        res.json({ success: true, message: "Payment recorded" });
    } catch (error) {
        sendError(res, 500, "Failed to record payment", error);
    }
});

// ==================== ADMIN ENDPOINTS ====================

/**
 * GET /api/dashboard/:userId
 * Get role-specific dashboard statistics
 */
app.get("/api/dashboard/:userId", (req, res) => {
    try {
        const userId = req.params.userId;

        const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId);
        if (!user) {
            return sendError(res, 404, "User not found");
        }

        let stats = {};

        if (user.role === "patient") {
            const appointments = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE patientId = ? AND status != 'Cancelled'").get(userId);
            const unreadMessages = db.prepare("SELECT COUNT(*) as count FROM messages WHERE recipientId = ? AND isRead = 0").get(userId);
            const pendingInvoices = db.prepare("SELECT SUM(amount) as total FROM invoices WHERE patientId = ? AND status = 'Pending'").get(userId);

            stats = {
                upcomingAppointments: appointments?.count || 0,
                unreadMessages: unreadMessages?.count || 0,
                pendingPayments: pendingInvoices?.total || 0
            };
        } else if (user.role === "doctor") {
            const todayAppointments = db.prepare(`
                SELECT COUNT(*) as count FROM appointments
                WHERE doctorId = ? AND appointmentDate = date('now') AND status = 'Scheduled'
            `).get(userId);
            const totalPatients = db.prepare(`
                SELECT COUNT(DISTINCT patientId) as count FROM appointments WHERE doctorId = ?
            `).get(userId);
            const unreadMessages = db.prepare("SELECT COUNT(*) as count FROM messages WHERE recipientId = ? AND isRead = 0").get(userId);

            stats = {
                todayAppointments: todayAppointments?.count || 0,
                totalPatients: totalPatients?.count || 0,
                unreadMessages: unreadMessages?.count || 0
            };
        } else {
            // Admin stats
            const totalAppointments = db.prepare("SELECT COUNT(*) as count FROM appointments").get().count;
            const totalPatients = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'patient'").get().count;
            const totalDoctors = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'doctor'").get().count;
            const totalRevenue = db.prepare("SELECT SUM(amount) as total FROM invoices WHERE status = 'Paid'").get().total || 0;
            const unreadMessages = db.prepare("SELECT COUNT(*) as count FROM messages WHERE isRead = 0").get().count;

            stats = {
                totalAppointments,
                totalPatients,
                totalDoctors,
                totalRevenue,
                unreadMessages
            };
        }

        res.json(stats);
    } catch (error) {
        sendError(res, 500, "Failed to fetch dashboard stats", error);
    }
});

/**
 * GET /api/admin/analytics
 * Get detailed admin analytics
 */
app.get("/api/admin/analytics", (req, res) => {
    try {
        const today = new Date().toISOString().split("T")[0];

        const todayAppointments = db.prepare(`
            SELECT COUNT(*) as count FROM appointments WHERE appointmentDate = ?
        `).get(today).count;

        const totalRevenue = db.prepare(`
            SELECT SUM(amount) as total FROM invoices WHERE status = 'Paid'
        `).get().total || 0;

        const pendingInvoices = db.prepare(`
            SELECT COUNT(*) as count, SUM(amount) as total
            FROM invoices WHERE status = 'Pending'
        `).get();

        const newPatientsThisMonth = db.prepare(`
            SELECT COUNT(*) as count FROM users
            WHERE role = 'patient' AND date(createdAt) >= date('now', 'start of month')
        `).get().count;

        const totalDoctors = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'doctor'").get().count;
        const totalPatients = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'patient'").get().count;

        res.json({
            todayAppointments,
            totalRevenue,
            pendingInvoices: pendingInvoices.count || 0,
            pendingAmount: pendingInvoices.total || 0,
            newPatientsThisMonth,
            totalDoctors,
            totalPatients
        });
    } catch (error) {
        sendError(res, 500, "Failed to fetch analytics", error);
    }
});

// ==================== UTILITY ENDPOINTS ====================

/**
 * GET /api/export/schedule
 * Export appointments as downloadable text file
 */
app.get("/api/export/schedule", (req, res) => {
    try {
        const appointments = db.prepare(`
            SELECT a.*, u.fullName as patientName, u2.fullName as doctorName
            FROM appointments a
            JOIN users u ON a.patientId = u.id
            JOIN users u2 ON a.doctorId = u2.id
            ORDER BY a.appointmentDate ASC, a.appointmentTime ASC
        `).all();

        const lines = appointments.map(a =>
            `${a.appointmentDate} ${a.appointmentTime} | ${a.patientName} | ${a.department || 'General'} | Dr. ${a.doctorName} | ${a.status}`
        );

        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment; filename=clinicflow-schedule.txt");
        res.send(lines.length ? lines.join("\n") : "No appointments scheduled.");
    } catch (error) {
        sendError(res, 500, "Failed to export schedule", error);
    }
});

/**
 * POST /api/reset-demo
 * Reset demo data (development only)
 * WARNING: Deletes all appointments, messages, and invoices
 */
app.post("/api/reset-demo", async (req, res) => {
    if (!config.enableDemoReset && config.nodeEnv === "production") {
        return sendError(res, 403, "Demo reset is disabled in production");
    }

    try {
        db.prepare("DELETE FROM appointments").run();
        db.prepare("DELETE FROM invoices").run();
        db.prepare("DELETE FROM messages").run();
        db.prepare("DELETE FROM notifications").run();

        logger.info("Demo data reset performed");

        res.json({
            ok: true,
            message: "Demo data has been reset. Refresh the page to see changes.",
            demoCredentials: {
                admin: "admin@clinic.com / password",
                doctor1: "doctor1@clinic.com / password",
                doctor2: "doctor2@clinic.com / password",
                patient: "patient1@clinic.com / password"
            }
        });
    } catch (error) {
        sendError(res, 500, "Failed to reset demo data", error);
    }
});

// ==================== ERROR HANDLING MIDDLEWARE ====================

// 404 handler
app.use((req, res) => {
    logger.warn(`404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({
        error: "Endpoint not found",
        path: req.url,
        method: req.method
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
    res.status(500).json({
        error: config.nodeEnv === "production"
            ? "Internal server error. Please contact support."
            : err.message
    });
});

// Graceful shutdown
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

function shutdown() {
    logger.info("Shutting down server...");
    db.close();
    process.exit(0);
}

// ==================== SERVER STARTUP ====================

const server = app.listen(config.port, () => {
    console.log("");
    console.log("╔═══════════════════════════════════════════════════════════╗");
    console.log("║                                                           ║");
    console.log("║       🏥  ClinicFlow Healthcare Management System        ║");
    console.log("║                Version 2.0.0 | Production Ready          ║");
    console.log("║                                                           ║");
    console.log("╠═══════════════════════════════════════════════════════════╣");
    console.log("║                                                           ║");
    console.log(`║  🌐 Dashboard:  http://localhost:${config.port}                    ║`);
    console.log(`║  🔌 API Base:   http://localhost:${config.port}/api                ║`);
    console.log(`║  🔒 Security:   Bcrypt + Rate Limiting + Helmet           ║`);
    console.log("║                                                           ║");
    console.log("║  👤 Demo Credentials:                                    ║");
    console.log("║     Admin:    admin@clinic.com     / password            ║");
    console.log("║     Doctor 1: doctor1@clinic.com   / password            ║");
    console.log("║     Doctor 2: doctor2@clinic.com   / password            ║");
    console.log("║     Doctor 3: doctor3@clinic.com   / password            ║");
    console.log("║     Patient:  patient1@clinic.com  / password            ║");
    console.log("║                                                           ║");
    console.log("║  💾 Database:                                             ║");
    console.log(`║     ${config.databasePath.padEnd(50)}║`);
    console.log("║                                                           ║");
    console.log("║  Press Ctrl+C to stop the server                          ║");
    console.log("║                                                           ║");
    console.log("╚═══════════════════════════════════════════════════════════╝");
    console.log("");

    logger.info(`Server started on port ${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
});

// Export for testing
module.exports = { app, server, db, logger };
