/* ==========================================================================
   JGM MONEY TRANSFER - CORE JAVASCRIPT APPLICATION ENGINE
   ========================================================================== */

// --- INITIAL STATE & DEMO DATA ---
const DEFAULT_TRANSACTIONS = [];

let state = {
    user: null,
    balance: 0.00,
    transactions: [],
    currentView: "dashboard",
    activeTransferMode: "upi",
    currentPinInput: "",
    pendingTxData: null,
    cashflowChartInstance: null,
    categoryChartInstance: null
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    // Clear old sample transactions for clean zero state
    localStorage.removeItem("jgm_transactions");
    loadTransactions();
    checkAuthSession();
    setupEventListeners();
    generateDynamicQR();
});

function loadTransactions() {
    const saved = localStorage.getItem("jgm_transactions");
    if (saved) {
        state.transactions = JSON.parse(saved);
    } else {
        state.transactions = [];
        saveTransactions();
    }
    recalculateBalance();
}

function saveTransactions() {
    localStorage.setItem("jgm_transactions", JSON.stringify(state.transactions));
}

function recalculateBalance() {
    let base = 0.00;
    state.transactions.forEach(t => {
        if (t.status === "Success") {
            if (t.type === "outflow") base -= t.amount;
            else if (t.type === "inflow") base += t.amount;
        }
    });
    state.balance = Math.max(0, base);
    updateBalanceDisplays();
}

function updateBalanceDisplays() {
    const formatted = formatCurrency(state.balance);
    document.getElementById("topbar-balance").textContent = formatted;
    document.getElementById("dash-main-balance").textContent = formatted;
}

// --- AUTHENTICATION ---
function checkAuthSession() {
    const savedUser = localStorage.getItem("jgm_user");
    if (savedUser) {
        state.user = JSON.parse(savedUser);
        showAppShell();
    } else {
        showLoginScreen();
    }
}

function quickLogin(email, password) {
    document.getElementById("login-email").value = email;
    document.getElementById("login-password").value = password;
    handleLoginSubmit(new Event("submit"));
}

function handleLoginSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    const email = document.getElementById("login-email").value.trim();
    if (!email) {
        showToast("Please enter a valid email or mobile number", "danger");
        return;
    }

    state.user = {
        name: email.includes("business") ? "JGM Enterprise" : "Agneay s",
        email: email,
        vpa: email.includes("business") ? "business@jgm" : "6282695019@fam"
    };

    localStorage.setItem("jgm_user", JSON.stringify(state.user));
    showToast(`Welcome back, ${state.user.name}!`, "success");
    showAppShell();
}

function showLoginScreen() {
    document.getElementById("login-screen").classList.remove("hidden");
    document.getElementById("app-shell").classList.add("hidden");
}

function showAppShell() {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("app-shell").classList.remove("hidden");
    
    if (state.user) {
        document.getElementById("user-display-name").textContent = state.user.name;
        document.getElementById("user-display-vpa").textContent = state.user.vpa;
        document.getElementById("dash-vpa").textContent = state.user.vpa;
    }
    
    switchView("dashboard");
}

function logout() {
    localStorage.removeItem("jgm_user");
    state.user = null;
    showToast("Logged out successfully", "success");
    showLoginScreen();
}

// --- EVENT LISTENERS SETUP ---
function setupEventListeners() {
    // Login form
    document.getElementById("login-form").addEventListener("submit", handleLoginSubmit);
    
    // Logout button
    document.getElementById("logout-btn").addEventListener("click", logout);

    // Sidebar navigation items
    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const view = item.getAttribute("data-view");
            switchView(view);
            // Close mobile sidebar if open
            document.getElementById("sidebar").classList.remove("open");
        });
    });

    // Mobile sidebar toggles
    document.getElementById("sidebar-toggle-btn").addEventListener("click", () => {
        document.getElementById("sidebar").classList.toggle("open");
    });
    document.getElementById("sidebar-close-btn").addEventListener("click", () => {
        document.getElementById("sidebar").classList.remove("open");
    });
}

