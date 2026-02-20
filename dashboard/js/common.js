/**
 * COMMON.JS - Shared Functions & Utilities
 * Apatte Racing Team | Shell Eco-Marathon 2026
 * 
 * FUNCTIONALITY:
 * - UI helpers (modal, dropdown, tabs)
 * - Real-time data utilities
 * - Chart data generation
 * - ML insights formatting
 */

/**
 * Generate random telemetry data (for demo purposes)
 * Replace with actual API calls in production
 */
function generateTelemetryData(type = 'ph-h2') {
    if (type === 'ph-h2') {
        return {
            speed: Math.floor(Math.random() * 60) + 20,
            efficiency: Math.floor(Math.random() * 100) + 85,
            h2Tank: Math.floor(Math.random() * 100) + 20,
            fuelCellTemp: Math.floor(Math.random() * 20) + 60,
            power: Math.floor(Math.random() * 50) + 30,
            motorRPM: Math.floor(Math.random() * 3000) + 1000
        };
    } else if (type === 'uc-be') {
        return {
            speed: Math.floor(Math.random() * 70) + 15,
            efficiency: Math.floor(Math.random() * 95) + 90,
            battery: Math.floor(Math.random() * 50) + 45,
            powerConsumption: Math.floor(Math.random() * 40) + 20,
            motorTemp: Math.floor(Math.random() * 25) + 55,
            motorRPM: Math.floor(Math.random() * 4000) + 500
        };
    }
}

/**
 * Format number with currency or percentage
 */
function formatMetric(value, type = 'number', decimals = 1) {
    if (type === 'percentage') {
        return `${value.toFixed(decimals)}%`;
    } else if (type === 'currency') {
        return `$${value.toFixed(2)}`;
    } else if (type === 'kmh') {
        return `${value.toFixed(decimals)} km/h`;
    } else if (type === 'celsius') {
        return `${value.toFixed(decimals)}°C`;
    } else if (type === 'voltage') {
        return `${value.toFixed(1)}V`;
    } else if (type === 'ampere') {
        return `${value.toFixed(1)}A`;
    } else if (type === 'time') {
        const hours = Math.floor(value / 3600);
        const minutes = Math.floor((value % 3600) / 60);
        const seconds = value % 60;
        return `${hours}h ${minutes}m ${seconds}s`;
    }
    return value.toFixed(decimals);
}

/**
 * Get health status badge color based on value and type
 */
function getHealthStatusColor(value, type = 'efficiency') {
    if (type === 'efficiency') {
        if (value >= 95) return 'bg-accent-electric text-white';
        if (value >= 85) return 'bg-accent-hydrogen text-white';
        if (value >= 70) return 'bg-warning text-white';
        return 'bg-critical text-white';
    } else if (type === 'temperature') {
        if (value <= 50) return 'bg-accent-hydrogen text-white';
        if (value <= 75) return 'bg-accent-electric text-white';
        if (value <= 90) return 'bg-warning text-white';
        return 'bg-critical text-white';
    } else if (type === 'battery') {
        if (value >= 80) return 'bg-accent-electric text-white';
        if (value >= 50) return 'bg-accent-hydrogen text-white';
        if (value >= 20) return 'bg-warning text-white';
        return 'bg-critical text-white';
    }
    return 'bg-surface-dark text-white';
}

/**
 * Generate ML insights text based on vehicle data
 */
function generateMLInsights(vehicleType = 'ph-h2') {
    const insights = {
        'ph-h2': [
            {
                title: 'Energy Predictor',
                status: 'Optimal',
                value: '45.2 km remaining',
                color: 'bg-accent-hydrogen'
            },
            {
                title: 'H2 Purge Scheduler',
                status: 'Scheduled',
                value: '12 min until purge',
                color: 'bg-accent-hydrogen'
            },
            {
                title: 'Anomaly Detection',
                status: 'Clear',
                value: '0 anomalies detected',
                color: 'bg-accent-electric'
            }
        ],
        'uc-be': [
            {
                title: 'Energy Predictor',
                status: 'Optimal',
                value: '38.5 km remaining',
                color: 'bg-accent-electric'
            },
            {
                title: 'Efficiency Map',
                status: 'Recommended',
                value: 'Shift down for efficiency',
                color: 'bg-accent-electric'
            },
            {
                title: 'Fatigue Detector',
                status: 'Alert',
                value: 'Driver fatigue detected',
                color: 'bg-warning'
            }
        ]
    };
    
    return insights[vehicleType] || insights['ph-h2'];
}

