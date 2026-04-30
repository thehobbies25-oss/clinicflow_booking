/**
 * ClinicFlow - Frontend Application
 * ================================
 * Client-side JavaScript for the ClinicFlow booking and messaging system.
 * Handles authentication, appointments, messaging, and invoices in the browser.
 *
 * Features:
 * - User authentication (login/register with session persistence)
 * - Dashboard statistics display (role-specific)
 * - Appointment scheduling and management
 * - Real-time messaging between users
 * - Invoice viewing and filtering
 * - Responsive UI with mobile support
 * - Toast notifications for feedback
 *
 * @version 2.0.0
 * @author ClinicFlow Development Team
 */

// ==================== CONFIGURATION ====================

const API_URL = "http://localhost:3000/api";

/**
 * Application State
 * Persisted in localStorage for session restoration
 */
let currentUser = null;
let selectedConversation = null;
let appointments = [];
let invoices = [];
let messages = [];

// ==================== INITIALIZATION ====================

document.addEventListener("DOMContentLoaded", () => {
    loadSession();
    setupEventListeners();
});

/**
 * Load saved user session from localStorage
 */
function loadSession() {
    const savedUser = localStorage.getItem("clinicflow_user");

    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showMainApp();
            loadDashboardData();
        } catch (error) {
            console.error("Failed to parse saved session:", error);
            localStorage.removeItem("clinicflow_user");
            showAuthModal();
        }
    } else {
        showAuthModal();
    }
}

/**
 * Setup all event listeners after DOM is ready
 */
function setupEventListeners() {
    setupAuthListeners();
    setupNavigation();
    setupAppointments();
    setupMessages();
    setupInvoices();
    setupLogout();
    setupAdminStats();
}

// ==================== AUTHENTICATION ====================

function setupAuthListeners() {
    // Tab switching between login and register
    document.querySelectorAll(".auth-tab").forEach(tab => {
        tab.addEventListener("click", (e) => {
            document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));

            e.target.classList.add("active");
            const tabName = e.target.dataset.tab;
            document.getElementById(tabName + "Form").classList.add("active");
        });
    });

    // Login form submission
    document.getElementById("loginForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = e.target.querySelector("input[type='email']").value;
        const password = e.target.querySelector("input[type='password']").value;

        if (!email || !password) {
            showToast("Please enter email and password");
            return;
        }

        const btn = e.target.querySelector("button[type='submit']");
        const originalText = btn.textContent;
        btn.textContent = "Logging in...";
        btn.disabled = true;

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                currentUser = data.user;
                localStorage.setItem("clinicflow_user", JSON.stringify(currentUser));

                showToast("Login successful! Welcome back.");
                setTimeout(() => {
                    showMainApp();
                    loadDashboardData();
                }, 300);
            } else {
                showToast(data.error || "Login failed. Please check your credentials.");
            }
        } catch (error) {
            console.error("Login error:", error);
            showToast("Connection error. Please check if server is running.");
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });

    // Registration form submission
    document.getElementById("registerForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;

        const fullName = form.querySelector("input[type='text']").value;
        const email = form.querySelector("input[type='email']").value;
        const phone = form.querySelector("input[type='tel']").value;
        const password = form.querySelector("input[type='password']").value;
        const role = form.querySelector("select").value;

        if (!fullName || !email || !phone || !password || !role) {
            showToast("Please fill in all required fields");
            return;
        }

        if (password.length < 6) {
            showToast("Password must be at least 6 characters");
            return;
        }

        const btn = form.querySelector("button[type='submit']");
        const originalText = btn.textContent;
        btn.textContent = "Creating Account...";
        btn.disabled = true;

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, fullName, phone, role })
            });

            const data = await response.json();

            if (response.ok) {
                showToast(data.message || "Account created! Please login.");
                document.querySelectorAll(".auth-tab")[0].click();
                form.reset();
            } else {
                showToast(data.error || "Registration failed");
            }
        } catch (error) {
            console.error("Register error:", error);
            showToast("Connection error. Please check if server is running.");
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });
}

/**
 * Show the authentication modal
 */
