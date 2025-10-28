class CncAiApp {
    constructor() {
        this.cvReady = false;
        this.grayMat = null;
        this.contour = null;
        this.previewCanvas = null;
        this.additionalContours = [];
        this.isProcessing = false;
        this.currentColormap = 'jet';
        this.lastGeneratedGcode = '';
        
        this.taskManager = new TaskManager();
        this.memoryManager = new MemoryManager();
        this.validator = new InputValidator();
        
        this.init();
    }

    init() {
        this.initOpenCV();
        this.initUI();
        this.initEventListeners();
        this.initThreeJS();
        
        console.log('CNC AI Application initialized');
    }

    initOpenCV() {
        this.waitForCv();
    }

    initUI() {
        this.initTabs();
        this.initMachineCategory();
        this.initControlElements();
        this.initFileInput();
        this.initFileFormatButtons();
        this.initButtons();
        this.initColormapButtons();
        this.updateDimensionDisplay();
    }

    initEventListeners() {
        // أحداث النافذة
        window.addEventListener('resize', this.handleResize.bind(this));
        window.addEventListener('beforeunload', this.cleanup.bind(this));
        
        // اختصارات لوحة المفاتيح
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
    }

    handleResize() {
        // تحديث أحجام العارض ثلاثي الأبعاد
        if (this.threeViewer) {
            this.threeViewer.handleResize();
        }
        if (this.simulation) {
            this.simulation.handleResize();
        }
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'g': 
                    e.preventDefault();
                    this.generateGcode();
                    break;
                case 'r': 
                    e.preventDefault();
                    this.quickGenerate();
                    break;
                case 'd': 
                    e.preventDefault();
                    this.downloadGcode();
                    break;
            }
        }
    }

    async generateGcode() {
        try {
            const machineType = document.getElementById('machineCategory').value;
            let gcode = '';
            
            switch(machineType) {
                case 'router':
                    gcode = await this.gcodeGenerator.generateRouterGcode();
                    break;
                case 'laser':
                    gcode = await this.gcodeGenerator.generateLaserGcode();
                    break;
                case 'threed':
                    gcode = await this.gcodeGenerator.generate3DGcode();
                    break;
            }
            
            this.displayGcode(gcode);
            this.lastGeneratedGcode = gcode;
            this.renderTopView(gcode);
            
        } catch (error) {
            this.showToast('فشل في توليد G-code: ' + error.message, 5000);
            console.error('G-code generation error:', error);
        }
    }

    displayGcode(gcode) {
        const gcodeOut = document.getElementById('gcodeOut');
        if (gcodeOut) {
            gcodeOut.value = gcode;
        }
    }

    downloadGcode() {
        const text = document.getElementById('gcodeOut').value;
        if (!text) { 
            this.showToast("لا يوجد G-code لتحميله"); 
            return; 
        }
        
        try {
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 19).replace(/[:.]/g, '-');
            const machineType = document.getElementById('machineCategory').value;
            const filename = `${machineType}_output_${dateStr}.gcode`;
            
            this.downloadFile(text, filename, 'text/plain');
            this.showToast(`تم تحميل الملف: ${filename}`);
        } catch (error) {
            console.error('Download error:', error);
            this.showToast('فشل في تحميل الملف');
        }
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; 
        a.download = filename; 
        document.body.appendChild(a); 
        a.click(); 
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showToast(message, duration = 3000) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        toast.textContent = String(message).substring(0, 200);
        toast.style.display = 'block';
        
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.style.display = 'none';
        }, duration);
        
        console.log('Toast:', message);
    }

    showProgress(message = 'جاري المعالجة...') {
        const progressText = document.getElementById('progressText');
        const progressOverlay = document.getElementById('progressOverlay');
        
        if (progressText) progressText.textContent = message;
        if (progressOverlay) progressOverlay.style.display = 'flex';
    }

    hideProgress() {
        const progressOverlay = document.getElementById('progressOverlay');
        if (progressOverlay) progressOverlay.style.display = 'none';
    }

    cleanup() {
        this.memoryManager.cleanupAll();
        if (this.threeViewer) this.threeViewer.cleanup();
        if (this.simulation) this.simulation.cleanup();
        this.taskManager.clear();
    }
}

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    window.cncApp = new CncAiApp();
});
