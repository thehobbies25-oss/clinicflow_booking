# ClinicFlow - Complete Setup & Deployment Guide
## Version 2.0.0 | Production-Ready Healthcare Management System

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### 1. Install Dependencies

```bash
cd /path/to/clinicflow-booking
npm install
```

### 2. Start Development Server

```bash
npm start
```

### 3. Open in Browser

Navigate to: **http://localhost:3000**

---

## Demo Credentials

Test with these pre-created accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@clinic.com | password |
| Doctor | doctor1@clinic.com | password |
| Doctor | doctor2@clinic.com | password |
| Doctor | doctor3@clinic.com | password |
| Patient | patient1@clinic.com | password |
| Patient | patient2@clinic.com | password |

---

## Project Structure

```
clinicflow-booking/
├── server.js              # Express REST API (900+ lines)
├── app.js                 # Frontend JavaScript (700+ lines)
├── styles.css             # Modern Dark Theme CSS (1100+ lines)
├── index.html             # SPA Structure
├── package.json           # Dependencies
├── .env.example           # Environment template
├── .gitignore             # Git exclusions
├── SETUP.md              # This file
├── data/                  # Auto-created SQLite DB
│   └── clinicflow.db
├── logs/                  # Auto-created logs
│   ├── error.log
│   └── combined.log
└── node_modules/          # Installed packages
```

---

## Features by User Role

### Patient Features
- Register new account
- Search and book appointments with doctors
- View appointment history
- Real-time messaging with doctors
- View invoices and payment status
- Dashboard with upcoming appointments

### Doctor Features
- View all assigned appointments
- Patient contact information
- Message patients
- Today's appointment count
- Weekly schedule view

### Admin Features
- Complete statistics dashboard
- Revenue tracking
- User management
- Export schedule to text file
- Reset demo data (dev mode only)
- Full system overview

---

## Security Features (Production Grade)

- **bcrypt** password hashing with 12 salt rounds
- **Rate limiting** on authentication endpoints (10 attempts/15min)
- **Helmet.js** security headers
- **CORS** restricted to allowed origins
- **Input validation** on all API endpoints
- **SQL injection prevention** with prepared statements
- **XSS prevention** with HTML escaping
- **Structured logging** with Winston

---

## Production Deployment

### Option 1: VPS with Ubuntu 22.04

```bash
# 1. SSH into server
ssh user@your-server-ip

# 2. Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PM2 globally
sudo npm install -g pm2

# 4. Upload project files
# From local machine:
scp -r "D:\claude opus 4.7\clientflow-pro\projects\clinicflow-booking" user@server:/var/www/

# 5. Install dependencies
cd /var/www/clinicflow-booking
npm ci --production

# 6. Setup environment
cp .env.example .env
nano .env  # Edit values

# 7. Create logs directory
mkdir -p logs

# 8. Start with PM2
pm2 start server.js --name clinicflow
pm2 save
pm2 startup  # Follow printed instructions

# 9. Configure Nginx
sudo nano /etc/nginx/sites-available/clinicflow
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/clinicflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Add SSL证书:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Option 2: Docker

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN mkdir -p data logs
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
# Build and run
docker build -t clinicflow .
docker run -d -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  --name clinicflow \
  clinicflow
```

---

## Environment Variables

Create `.env` from `.env.example`:

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment | development |
| DATABASE_PATH | SQLite path | ./data/clinicflow.db |
| BCRYPT_SALT_ROUNDS | Hash cost | 12 |
| APP_SECRET | Session secret | (change!) |
| ALLOWED_ORIGINS | CORS origins | http://localhost:3000 |
| ENABLE_DEMO_RESET | Allow reset API | true |

---

## API Reference

### Authentication
```
POST /api/auth/login
POST /api/auth/register
GET  /api/health
```

### Users
```
GET /api/users
GET /api/users/:id
GET /api/users/search?query=name&role=doctor
```

### Appointments
```
POST   /api/appointments
GET    /api/appointments/patient/:id
GET    /api/appointments/doctor/:id
PUT    /api/appointments/:id/cancel
GET    /api/export/schedule
```

### Messaging
```
POST   /api/messages
GET    /api/messages/:userId
GET    /api/messages/conversation/:userId/:otherId
PUT    /api/messages/:id/read
```