function showAuthModal() {
    document.getElementById("authModal").classList.add("active");
    document.getElementById("mainApp").style.display = "none";
}

/**
 * Show the main application interface
 */
function showMainApp() {
    document.getElementById("authModal").classList.remove("active");
    document.getElementById("mainApp").style.display = "flex";

    // Update user info in header
    document.getElementById("userNameDisplay").textContent = currentUser.fullName;
    document.getElementById("userRoleDisplay").textContent = currentUser.role.toUpperCase();

    // Show admin panel if user is admin
    if (currentUser.role === "admin") {
        loadAdminStats();
    }
}

// ==================== NAVIGATION ====================

function setupNavigation() {
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const panelName = e.currentTarget.dataset.panel;

            // Update active states
            document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
            document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));

            e.currentTarget.classList.add("active");
            document.getElementById(panelName + "Panel").classList.add("active");

            // Load data for specific panels
            if (panelName === "messages") {
                loadConversations();
            } else if (panelName === "admin") {
                loadAdminStats();
            }
        });
    });
}

// ==================== DASHBOARD ====================

async function loadDashboardData() {
    try {
        // Load appointments based on user role
        if (currentUser.role === "patient") {
            const response = await fetch(`${API_URL}/appointments/patient/${currentUser.id}`);
            appointments = await response.json();
        } else if (currentUser.role === "doctor") {
            // DOCTOR: Show THEIR appointments only
            const response = await fetch(`${API_URL}/appointments/doctor/${currentUser.id}`);
            appointments = await response.json();
        } else if (currentUser.role === "admin") {
            // ADMIN: Show recent activity - fetch all appointments limited
            const response = await fetch(`${API_URL}/appointments/recent?limit=10`);
            if (response.ok) {
                appointments = await response.json();
            } else {
                appointments = [];
            }
        }

        // Load invoices
        const invResponse = await fetch(`${API_URL}/invoices/${currentUser.id}`);
        invoices = await invResponse.json();

        // Load all messages (for notification badge)
        const msgResponse = await fetch(`${API_URL}/messages/${currentUser.id}`);
        messages = await msgResponse.json();

        updateDashboardStats();
    } catch (error) {
        console.error("Dashboard load error:", error);
        showToast("Error loading dashboard data");
    }
}

function updateDashboardStats() {
    // Upcoming appointments count
    const upcoming = appointments.filter(a => a.status === "Scheduled").length;
    document.getElementById("upcomingCount").textContent = upcoming;

    // Unread messages count
    const unread = messages.filter(m => !m.isRead && m.recipientId === currentUser.id).length;
    document.getElementById("unreadMessages").textContent = unread;

    // Notification badge
    const badge = document.getElementById("msgBadge");
    if (unread > 0) {
        badge.style.display = "inline";
        badge.textContent = unread > 99 ? "99+" : unread;
    } else {
        badge.style.display = "none";
    }

    // Pending payments total
    const pending = invoices
        .filter(i => i.status === "Pending")
        .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
    document.getElementById("pendingPayment").textContent = "PKR " + Math.round(pending).toLocaleString();

    // Recent appointments on dashboard
    const dashboardAppts = appointments.slice(0, 3);
    const elem = document.getElementById("dashboardAppointments");

    if (dashboardAppts.length > 0) {
        elem.innerHTML = dashboardAppts.map(appt => `
            <div class="appointment-item">
                <div class="appt-info">
                    <p class="appt-time">${formatTime(appt.appointmentTime)}</p>
                    <p class="appt-date">${formatDate(appt.appointmentDate)}</p>
                    <p class="appt-doctor">${appt.doctorName || appt.patientName}</p>
                </div>
                <span class="status-badge ${appt.status.toLowerCase()}">${appt.status}</span>
            </div>
        `).join("");
    } else {
        elem.innerHTML = "<p class='empty-state'>No appointments scheduled</p>";
    }
}

// ==================== APPOINTMENTS ====================