/**
 * Generate sector performance data for charts
 */
function generateSectorPerformance() {
    return {
        sectors: ['S1', 'S2', 'S3', 'S4', 'S5'],
        efficiency: [92, 88, 85, 90, 91],
        avgSpeed: [45, 50, 42, 48, 46],
        temps: [62, 68, 71, 65, 63]
    };
}

/**
 * Create a simple bar chart (using text-based visualization)
 */
function createBarChart(containerId, data, maxValue = 100) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = data.map(item => `
        <div class="flex items-center gap-2 mb-2">
            <span class="text-xs text-white/60 w-12">${item.label}</span>
            <div class="flex-1 h-2 bg-surface-dark rounded-full overflow-hidden">
                <div class="h-full bg-accent-hydrogen rounded-full" style="width: ${(item.value / maxValue) * 100}%"></div>
            </div>
            <span class="text-xs text-white/80 w-8 text-right">${item.value}</span>
        </div>
    `).join('');
}

/**
 * Update real-time metric display
 */
function updateMetricCard(cardId, label, value, unit, status = 'normal') {
    const card = document.getElementById(cardId);
    if (!card) return;
    
    const statusColor = {
        'normal': 'text-white',
        'warning': 'text-warning',
        'critical': 'text-critical',
        'good': 'text-accent-electric'
    }[status] || 'text-white';
    
    card.innerHTML = `
        <div class="glass-panel p-4 rounded-lg">
            <div class="text-xs text-white/60 mb-1">${label}</div>
            <div class="text-2xl font-bold ${statusColor}">${value} ${unit}</div>
            <div class="text-xs text-white/40 mt-1">Updated: ${new Date().toLocaleTimeString()}</div>
        </div>
    `;
}

/**
 * Toggle sidebar visibility
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('hidden');
    }
}

/**
 * Open modal dialog
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

/**
 * Close modal dialog
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

/**
 * Format timestamp
 */
function formatTimestamp(date = new Date()) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

/**
 * Get status indicator badge HTML
 */
function getStatusBadge(status = 'active') {
    const badges = {
        'active': '<span class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-accent-electric animate-pulse"></div><span class="text-xs text-accent-electric">ACTIVE</span></span>',
        'offline': '<span class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-critical"></div><span class="text-xs text-critical">OFFLINE</span></span>',
        'warning': '<span class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-warning animate-pulse"></div><span class="text-xs text-warning">WARNING</span></span>',
        'idle': '<span class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-white/40"></div><span class="text-xs text-white/60">IDLE</span></span>'
    };
    return badges[status] || badges['idle'];
}

/**
 * Update page title with role info
 */
function setPageTitle(title, role = null) {
    const roleText = role ? ` | ${role.toUpperCase()}` : '';
    document.title = `${title}${roleText} | Apatte Racing Team`;
}

/**
 * Get navigation items based on role
 */
function getNavItems(role) {
    const baseNav = [
        { label: 'Dashboard', href: 'overview.html', icon: 'dashboard', show: ['admin', 'manager'] },
        { label: 'PH-H2', href: 'ph-h2.html', icon: 'directions_car', show: ['admin', 'manager', 'ph-h2'] },
        { label: 'UC-BE', href: 'uc-be.html', icon: 'electric_car', show: ['admin', 'manager', 'uc-be'] },
        { label: 'Settings', href: 'setting.html', icon: 'settings', show: ['admin'] }
    ];
    
    return baseNav.filter(item => item.show.includes(role));
}
