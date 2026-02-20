/**
 * AUTH.JS - Role-based Authentication Guard
 * Apatte Racing Team | Shell Eco-Marathon 2026
 * 
 * FUNCTIONALITY:
 * - Check user role from sessionStorage
 * - Validate role-based page access
 * - Redirect unauthorized users
 * - Auto-redirect on login based on role
 * - Prevent infinite redirect loops
 */

// TEST ACCOUNTS FOR DEVELOPMENT
// Replace dengan backend API dalam production
const TEST_ACCOUNTS = {
    'budi': { password: 'password123', role: 'admin' },
    'siti': { password: 'password123', role: 'manager' },
    'rudi': { password: 'password123', role: 'ph-h2' },
    'andi': { password: 'password123', role: 'uc-be' }
};

// Role to page mapping
const ROLE_PAGE_MAP = {
    'admin': 'overview.html',
    'manager': 'overview.html',
    'ph-h2': 'ph-h2.html',
    'uc-be': 'uc-be.html'
};

// Page access permissions
const PAGE_PERMISSIONS = {
    'index': ['all'],  // index.html accessible to all (login page)
    'login': ['all'],  // login page accessible to all
    'overview': ['admin', 'manager'],
    'ph-h2': ['admin', 'manager', 'ph-h2'],
    'uc-be': ['admin', 'manager', 'uc-be'],
    'setting': ['admin']
};

/**
 * Get current user role from sessionStorage
 */
function getUserRole() {
    return sessionStorage.getItem('userRole') || null;
}

/**
 * Set user role in sessionStorage
 */
function setUserRole(role) {
    sessionStorage.setItem('userRole', role);
}

/**
 * Get current page name from URL
 */
function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    let pageName = filename.replace('.html', '');
    
    // Treat index.html sebagai login page
    if (pageName === 'index' || pageName === '') {
        return 'index';
    }
    
    return pageName;
}

/**
 * Check if user has permission to access current page
 */
function checkPageAccess() {
    const currentPage = getCurrentPage();
    const userRole = getUserRole();
    
    // Login page (index.html) always accessible
    if (currentPage === 'index') {
        return true;
    }
    
    // If no role, redirect to login
    if (!userRole) {
        window.location.href = 'index.html';
        return false;
    }
    
    // Check permission
    const allowedRoles = PAGE_PERMISSIONS[currentPage] || [];
    if (allowedRoles.includes('all') || allowedRoles.includes(userRole)) {
        return true;
    }
    
    // Redirect to appropriate page based on role
    const redirectPage = ROLE_PAGE_MAP[userRole] || 'index.html';
    window.location.href = redirectPage + '?role=' + userRole;
    return false;
}

/**
 * Set user email
 */
function setUserEmail(email) {
    sessionStorage.setItem('userEmail', email);
}

/**
 * Get user email
 */
function getUserEmail() {
    return sessionStorage.getItem('userEmail') || null;
}

/**
 * Handle login - validate credentials and redirect
 */
function handleLogin() {
    const username = document.getElementById('username')?.value?.toLowerCase();
    const password = document.getElementById('password')?.value;
    
    // Validation
    if (!username || !password) {
        showNotification('Engineer ID dan Security Token harus diisi', 'error');
        return;
    }
    
    // Check test account (development)
    // In production, replace dengan API call ke backend: POST /api/auth/login
    if (TEST_ACCOUNTS[username] && TEST_ACCOUNTS[username].password === password) {
        const role = TEST_ACCOUNTS[username].role;
        setUserRole(role);
        setUserEmail(username + '@apatte.local');
        
        showNotification('Login berhasil! Redirecting...', 'success');
        
        // Redirect based on role
        const redirectPage = ROLE_PAGE_MAP[role] || 'index.html';
        
        // PENTING: Gunakan setTimeout untuk menghindari infinite redirect loop
        setTimeout(() => {
            window.location.href = redirectPage + '?auth=' + Date.now();
        }, 500);
    } else {
        showNotification('Engineer ID atau Security Token salah. Gunakan akun test: budi/siti/rudi/andi', 'error');
    }
}

/**
 * Handle logout - clear session and redirect to login
 */
function handleLogout() {
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('userEmail');
    window.location.href = 'index.html';
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
    // Create toast container if not exists
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6';
    toast.style.cssText = `
        background-color: ${bgColor};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: 'Space Grotesk', sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Prevent infinite redirect loops
let isCheckingAccess = false;

/**
 * Wrapper untuk checkPageAccess - prevent multiple calls
 */
function safeCheckPageAccess() {
    if (isCheckingAccess) return;
    isCheckingAccess = true;
    
    try {
        checkPageAccess();
    } catch (error) {
        console.error('Error checking page access:', error);
    }
}

// Run access check on page load - hanya sekali
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeCheckPageAccess);
} else {
    safeCheckPageAccess();
}
