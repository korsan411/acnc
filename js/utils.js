class TaskManager {
    constructor() {
        this.queue = [];
        this.isRunning = false;
        this.currentTask = null;
    }

    async addTask(taskFn, description = 'مهمة') {
        return new Promise((resolve, reject) => {
            this.queue.push({ 
                taskFn, 
                description, 
                resolve, 
                reject 
            });
            
            if (!this.isRunning) {
                this.processQueue();
            }
        });
    }

    async processQueue() {
        if (this.queue.length === 0) {
            this.isRunning = false;
            return;
        }

        this.isRunning = true;
        const task = this.queue.shift();
        this.currentTask = task;

        try {
            if (window.showProgress) {
                window.showProgress(task.description);
            }
            
            const result = await task.taskFn();
            task.resolve(result);
        } catch (error) {
            console.error(`فشل في ${task.description}:`, error);
            
            if (window.showToast) {
                window.showToast(`فشل في ${task.description}: ${error.message}`, 5000);
            }
            
            task.reject(error);
        } finally {
            this.currentTask = null;
            
            if (window.hideProgress) {
                window.hideProgress();
            }
            
            setTimeout(() => this.processQueue(), 50);
        }
    }

    clear() {
        this.queue = [];
        this.isRunning = false;
        this.currentTask = null;
    }

    getQueueLength() {
        return this.queue.length;
    }
}

class MemoryManager {
    constructor() {
        this.mats = new Set();
        this.maxMats = 15;
    }

    track(mat) {
        try {
            if (mat && !this.isMatDeleted(mat)) {
                this.mats.add(mat);
                
                if (this.mats.size > this.maxMats) {
                    this.cleanupOldest();
                }
            }
        } catch (error) {
            console.warn('فشل في تتبع المصفوفة:', error);
        }
    }

    isMatDeleted(mat) {
        try {
            return !mat || typeof mat.delete !== 'function';
        } catch {
            return true;
        }
    }

    cleanupOldest() {
        try {
            if (this.mats.size > 0) {
                const oldest = this.mats.values().next().value;
                this.safeDelete(oldest);
                this.mats.delete(oldest);
            }
        } catch (error) {
            console.warn('فشل في تنظيف أقدم مصفوفة:', error);
        }
    }

    safeDelete(mat) {
        try {
            if (!this.isMatDeleted(mat) && typeof mat.delete === 'function') {
                mat.delete();
            }
        } catch (error) {
            console.warn('فشل في حذف المصفوفة بأمان:', error);
        }
    }

    cleanupAll() {
        try {
            this.mats.forEach(mat => this.safeDelete(mat));
            this.mats.clear();
        } catch (error) {
            console.warn('فشل في التنظيف الكامل:', error);
        }
    }

    getMemoryUsage() {
        return this.mats.size;
    }
}

class InputValidator {
    static validateNumberInput(inputId, min, max, defaultValue = min) {
        try {
            const input = document.getElementById(inputId);
            if (!input) {
                throw new Error(`عنصر الإدخال ${inputId} غير موجود`);
            }
            
            let value = parseFloat(input.value);
            
            if (isNaN(value)) {
                this.showToast(`القيمة في ${inputId} غير صالحة`);
                input.value = defaultValue;
                return defaultValue;
            }
            
            if (value < min) {
                this.showToast(`القيمة في ${inputId} أقل من المسموح (${min})`);
                input.value = min;
                return min;
            }
            
            if (value > max) {
                this.showToast(`القيمة في ${inputId} أكبر من المسموح (${max})`);
                input.value = max;
                return max;
            }
            
            return value;
        } catch (error) {
            console.error(`خطأ في التحقق من ${inputId}:`, error);
            return defaultValue;
        }
    }

    static validateImageSize(canvas) {
        if (!canvas) return false;
        
        const maxPixels = 2000000;
        const currentPixels = canvas.width * canvas.height;
        
        if (currentPixels > maxPixels) {
            const ratio = Math.sqrt(maxPixels / currentPixels);
            const newWidth = Math.floor(canvas.width * ratio);
            const newHeight = Math.floor(canvas.height * ratio);
            
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = newWidth;
            tempCanvas.height = newHeight;
            tempCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
            
            const ctx = canvas.getContext('2d');
            canvas.width = newWidth;
            canvas.height = newHeight;
            ctx.drawImage(tempCanvas, 0, 0);
            
            this.showToast('تم تقليل حجم الصورة للأداء الأفضل');
            return true;
        }
        return false;
    }

    static showToast(message, duration = 3000) {
        if (window.showToast) {
            window.showToast(message, duration);
        } else {
            console.log('Toast:', message);
        }
    }
}

// دوال مساعدة عامة
const Utils = {
    cmToMm(cm) {
        const result = parseFloat(cm) * 10;
        return isNaN(result) ? 0 : result;
    },
    
    mmToCm(mm) {
        const result = parseFloat(mm) / 10;
        return isNaN(result) ? 0 : result;
    },
    
    clamp(value, min = 0, max = 1) {
        return Math.max(min, Math.min(max, value));
    },
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// تصدير الكلاسات والدوال للاستخدام العالمي
window.TaskManager = TaskManager;
window.MemoryManager = MemoryManager;
window.InputValidator = InputValidator;
window.Utils = Utils;
