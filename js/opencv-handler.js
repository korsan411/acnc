class OpenCVHandler {
    constructor() {
        this.cvReady = false;
        this.grayMat = null;
        this.contour = null;
        this.additionalContours = [];
    }

    waitForCv() {
        const checkCv = () => {
            try {
                if (typeof cv !== 'undefined' && (cv.getBuildInformation || cv.imread || cv.Mat)) {
                    const testMat = new cv.Mat();
                    if (testMat && testMat.delete) {
                        this.cvReady = true;
                        testMat.delete();
                        
                        this.updateCvState('✅ OpenCV جاهز');
                        this.showToast('تم تحميل OpenCV بنجاح', 1400);
                        console.log('OpenCV loaded successfully');
                        return;
                    }
                }
                setTimeout(checkCv, 100);
            } catch (error) {
                console.warn('OpenCV test failed, retrying...', error);
                setTimeout(checkCv, 100);
            }
        };
        setTimeout(checkCv, 100);
    }

    updateCvState(message) {
        const cvState = document.getElementById('cvState');
        if (cvState) {
            cvState.innerHTML = message;
        }
    }

    async detectContours(canvas, options = {}) {
        if (!this.cvReady) {
            throw new Error('OpenCV غير جاهز بعد');
        }

        if (!canvas || canvas.width === 0 || canvas.height === 0) {
            throw new Error('لا توجد صورة صالحة للمعالجة');
        }

        let src = null, gray = null, blurred = null, edges = null, hierarchy = null, contours = null, kernel = null;

        try {
            src = cv.imread(canvas);
            if (src.empty()) {
                throw new Error('الصورة غير صالحة للمعالجة');
            }

            gray = new cv.Mat();
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

            blurred = new cv.Mat();
            cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

            const mode = options.mode || 'auto';
            const sensitivity = options.sensitivity || 0.33;

            const median = cv.mean(blurred)[0];
            const lowerThreshold = Math.max(0, (1.0 - sensitivity) * median);
            const upperThreshold = Math.min(255, (1.0 + sensitivity) * median);

            edges = new cv.Mat();
            
            if (mode === 'sobel') {
                const gradX = new cv.Mat(), gradY = new cv.Mat();
                cv.Sobel(blurred, gradX, cv.CV_16S, 1, 0, 3, 1, 0, cv.BORDER_DEFAULT);
                cv.Sobel(blurred, gradY, cv.CV_16S, 0, 1, 3, 1, 0, cv.BORDER_DEFAULT);
                cv.convertScaleAbs(gradX, gradX);
                cv.convertScaleAbs(gradY, gradY);
                cv.addWeighted(gradX, 0.5, gradY, 0.5, 0, edges);
                gradX.delete();
                gradY.delete();
            } else if (mode === 'laplace') {
                cv.Laplacian(blurred, edges, cv.CV_16S, 3, 1, 0, cv.BORDER_DEFAULT);
                cv.convertScaleAbs(edges, edges);
            } else {
                cv.Canny(blurred, edges, lowerThreshold, upperThreshold);
            }

            kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
            cv.morphologyEx(edges, edges, cv.MORPH_CLOSE, kernel);

            contours = new cv.MatVector();
            hierarchy = new cv.Mat();
            cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

            const minArea = (gray.cols * gray.rows) * 0.01;
            const validContours = [];
            
            for (let i = 0; i < contours.size(); i++) {
                const cnt = contours.get(i);
                const area = cv.contourArea(cnt);
                if (area > minArea) {
                    validContours.push({ contour: cnt, area });
                } else {
                    cnt.delete();
                }
            }

            if (validContours.length > 0) {
                validContours.sort((a, b) => b.area - a.area);
                this.contour = validContours[0].contour;
                this.additionalContours = validContours.slice(1).map(v => ({ 
                    contour: v.contour, 
                    area: v.area 
                }));
                
                if (this.grayMat) {
                    this.grayMat.delete();
                }
                this.grayMat = gray.clone();
                
                return {
                    mainContour: this.contour,
                    additionalContours: this.additionalContours,
                    totalContours: validContours.length
                };
            } else {
                throw new Error('لم يتم العثور على حواف واضحة في الصورة');
            }

        } catch (error) {
            console.error('Error in contour detection:', error);
            throw error;
        } finally {
            // تنظيف المصفوفات المؤقتة
            [src, blurred, edges, hierarchy, contours, kernel].forEach(mat => {
                if (mat && mat !== this.grayMat) {
                    mat.delete();
                }
            });
        }
    }

    cleanup() {
        if (this.grayMat) {
            this.grayMat.delete();
            this.grayMat = null;
        }
        if (this.contour) {
            this.contour.delete();
            this.contour = null;
        }
        this.additionalContours.forEach(item => {
            if (item.contour) {
                item.contour.delete();
            }
        });
        this.additionalContours = [];
    }
}