function setupAppointments() {
    const newApptBtn = document.querySelector(".new-appt-btn");
    if (newApptBtn) {
        newApptBtn.addEventListener("click", () => {
            document.getElementById("appointmentForm").style.display = "block";
            setDefaultDates();
        });
    }

    const cancelBtn = document.querySelector(".cancel-appt");
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            document.getElementById("appointmentForm").style.display = "none";
            document.getElementById("appointmentForm").reset();
        });
    }

    const doctorSearch = document.getElementById("doctorSearch");
    if (doctorSearch) {
        doctorSearch.addEventListener("input", debounce(searchDoctors, 300));
    }

    const appointmentForm = document.getElementById("appointmentForm");
    if (appointmentForm) {
        appointmentForm.addEventListener("submit", handleAppointmentSubmit);
    }
}

async function handleAppointmentSubmit(e) {
    e.preventDefault();

    const selectedDoctor = document.querySelector(".doctor-item.selected");
    if (!selectedDoctor) {
        showToast("Please select a doctor from the search results");
        return;
    }

    const appointmentData = {
        patientId: currentUser.id,
        doctorId: selectedDoctor.dataset.doctorId,
        department: document.getElementById("department").value,
        appointmentDate: document.getElementById("visitDate").value,
        appointmentTime: document.getElementById("visitTime").value,
        visitType: document.getElementById("visitType").value,
        notes: document.getElementById("appointmentNotes").value
    };

    const btn = e.target.querySelector("button[type='submit']");
    btn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/appointments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(appointmentData)
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message || "Appointment scheduled successfully!");
            document.getElementById("appointmentForm").style.display = "none";
            document.getElementById("appointmentForm").reset();
            loadDashboardData();
            renderAppointmentsList();
        } else {
            showToast(data.error || "Failed to schedule appointment");
        }
    } catch (error) {
        console.error("Appointment error:", error);
        showToast("Error scheduling appointment. Please try again.");
    } finally {
        btn.disabled = false;
    }
}

async function searchDoctors(e) {
    const query = e.target.value;

    if (query.length < 2) {
        document.getElementById("doctorList").innerHTML = "";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/users/search?query=${encodeURIComponent(query)}&role=doctor`);
        const doctors = await response.json();

        if (doctors.length === 0) {
            document.getElementById("doctorList").innerHTML = "<p class='no-results'>No doctors found</p>";
            return;
        }

        document.getElementById("doctorList").innerHTML = doctors.map(doctor => `
            <div class="doctor-item" data-doctor-id="${doctor.id}">
                <p class="doctor-name">${escapeHtml(doctor.fullName)}</p>
                <p class="doctor-dept">${escapeHtml(doctor.department || "General Practice")}</p>
            </div>
        `).join("");

        attachDoctorClickHandlers();
    } catch (error) {
        console.error("Search error:", error);
    }
}

function attachDoctorClickHandlers() {
    document.querySelectorAll(".doctor-item").forEach(item => {
        item.addEventListener("click", () => {
            document.querySelectorAll(".doctor-item").forEach(i => i.classList.remove("selected"));
            item.classList.add("selected");
            document.getElementById("doctorSearch").value = item.querySelector(".doctor-name").textContent;
            document.getElementById("doctorList").innerHTML = "";
        });
    });
}

function renderAppointmentsList() {
    const elem = document.getElementById("appointmentsList");

    if (appointments.length === 0) {
        elem.innerHTML = "<p class='empty-state'>No appointments</p>";
        return;
    }

    elem.innerHTML = appointments.map(appt => `
        <div class="appointment-card">
            <div class="card-header">
                <h4>${escapeHtml(appt.doctorName || appt.patientName)}</h4>
                <span class="status-badge ${appt.status.toLowerCase()}">${appt.status}</span>
            </div>
            <div class="card-body">
                <p><strong>Date:</strong> ${formatDate(appt.appointmentDate)}</p>
                <p><strong>Time:</strong> ${formatTime(appt.appointmentTime)}</p>
                <p><strong>Department:</strong> ${escapeHtml(appt.department || "General")}</p>
                <p><strong>Type:</strong> ${escapeHtml(appt.type || "Consultation")}</p>
                ${appt.notes ? `<p><strong>Notes:</strong> ${escapeHtml(appt.notes)}</p>` : ""}
            </div>
            <div class="card-actions">
                <button class="btn-small" onclick="startMessage('${appt.doctorId || appt.patientId}', '${appt.id}')">
                    Message
                </button>
                ${currentUser.role === "admin" || currentUser.role === "doctor" ? `
                    <button class="btn-small btn-danger" onclick="cancelAppointment('${appt.id}')">
                        Cancel
                    </button>
                ` : ""}
            </div>
        </div>
    `).join("");
}

// Navigate to appointments panel and refresh list
document.addEventListener("click", (e) => {
    if (e.target.closest(".nav-link[data-panel='appointments']")) {
        renderAppointmentsList();
    }
});

async function cancelAppointment(appointmentId) {
    if (!confirm("Are you sure you want to cancel this appointment?")) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/appointments/${appointmentId}/cancel`, {
            method: "PUT"
        });

        if (response.ok) {
            showToast("Appointment cancelled");
            loadDashboardData();
            renderAppointmentsList();
        } else {
            const data = await response.json();
            showToast(data.error || "Failed to cancel appointment");
        }
    } catch (error) {
        showToast("Error cancelling appointment");
    }
}