// --- VIEW NAVIGATION / ROUTER ---
function switchView(viewId) {
    state.currentView = viewId;

    // Update active class on view sections
    document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active"));
    
    let targetSecId = `view-${viewId}`;
    if (viewId === "add-transaction") targetSecId = "view-send"; // Alias
    
    const targetSec = document.getElementById(targetSecId);
    if (targetSec) targetSec.classList.add("active");

    // Update active nav link
    document.querySelectorAll(".nav-item").forEach(item => {
        if (item.getAttribute("data-view") === viewId) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    // Update Topbar Title
    const titleMap = {
        "dashboard": { title: "Dashboard", sub: "Overview of your financial ecosystem" },
        "send": { title: "Send / Pay Money", sub: "Instant UPI & Bank transfers" },
        "add-transaction": { title: "Add Transaction", sub: "Record manual transfers and payments" },
        "history": { title: "Transaction History", sub: "Complete statement of past payments" },
        "qr": { title: "QR Pay Studio", sub: "Generate & scan UPI payment QR codes" },
        "analytics": { title: "Analytics & Insights", sub: "Visual cash flow & spending breakdown" },
        "settings": { title: "Settings", sub: "Manage profile, limits & UPI security PIN" }
    };

    const info = titleMap[viewId] || { title: "Banking Portal", sub: "JGM Money Transfer" };
    document.getElementById("page-title").textContent = info.title;
    document.getElementById("page-subtitle").textContent = info.sub;

    // Trigger view specific re-renders
    if (viewId === "dashboard") {
        renderDashboardRecent();
        initDashboardCharts();
    } else if (viewId === "history") {
        renderTransactionTable();
    } else if (viewId === "qr") {
        generateDynamicQR();
    } else if (viewId === "analytics") {
        initAnalyticsCharts();
    }
}

// --- DASHBOARD RENDER & CHARTS ---
function renderDashboardRecent() {
    const container = document.getElementById("dashboard-recent-list");
    container.innerHTML = "";

    if (state.transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-receipt"></i>
                <p>No transactions yet</p>
            </div>
        `;
        return;
    }
    recent.forEach(t => {
        const div = document.createElement("div");
        div.className = "recent-item";
        div.onclick = () => openReceiptModal(t.id);

        const isOut = t.type === "outflow";
        const iconClass = isOut ? "fa-solid fa-arrow-up-right outflow" : "fa-solid fa-arrow-down-left inflow";
        const sign = isOut ? "-" : "+";
        const amountClass = isOut ? "text-red" : "text-green";

        div.innerHTML = `
            <div class="recent-item-left">
                <div class="tx-icon-circle ${t.type}">
                    <i class="${iconClass}"></i>
                </div>
                <div class="tx-details">
                    <span class="tx-title">${escapeHTML(t.recipient)}</span>
                    <span class="tx-subtitle">${t.date} • ${t.mode}</span>
                </div>
            </div>
            <div class="recent-item-right">
                <span class="tx-amount ${amountClass}">${sign}${formatCurrency(t.amount)}</span>
                <span class="status-badge ${t.status.toLowerCase()}">${t.status}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

function initDashboardCharts() {
    const ctx = document.getElementById("cashflowChart");
    if (!ctx) return;

    if (state.cashflowChartInstance) {
        state.cashflowChartInstance.destroy();
    }

    state.cashflowChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['17 Jul', '18 Jul', '19 Jul', '20 Jul', '21 Jul', '22 Jul', '23 Jul'],
            datasets: [
                {
                    label: 'Inflow (₹)',
                    data: [12000, 5000, 0, 8000, 1500, 15400, 5000],
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Outflow (₹)',
                    data: [3500, 1200, 2450, 0, 480, 2000, 6250],
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#94A3B8' } }
            },
            scales: {
                x: { ticks: { color: '#64748B' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#64748B' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

function updateDashboardChart() {
    initDashboardCharts();
}

function initAnalyticsCharts() {
    const ctx = document.getElementById("categoryChart");
    if (!ctx) return;

    if (state.categoryChartInstance) {
        state.categoryChartInstance.destroy();
    }

    state.categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Peer Transfers', 'Bills & Utilities', 'Shopping & Food', 'Services'],
            datasets: [{
                data: [45, 25, 20, 10],
                backgroundColor: ['#2563EB', '#06B6D4', '#10B981', '#F59E0B']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94A3B8' } }
            }
        }
    });
}

// --- SEND MONEY & TRANSFER FORM ---
function switchTransferTab(tab) {
    state.activeTransferMode = tab;
    document.querySelectorAll(".transfer-tabs .tab-btn").forEach(btn => {
        if (btn.getAttribute("data-tab") === tab) btn.classList.add("active");
        else btn.classList.remove("active");
    });

    const upiGroup = document.getElementById("upi-field-group");
    const bankGroup = document.getElementById("bank-field-group");
    const summaryMode = document.getElementById("summary-mode");

    if (tab === "upi") {
        upiGroup.classList.remove("hidden");
        bankGroup.classList.add("hidden");
        summaryMode.textContent = "UPI Instant Transfer";
    } else if (tab === "bank") {
        upiGroup.classList.add("hidden");
        bankGroup.classList.remove("hidden");
        summaryMode.textContent = "Bank Transfer (IMPS)";
    } else {
        upiGroup.classList.remove("hidden");
        bankGroup.classList.add("hidden");
        summaryMode.textContent = "JGM Wallet Direct";
    }
}

function setPresetAmount(amt) {
    const input = document.getElementById("transfer-amount");
    input.value = amt;
    updateAmountInWords();
}

function updateAmountInWords() {
    const val = parseFloat(document.getElementById("transfer-amount").value) || 0;
    document.getElementById("summary-total-payable").textContent = formatCurrency(val);
    document.getElementById("amount-words").textContent = val > 0 ? numToWords(val) + " Rupees Only" : "Zero Rupees";
}

function prefillPayee(name, vpa, phone) {
    switchView("send");
    document.getElementById("recipient-name").value = name;
    document.getElementById("recipient-vpa").value = vpa;
    showToast(`Selected payee: ${name}`, "success");
}

function handleTransferSubmit(e) {
    e.preventDefault();

    const name = document.getElementById("recipient-name").value.trim();
    const vpa = document.getElementById("recipient-vpa").value.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@upi`;
    const amount = parseFloat(document.getElementById("transfer-amount").value);
    const note = document.getElementById("transfer-note").value.trim();

    if (!name || isNaN(amount) || amount <= 0) {
        showToast("Please enter a valid recipient name and amount", "danger");
        return;
    }

    if (amount > state.balance) {
        showToast("Insufficient account balance!", "danger");
        return;
    }

    state.pendingTxData = {
        id: "JGM" + Date.now(),
        recipient: name,
        vpa: vpa,
        amount: amount,
        type: "outflow",
        mode: state.activeTransferMode.toUpperCase(),
        status: "Success",
        date: formatDate(new Date()),
        note: note || "Money Transfer"
    };

    openPinModal();
}

// --- UPI PIN VIRTUAL KEYPAD MODAL ---
function openPinModal() {
    state.currentPinInput = "";
    updatePinDots();
    document.getElementById("pin-modal-amount").textContent = formatCurrency(state.pendingTxData.amount);
    document.getElementById("pin-modal-recipient").textContent = state.pendingTxData.recipient;
    document.getElementById("pin-processing-overlay").classList.add("hidden");
    document.getElementById("pin-modal").classList.remove("hidden");
}

function closePinModal() {
    document.getElementById("pin-modal").classList.add("hidden");
}

function inputPinDigit(digit) {
    if (state.currentPinInput.length < 4) {
        state.currentPinInput += digit;
        updatePinDots();
    }
    if (state.currentPinInput.length === 4) {
        setTimeout(submitPinPayment, 200);
    }
}

function clearPin() {
    state.currentPinInput = "";
    updatePinDots();
}

function updatePinDots() {
    const dots = document.querySelectorAll(".pin-dot");
    dots.forEach((dot, index) => {
        if (index < state.currentPinInput.length) {
            dot.classList.add("filled");
        } else {
            dot.classList.remove("filled");
        }
    });
}

function submitPinPayment() {
    if (state.currentPinInput.length < 4) {
        showToast("Please enter 4-digit UPI PIN", "warning");
        return;
    }

    // Show NPCI processing overlay
    document.getElementById("pin-processing-overlay").classList.remove("hidden");

    setTimeout(() => {
        closePinModal();
        
        // Execute Payment & Update State
        state.transactions.unshift(state.pendingTxData);
        saveTransactions();
        recalculateBalance();

        showToast(`Successfully transferred ${formatCurrency(state.pendingTxData.amount)} to ${state.pendingTxData.recipient}!`, "success");
        
        // Reset transfer form
        document.getElementById("transfer-form").reset();
        updateAmountInWords();

        // Open Digital Receipt
        openReceiptModal(state.pendingTxData.id);
        state.pendingTxData = null;
    }, 1200);
}

// --- QR PAY STUDIO ---
function loadQRProfile(name, vpa, note) {
    document.getElementById("qr-payee-name").value = name;
    document.getElementById("qr-vpa").value = vpa;
    document.getElementById("qr-note").value = note || "Payment";
    generateDynamicQR();
    showToast(`Loaded QR profile for ${name}`, "success");
}

function generateDynamicQR() {
    const name = document.getElementById("qr-payee-name").value.trim() || "Agneay s";
    const vpa = document.getElementById("qr-vpa").value.trim() || "6282695019@fam";
    const amount = document.getElementById("qr-amount").value.trim();
    const note = document.getElementById("qr-note").value.trim() || "Transfer";

    let upiString = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(name)}`;
    if (amount) upiString += `&am=${encodeURIComponent(amount)}`;
    if (note) upiString += `&tn=${encodeURIComponent(note)}`;

    document.getElementById("upi-deep-link").textContent = upiString;

    const qrContainer = document.getElementById("qrcode-container");
    qrContainer.innerHTML = "";

    if (window.QRCode) {
        new QRCode(qrContainer, {
            text: upiString,
            width: 160,
            height: 160,
            colorDark: "#0F172A",
            colorLight: "#FFFFFF",
            correctLevel: QRCode.CorrectLevel.H
        });
    } else {
        qrContainer.innerHTML = `<p style="color:#000; padding:20px;">[QR Code Generated]<br>${vpa}</p>`;
    }
}

function copyUPILink() {
    const text = document.getElementById("upi-deep-link").textContent;
    navigator.clipboard.writeText(text);
    showToast("UPI payment link copied to clipboard!", "success");
}

function copyUPIHandle(vpa) {
    navigator.clipboard.writeText(vpa);
    showToast(`Copied UPI ID: ${vpa}`, "success");
}

function simulateScanQR(payeeName, vpa, amount) {
    prefillPayee(payeeName, vpa, "");
    document.getElementById("transfer-amount").value = amount;
    updateAmountInWords();
    showToast(`Scanned merchant: ${payeeName} (₹${amount})`, "success");
}

// --- TRANSACTION HISTORY TABLE & FILTERS ---
function renderTransactionTable() {
    const tbody = document.getElementById("transaction-table-body");
    const emptyState = document.getElementById("table-empty-state");
    tbody.innerHTML = "";

    const searchVal = document.getElementById("history-search").value.toLowerCase();
    const statusVal = document.getElementById("history-status-filter").value;
    const modeVal = document.getElementById("history-mode-filter").value;

    const filtered = state.transactions.filter(t => {
        const matchesSearch = t.recipient.toLowerCase().includes(searchVal) ||
                              t.id.toLowerCase().includes(searchVal) ||
                              t.vpa.toLowerCase().includes(searchVal);
        const matchesStatus = statusVal === "all" || t.status === statusVal;
        const matchesMode = modeVal === "all" || t.mode === modeVal;
        return matchesSearch && matchesStatus && matchesMode;
    });

    if (filtered.length === 0) {
        emptyState.classList.remove("hidden");
        return;
    } else {
        emptyState.classList.add("hidden");
    }

    filtered.forEach(t => {
        const tr = document.createElement("tr");
        const isOut = t.type === "outflow";
        const sign = isOut ? "-" : "+";
        const amountClass = isOut ? "text-red bold" : "text-green bold";

        tr.innerHTML = `
            <td class="bold text-blue">${t.id}</td>
            <td>${t.date}</td>
            <td>
                <strong>${escapeHTML(t.recipient)}</strong>
                <br><span style="font-size:0.75rem; color:#64748B;">${t.vpa}</span>
            </td>
            <td><span class="badge blue">${t.mode}</span></td>
            <td class="${amountClass}">${sign}${formatCurrency(t.amount)}</td>
            <td><span class="status-badge ${t.status.toLowerCase()}">${t.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="openReceiptModal('${t.id}')">
                    <i class="fa-solid fa-receipt"></i> Receipt
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterTransactions() {
    renderTransactionTable();
}

function exportTransactionsCSV() {
    if (state.transactions.length === 0) {
        showToast("No transactions to export", "warning");
        return;
    }

    let csv = "Transaction ID,Date,Recipient,VPA,Mode,Amount,Status,Note\n";
    state.transactions.forEach(t => {
        csv += `"${t.id}","${t.date}","${t.recipient}","${t.vpa}","${t.mode}","${t.amount}","${t.status}","${t.note}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `JGM_Statement_${Date.now()}.csv`);
    a.click();
    showToast("Transaction statement downloaded!", "success");
}

// --- DIGITAL RECEIPT MODAL ---
function openReceiptModal(txId) {
    const tx = state.transactions.find(t => t.id === txId);
    if (!tx) return;

    document.getElementById("receipt-amount").textContent = formatCurrency(tx.amount);
    document.getElementById("receipt-utr").textContent = tx.id;
    document.getElementById("receipt-datetime").textContent = tx.date;
    document.getElementById("receipt-payee-name").textContent = tx.recipient;
    document.getElementById("receipt-payee-vpa").textContent = tx.vpa;
    document.getElementById("receipt-method").textContent = `${tx.mode} Instant Payment`;
    document.getElementById("receipt-note").textContent = tx.note || "-";

    document.getElementById("receipt-modal").classList.remove("hidden");
}

function closeReceiptModal() {
    document.getElementById("receipt-modal").classList.add("hidden");
}

function printReceipt() {
    window.print();
}

function shareReceipt() {
    showToast("Receipt link copied to clipboard!", "success");
}

// --- UTILITY FUNCTIONS ---
function toggleNotifications() {
    document.getElementById("notifications-popup").classList.toggle("hidden");
}

function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    const icon = type === "success" ? "fa-solid fa-circle-check" : "fa-solid fa-circle-exclamation";
    toast.innerHTML = `<i class="${icon}"></i> <span>${escapeHTML(message)}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function formatCurrency(amount) {
    return "₹" + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${formatAMPM(d)}`;
}

function formatAMPM(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return hours + ':' + minutes + ' ' + ampm;
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function numToWords(n) {
    const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

    if ((n = n.toString()).length > 9) return 'Overflow';
    let n_array = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n_array) return '';
    let str = '';
    str += (n_array[1] != 0) ? (a[Number(n_array[1])] || b[n_array[1][0]] + ' ' + a[n_array[1][1]]) + 'Lakh ' : '';
    str += (n_array[2] != 0) ? (a[Number(n_array[2])] || b[n_array[2][0]] + ' ' + a[n_array[2][1]]) + 'Thousand ' : '';
    str += (n_array[3] != 0) ? (a[Number(n_array[3])] || b[n_array[3][0]] + ' ' + a[n_array[3][1]]) + 'Hundred ' : '';
    str += (n_array[4] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n_array[4])] || b[n_array[4][0]] + ' ' + a[n_array[4][1]]) : '';
    return str.trim();
}