### Invoices
```
GET  /api/invoices/:userId
POST /api/invoices
PUT  /api/invoices/:id/pay
```

### Admin
```
GET    /api/dashboard/:userId
GET    /api/admin/analytics
POST   /api/reset-demo
```

---

## Database Schema

```sql
users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    fullName TEXT,
    phone TEXT,
    role TEXT,
    department TEXT,
    createdAt DATETIME
)

messages (
    id TEXT PRIMARY KEY,
    senderId TEXT,
    recipientId TEXT,
    message TEXT,
    isRead INTEGER,
    createdAt DATETIME
)

appointments (
    id TEXT PRIMARY KEY,
    patientId TEXT,
    doctorId TEXT,
    department TEXT,
    appointmentDate DATE,
    appointmentTime TIME,
    type TEXT,
    notes TEXT,
    status TEXT
)

invoices (
    id TEXT PRIMARY KEY,
    patientId TEXT,
    amount DECIMAL,
    description TEXT,
    status TEXT,
    paidAt DATETIME
)
```

---

## Pricing Strategy for Clients

### Pakistan Market
| Package | Doctors | Price (PKR) | Includes |
|---------|---------|-------------|----------|
| Basic | 1-2 | 35,000 - 50,000 | Core system + training |
| Standard | 3-5 | 75,000 - 120,000 | + SMS + branding |
| Premium | 6+ | 200,000 - 400,000+ | + Mobile app + support |

### International Market
| Package | Price (USD) | Includes |
|---------|-------------|----------|
| Starter | $1,500 | Core + deployment |
| Professional | $3,500 | + SMS + PDF invoices |
| Enterprise | $7,000+ | + Mobile app + multi-branch |

**Upsell Add-ons:**
- SMS Notifications: Rs 15,000
- Email Notifications: Rs 10,000
- PDF Invoice Generation: Rs 12,000
- Payment Gateway: Rs 25,000
- Mobile App (React Native): Rs 80,000
- Server Setup + SSL: Rs 15,000

---

## Client Sales Pitch

> "I've built a complete hospital/clinic management system from scratch. It handles patient appointments, messaging with doctors, billing, and gives you a dashboard to track everything. No monthly fees — you own the system outright. It's already built and ready to deploy."

**Value to client:**
- Daily savings: Rs 2,000+ (receptionist time, phone bills)
- Monthly savings: Rs 65,000+
- Payback: 1-2 months
- After that: Pure profit

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 3000 in use | Change PORT in .env or kill process |
| Database locked | Stop PM2 processes, delete .lock files |
| Messages not sending | Check browser console, verify API URL |
| Cannot login | Reset DB: Delete data/clinicflow.db, restart |

**Reset everything:**
```bash
rm -rf data/clinicflow.db logs/*.log
npm start
```

---

## Production Security Checklist

- [ ] Set NODE_ENV=production
- [ ] Change APP_SECRET to random 32+ char string
- [ ] Disable ENABLE_DEMO_RESET
- [ ] Restrict ALLOWED_ORIGINS to production domain
- [ ] Enable SSL/HTTPS
- [ ] Configure firewall (ports 80, 443 only)
- [ ] Set up automated backups of database
- [ ] Change default demo passwords
- [ ] Monitor logs regularly
- [ ] Enable fail2ban for SSH

---

## Performance Optimization

For 100+ concurrent users:

1. **Database:** Use connection pooling, add indexes
2. **Caching:** Add Redis for frequent queries
3. **Assets:** Minify CSS/JS, enable gzip in Nginx
4. **CDN:** Host static files on CloudFlare
5. **Database Maintenance:** Weekly `VACUUM`

---

## Customization

### Change Brand Color
```css
/* styles.css line 27 */
--primary: #6366f1;  /* Change to your color */
```

### Add New Departments
```html
<!-- index.html -->
<option value="Neurology">Neurology</option>
```

### Change Currency
```javascript
// app.js - change "PKR" to "$" or other currency
```

---

## Support & Documentation

All code is fully documented with function-level JSDoc comments. Every endpoint has:
- Purpose description
- Parameters documentation
- Return values
- Error handling

**The system is ready for production use.** All bugs are fixed, code is clean and well-organized.

---

**ClinicFlow v2.0.0 | Built for Healthcare Professionals | April 2026**