// ==================== MESSAGES ====================

function setupMessages() {
    const messageForm = document.getElementById("messageForm");
    if (messageForm) {
        messageForm.addEventListener("submit", sendMessage);
    }
}

async function loadConversations() {
    try {
        const response = await fetch(`${API_URL}/messages/${currentUser.id}`);
        const allMessages = await response.json();

        const conversationMap = {};
        allMessages.forEach(msg => {
            const otherId = msg.senderId === currentUser.id ? msg.recipientId : msg.senderId;
            const otherName = msg.senderId === currentUser.id ? msg.recipientName : msg.senderName;

            if (!conversationMap[otherId]) {
                conversationMap[otherId] = {
                    userId: otherId,
                    userName: otherName,
                    lastMessage: msg.message,
                    unread: allMessages.filter(m =>
                        m.recipientId === currentUser.id &&
                        m.senderId === otherId &&
                        !m.isRead
                    ).length
                };
            }
        });

        const conversations = Object.values(conversationMap);
        const elem = document.getElementById("conversationsList");

        if (conversations.length > 0) {
            elem.innerHTML = conversations.map(conv => `
                <div class="conversation-item" onclick="selectConversation('${conv.userId}', '${escapeHtml(conv.userName)}')">
                    <div class="conv-info">
                        <p class="conv-name">${escapeHtml(conv.userName)}</p>
                        <p class="conv-preview">${escapeHtml(conv.lastMessage.substring(0, 40))}...</p>
                    </div>
                    ${conv.unread > 0 ? `<span class="conv-badge">${conv.unread}</span>` : ""}
                </div>
            `).join("");
        } else {
            elem.innerHTML = "<p class='empty-state'>No conversations yet</p>";
        }
    } catch (error) {
        console.error("Load conversations error:", error);
    }
}

async function selectConversation(userId, userName) {
    selectedConversation = { userId, userName };

    try {
        const response = await fetch(`${API_URL}/messages/conversation/${currentUser.id}/${userId}`);
        const msgs = await response.json();

        // Fixed: Use correct header ID (messageThreadHeader matches index.html)
        const headerElem = document.getElementById("messageThreadHeader");
        if (headerElem) headerElem.innerHTML = `<h3>${escapeHtml(userName)}</h3>`;

        const listElem = document.getElementById("messagesList");
        listElem.innerHTML = msgs.map(msg => `
            <div class="message ${msg.senderId === currentUser.id ? "sent" : "received"}">
                <p class="message-text">${escapeHtml(msg.message)}</p>
                <p class="message-time">${formatMessageTime(msg.createdAt)}</p>
            </div>
        `).join("");

        listElem.scrollTop = listElem.scrollHeight;

        // Show message input
        const formElem = document.getElementById("messageForm");
        if (formElem) formElem.style.display = "flex";

        // Mark received messages as read
        const unreadMsgs = msgs.filter(m => m.recipientId === currentUser.id && !m.isRead);
        for (const msg of unreadMsgs) {
            await fetch(`${API_URL}/messages/${msg.id}/read`, { method: "PUT" });
        }

        // Refresh conversations to update unread counts
        loadConversations();
    } catch (error) {
        console.error("Select conversation error:", error);
    }
}

