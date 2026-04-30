# 🏥 ClinicFlow - COMPLETE RUN GUIDE
## Step-by-Step Instructions to Run This Software

---

## 📋 SYSTEM REQUIREMENTS

### Minimum Requirements:
- **OS**: Windows 10/11, macOS, or Linux
- **Node.js**: Version 18+ ([Download here](https://nodejs.org/))
- **RAM**: 2 GB minimum
- **Disk Space**: 500 MB
- **Internet**: Required only for npm install (first time)

### Check if Node.js is Installed:
Open Command Prompt / Terminal and run:
```bash
node --version
npm --version
```
**Expected output**: `v18.x.x` or higher, `9.x.x` or higher

If not installed → Download from nodejs.org (LTS version)

---

## 🚀 QUICK START (3 Minutes)

### Step 1: Open Folder
Navigate to the project folder:
```bash
cd /path/to/clinicflow-booking
```

### Step 2: Install Dependencies
```bash
npm install
```
**What this does**: Downloads and installs all required packages (Express, SQLite, etc.)
**Time**: 30 seconds - 2 minutes (depends on internet)

**Output should show**:
```
added 50+ packages in Xs
```

### Step 3: Start the Server
```bash
npm start
```
**What this does**:
- Starts the Express server on port 3000
- Creates the SQLite database automatically
- Seeds demo user accounts

**Expected Output**:
```
╔═══════════════════════════════════════════════════════════╗
║       🏥  ClinicFlow Healthcare Management System        ║
║                Version 2.0.0 | Production Ready          ║
╠═══════════════════════════════════════════════════════════╣
║  🌐 Dashboard:  http://localhost:3000                    ║
║  🔌 API Base:   http://localhost:3000/api                ║
╚═══════════════════════════════════════════════════════════╝
```

**Server is now RUNNING** ← Keep this terminal open!

---

## 🌐 OPEN IN BROWSER

### Open Your Web Browser (Chrome, Firefox, Edge)
Type in address bar:
```
http://localhost:3000
```

**You will see**: ClinicFlow Login Screen (Dark Theme UI)

---

## 🔐 LOGIN WITH DEMO ACCOUNTS

### Admin Account (Full Access)
```
Email:    admin@clinic.com
Password: password
```

### Doctor Account
```
Email:    doctor1@clinic.com
Password: password
```

### Patient Account
```
Email:    patient1@clinic.com
Password: password
```

---

## 📱 WHAT TO TEST (Demo Checklist)

### 1. Login as Admin
- Login with `admin@clinic.com / password`
- See dashboard stats (0 appointments, 0 revenue initially)
- Click "Admin" tab (bottom-left)
- See total counts

### 2. Create Patient Account
- Click "Sign Up" tab
- Fill form (use any name, email, phone)
- Select "Patient" role
- Click "Sign Up"
- Login with new account

### 3. Book Appointment (as Patient)
- Click "Messages" → Search for "Doctor"
- Select Dr. Sana Qureshi
- Click "Message" button
- (Note: Message someone first to create conversation)

### 4. Send Message
- In Messages tab, select conversation
- Type message: "Hello, I need an appointment"
- Click Send
- Message appears instantly

### 5. Switch to Doctor View
- Logout (bottom-left)
- Login as `doctor1@clinic.com / password`
- See appointments (if any created)
- Check messages from patient

---

## 🎯 COMPLETE FEATURE WALKTHROUGH

### Dashboard Tab
- **Upcoming**: Count of scheduled appointments
- **Messages**: Unread message count
- **Pending Payment**: Total unpaid invoices (PKR)

### Appointments Tab
- **+ New Appointment** button → Opens form
- **Doctor Search** → Type "doctor" to see list
- **Select Doctor** → Click on doctor's name
- **Fill Details** → Date, time, department, notes
- **Schedule** → Creates appointment

### Messages Tab
- **Left Panel**: List of conversations (click to open)
- **Right Panel**: Chat thread with selected person
- **Send Message**: Type and press Send button
- **Unread Badge**: Red badge shows unread count

### Invoices Tab
- **All/Pending/Paid** filters (top buttons)
- **Invoice List**: Shows ID, date, amount, status
- **Amount**: Displayed in PKR (Pakistani Rupees)

### Admin Tab (Admin only)
- **Today's Appointments**: Count
- **Total Patients**: Count
- **Total Doctors**: Count
- **Revenue**: Total collected (PKR)

---

## 🛑 STOPPING THE SERVER

### Graceful Shutdown
In the terminal where server is running:
```
Press CTRL + C
```

You'll see:
```
Shutting down server...
```

Server stopped. Database saved safely.

---

## 🔄 RESTARTING

```bash
# Navigate to folder
cd "D:\claude opus 4.7\clientflow-pro\projects\clinicflow-booking"

# Start server
npm start
```

---

## 📊 DATABASE LOCATION

The database file is automatically created:
```
D:\claude opus 4.7\clientflow-pro\projects\clinicflow-booking\data\clinicflow.db
```

**This file contains**:
- All user accounts
- All messages
- All appointments
- All invoices

**To reset everything**:
```bash
# Stop server (CTRL+C)
# Delete database
del data\clinicflow.db
# Restart
npm start
```

---

## 📁 FOLDER STRUCTURE (What Each File Does)

```
clinicflow-booking/
├── server.js          ← MAIN BACKEND (run this!)
│   └── Handles all API requests, database operations
├── app.js             ← Frontend JavaScript (browser code)
│   └── UI logic, form handling, API calls
├── index.html         ← Main page (what you see in browser)
├── styles.css         ← All styling (dark theme)
├── package.json       ← List of dependencies
├── pm2.config.json    ← Production process manager config
├── .env.example       ← Settings template (copy to .env)
├── data/
│   └── clinicflow.db  ← SQLite database (auto-created)
├── logs/
│   ├── error.log      ← Error logs
│   └── combined.log   ← All logs
└── node_modules/      ← Installed libraries (don't touch)
```

---

## 🐛 TROUBLESHOOTING

### Error: "Port 3000 is already in use"
**Cause**: Another app using port 3000
**Fix**:
```bash
# Find what's using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or change port in package.json → "start": "PORT=3001 node server.js"
```

### Error: "Cannot find module 'express'"
**Cause**: Dependencies not installed
**Fix**:
```bash
npm install
```

### Error: "Database is locked"
**Cause**: Server crashed without closing DB
**Fix**:
```bash
# Stop all node processes
taskkill /F /IM node.exe
# Delete lock file (if exists)
del data\clinicflow.db-shm
del data\clinicflow.db-wal
# Restart
npm start
```

### Page loads but blank/white
**Cause**: JavaScript error
**Fix**:
1. Press F12 in browser
2. Click "Console" tab
3. See error message
4. Usually fixed by restarting server

### Messages not sending
**Check**:
1. Both users registered (check users API)
2. Server running (see terminal output)
3. Browser console open (F12 → Console)

---

## 🔒 SECURITY NOTES

### For Development (Current State):
- Demo passwords: `password` (easy to remember)
- No SSL/HTTPS (HTTP only)
- Demo reset enabled: `POST /api/reset-demo`

### For Production (Before Client Delivery):
1. Change all demo passwords in `server.js` (line 410-460)
2. Set `ENABLE_DEMO_RESET=false` in `.env`
3. Add SSL certificate (Let's Encrypt)
4. Use strong `APP_SECRET` in `.env`
5. Change `BCRYPT_SALT_ROUNDS=12` (already set)
6. Deploy behind Nginx reverse proxy
7. Enable firewall (ports 80, 443 only)

---

## 🎬 VIDEO DEMO SCRIPT

### 2-Minute Client Presentation:

**0:00 - 0:15** (Intro)
```
"Main aapko ek complete hospital management system dikha raha hoon.
Yeh software khud banaya hai - Node.js, JavaScript, SQLite database.
Koi monthly fee nahi, ek bar purchase kar ke apnay server pe chala sakte hain."
```

**0:15 - 0:45** (Login & Dashboard)
```
" Dekhiye - admin login kar raha hoon.
Dashboard pe dekho - aaj ke appointments, pending bills, unread messages.
Admin panel mein total patients, doctors, revenue."
```

**0:45 - 1:15** (Appointment Booking)
```
"Ab patient ki taraf se dekhte hain.
New appointment button daba ke doctor search karte hain.
Doctor select karte hain, date time choose karte hain.
Bilkul ek click mein appointment fixed."
```

**1:15 - 1:45** (Messaging)
```
"Yeh raha messaging system.
Patient doctor se direct baat karta hai.
No phone calls, no receptionist needed.
Message saved hai database mein permanently."
```

**1:45 - 2:00** (Close)
```
"Yeh system aapke liye monthly Rs 65,000+ save karega.
One-time investment sirf Rs 50,000-150,000.
1-2 mahine mein investment waapis, baad mein pure profit.
Koi question?"
```

---

## 💰 CLIENT PRICING (What to Charge)

### Pakistan Market:
| Package | Price (PKR) | For Whom |
|---------|-------------|----------|
| Basic | 35,000 - 50,000 | 1-2 doctors clinic |
| Standard | 75,000 - 120,000 | 3-5 doctors hospital |
| Premium | 200,000 - 400,000 | Multi-branch chain |

### International Market:
| Package | Price (USD) | Features |
|---------|-------------|----------|
| Starter | $1,500 | Core + deployment |
| Professional | $3,500 | + SMS + PDF invoices |
| Enterprise | $7,000+ | + Mobile app + support |

**Upsell (Extra Charge)**:
- SMS Notifications: +Rs 15,000
- Email Notifications: +Rs 10,000
- PDF Invoices: +Rs 12,000
- Payment Gateway (Stripe/JazzCash): +Rs 25,000
- Mobile App (React Native): +Rs 80,000
- Server Setup + SSL: +Rs 15,000
- Annual Support: Rs 5,000/month

---

## ✅ VERIFICATION CHECKLIST

Run these commands to verify everything works:

```bash
# 1. Health check
curl http://localhost:3000/api/health
# Should return: {"ok":true,"status":"healthy",...}

# 2. Get all users
curl http://localhost:3000/api/users
# Should return: [{"id":"...","email":"admin@clinic.com",...},...]

# 3. Search doctors
curl "http://localhost:3000/api/users/search?query=doctor&role=doctor"
# Should return: 3 doctors

# 4. Login test
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@clinic.com","password":"password"}'
# Should return: {"success":true,"user":{...}}
```

---

## 🎯 CLIENT SELLING POINTS

When showing to client, emphasize:

1. **"Yeh already banaya hua software hai"**
   - Development time = 0
   - Ready to deploy today
   - Demos ready now

2. **"Aapko source code milega"**
   - Full ownership
   - Modify karein apni marzi se
   - Koi monthly subscription nahi

3. **"Monthly Rs 65,000+ save karega"**
   - Receptionist salary bach gaya
   - Phone bills kam
   - Paper cost zero
   - Lost appointments nahi

4. **"1-2 mahine mein investment waapis"**
   - Payback period very short
   - Baad mein pure profit

5. **"Support included hai"**
   - 30 days free bug fixes
   - Training session included
   - Customization possible

---

## 📞 SUPPORT

All code is fully commented. Every function has:
- Purpose description
- Parameter documentation
- Usage examples

Questions? Check inline comments in:
- `server.js` (lines 1-1200)
- `app.js` (lines 1-700)
- `styles.css` (lines 1-1100)

---

**🎉 READY TO RUN!** Ab server start karein aur client ko dikhao!

```bash
cd "D:\claude opus 4.7\clientflow-pro\projects\clinicflow-booking"
npm start
# Open browser: http://localhost:3000
```
