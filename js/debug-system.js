class DebugSystem {
    constructor() {
        this.logs = [];
        this.maxLogs = 100;
        this.isInitialized = false;
        
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        try {
            this.setupConsoleOverrides();
            this.setupErrorHandlers();
            this.setupUI();
            this.isInitialized = true;
            
            this.log('تم تهيئة نظام التصحيح', 'info');
        } catch (error) {
            console.error('Failed to initialize debug system:', error);
        }
    }

    setupConsoleOverrides() {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        console.log = (...args) => {
            this.log(args.join(' '), 'info');
            originalLog.apply(console, args);
        };

        console.warn = (...args) => {
            this.log(args.join(' '), 'warn', new Error().stack);
            originalWarn.apply(console, args);
        };

        console.error = (...args) => {
            this.log(args.join(' '), 'error', new Error().stack);
            originalError.apply(console, args);
        };
    }

    setupErrorHandlers() {
        window.addEventListener('error', (event) => {
            this.log(
                `${event.message} (${event.filename}:${event.lineno})`,
                'error',
                event.error?.stack
            );
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.log(
                `Unhandled Rejection: ${event.reason?.message || event.reason}`,
                'error',
                event.reason?.stack
            );
        });
    }

    setupUI() {
        // إنشاء واجهة التصحيح إذا لم تكن موجودة
        if (!document.getElementById('cnc-debug-overlay')) {
            this.createDebugOverlay();
        }
        
        this.bindEvents();
    }

    createDebugOverlay() {
        const overlayHTML = `
            <div id="cnc-debug-overlay" class="collapsed">
                <div id="cnc-debug-header">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div id="cnc-debug-title">CncAi Debug</div>
                        <small id="cnc-debug-count" style="color:#9bb0c8">0</small>
                    </div>
                    <div id="cnc-debug-controls">
                        <button id="cnc-debug-copy" title="Copy logs">📋</button>
                        <button id="cnc-debug-clear" title="Clear logs">🧹</button>
                        <button id="cnc-debug-close" title="Close">❌</button>
                    </div>
                </div>
                <div id="cnc-debug-body" role="log"></div>
            </div>
            <button id="cnc-debug-btn" aria-label="Open debug">🐞</button>
        `;
        
        document.body.insertAdjacentHTML('beforeend', overlayHTML);
    }

    bindEvents() {
        const overlay = document.getElementById('cnc-debug-overlay');
        const btn = document.getElementById('cnc-debug-btn');
        const copyBtn = document.getElementById('cnc-debug-copy');
        const clearBtn = document.getElementById('cnc-debug-clear');
        const closeBtn = document.getElementById('cnc-debug-close');

        if (btn) {
            btn.addEventListener('click', () => {
                overlay.classList.toggle('collapsed');
            });
        }

        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyLogs());
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearLogs());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                overlay.classList.add('collapsed');
            });
        }
    }

    log(message, type = 'info', stack = null) {
        const timestamp = new Date();
        const logEntry = {
            timestamp,
            type,
            message: String(message),
            stack
        };

        this.logs.unshift(logEntry);
        
        if (this.logs.length > this.maxLogs) {
            this.logs.pop();
        }

        this.updateUI(logEntry);
        this.updateCount();
    }

    updateUI(logEntry) {
        const debugBody = document.getElementById('cnc-debug-body');
        if (!debugBody) return;

        const logElement = this.createLogElement(logEntry);
        if (debugBody.firstChild) {
            debugBody.insertBefore(logElement, debugBody.firstChild);
        } else {
            debugBody.appendChild(logElement);
        }

        // الحفاظ على الحد الأقصى للعناصر المعروضة
        while (debugBody.children.length > this.maxLogs) {
            debugBody.removeChild(debugBody.lastChild);
        }
    }

    createLogElement(logEntry) {
        const div = document.createElement('div');
        div.className = `dbg-item dbg-${logEntry.type}`;
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'dbg-time';
        timeSpan.textContent = `[${this.formatTime(logEntry.timestamp)}] ${logEntry.type.toUpperCase()}`;
        
        const messageDiv = document.createElement('div');
        messageDiv.textContent = logEntry.message.substring(0, 500);
        
        div.appendChild(timeSpan);
        div.appendChild(messageDiv);
        
        if (logEntry.stack && logEntry.type !== 'info') {
            const stackDiv = document.createElement('div');
            stackDiv.className = 'dbg-meta';
            stackDiv.textContent = String(logEntry.stack).split('\n').slice(0, 2).join(' | ');
            div.appendChild(stackDiv);
        }
        
        return div;
    }

    formatTime(date) {
        return date.toISOString().slice(11, 23);
    }

    updateCount() {
        const countEl = document.getElementById('cnc-debug-count');
        if (countEl) {
            countEl.textContent = this.logs.length + ' سجلات';
        }
    }

    copyLogs() {
        try {
            const text = this.logs.map(log => 
                `[${log.timestamp.toISOString()}] ${log.type.toUpperCase()}: ${log.message}\n${log.stack || ''}`
            ).join('\n\n');
            
            navigator.clipboard.writeText(text);
            this.log('تم نسخ السجل إلى الحافظة', 'info');
        } catch (error) {
            this.log('فشل نسخ السجل: ' + error.message, 'error');
        }
    }

    clearLogs() {
        this.logs = [];
        const debugBody = document.getElementById('cnc-debug-body');
        if (debugBody) {
            debugBody.innerHTML = '';
        }
        this.updateCount();
        this.log('تم مسح السجلات', 'info');
    }

    getLogs() {
        return [...this.logs];
    }
}

// تصدير النظام للاستخدام العالمي
window.DebugSystem = DebugSystem;