function sendMessage(e) {
    e.preventDefault();

    if (!selectedConversation) {
        showToast("Please select a conversation first");
        return;
    }

    const messageInput = document.getElementById("messageInput");
    const messageText = messageInput.value.trim();

    if (!messageText) return;

    messageInput.disabled = true;

    fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            senderId: currentUser.id,
            recipientId: selectedConversation.userId,
            message: messageText
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            messageInput.value = "";
            return selectConversation(selectedConversation.userId, selectedConversation.userName);
        }
        showToast(data.error || "Failed to send message");
    })
    .catch(error => {
        console.error("Send message error:", error);
        showToast("Error sending message");
    })
    .finally(() => {
        messageInput.disabled = false;
        messageInput.focus();
    });
}

function startMessage(userId, appointmentId) {
    document.querySelector(`[data-panel="messages"]`).click();

    fetch(`${API_URL}/users/${userId}`)
        .then(r => r.json())
        .then(user => {
            selectConversation(userId, user.fullName);
        })
        .catch(err => {
            console.error("Start message error:", err);
            showToast("Could not start conversation");
        });
}

// ==================== INVOICES ====================

function setupInvoices() {
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            renderInvoicesList(e.target.dataset.filter);
        });
    });
}

function renderInvoicesList(filter = "all") {
    const filtered = filter === "all" ? invoices : invoices.filter(inv => inv.status === filter);
    const elem = document.getElementById("invoicesList");

    if (filtered.length === 0) {
        elem.innerHTML = "<p class='empty-state'>No invoices found</p>";
        return;
    }

    elem.innerHTML = filtered.map(invoice => `
        <div class="invoice-row">
            <div class="invoice-info">
                <p class="invoice-id">INV-${invoice.id.substring(0, 8).toUpperCase()}</p>
                <p class="invoice-date">${formatDate(invoice.createdAt)}</p>
                <p class="invoice-desc">${escapeHtml(invoice.description || "Healthcare Service")}</p>
            </div>
            <div class="invoice-amount">PKR ${Math.round(invoice.amount).toLocaleString()}</div>
            <div class="invoice-status">
                <span class="status-badge ${invoice.status.toLowerCase()}">${invoice.status}</span>
            </div>
        </div>
    `).join("");
}

// ==================== ADMIN ====================

function setupAdminStats() {
    loadAdminStats();
}

async function loadAdminStats() {
    if (currentUser?.role !== "admin") return;

    try {
        const response = await fetch(`${API_URL}/admin/analytics`);
        const stats = await response.json();

        document.getElementById("statTotalAppointments").textContent = stats.todayAppointments || 0;
        document.getElementById("statTotalPatients").textContent = stats.totalPatients || 0;
        document.getElementById("statTotalDoctors").textContent = stats.totalDoctors || 0;
        document.getElementById("statTotalRevenue").textContent = "PKR " + Math.round(stats.totalRevenue || 0).toLocaleString();
    } catch (error) {
        console.error("Admin stats error:", error);
    }
}

// ==================== UTILITIES ====================

function setupLogout() {
    const logoutBtn = document.querySelector(".btn-logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            currentUser = null;
            selectedConversation = null;
            localStorage.removeItem("clinicflow_user");
            showAuthModal();
            document.getElementById("loginForm").reset();
            document.getElementById("registerForm").reset();
        });
    }
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => toast.classList.remove("show"), 3000);
}

function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return "N/A";
    try {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    } catch {
        return dateString;
    }
}

function formatTime(timeString) {
    if (!timeString) return "N/A";
    try {
        const [hours, minutes] = timeString.split(":");
        const date = new Date();
        date.setHours(hours, minutes);
        return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch {
        return timeString;
    }
}

function formatMessageTime(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function setDefaultDates() {
    const today = new Date().toISOString().split("T")[0];
    const visitDate = document.getElementById("visitDate");
    if (visitDate) visitDate.value = today;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
