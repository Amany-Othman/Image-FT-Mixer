// ImageProcessor.js - Complete image processing logic
import FourierTransform from './FourierTransform';

class ImageProcessor {
  constructor() {
    this.rawImageData = null;      // Original image
    this.grayscaleData = null;     // Converted grayscale
    this.width = 0;
    this.height = 0;
    this.fft = null; 
    this.brightness = 0;    // -100 to 100
    this.contrast = 0;      // -100 to 100
    this.originalGrayscale = null;  // Store original for reset
  }

  // ==================== IMAGE LOADING ====================
  
  /**
   * Load image from file
   * @param {File} file - Image file to load
   * @returns {Promise<Object>} Image metadata
   */
  async loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          // Create canvas to extract pixel data
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw image on canvas
          ctx.drawImage(img, 0, 0);
          
          // Get pixel data
          this.rawImageData = ctx.getImageData(0, 0, img.width, img.height);
          this.width = img.width;
          this.height = img.height;
          
          // Convert to grayscale immediately
          this.convertToGrayscale();
          this.originalGrayscale = new Uint8ClampedArray(this.grayscaleData);
          
          resolve({
            width: this.width,
            height: this.height,
            grayscale: this.grayscaleData
          });
        };
        
        img.onerror = reject;
        img.src = e.target.result;
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ==================== COLOR CONVERSION ====================
  
  /**
   * Convert colored image to grayscale using luminosity method
   */
  convertToGrayscale() {
    if (!this.rawImageData) return;
    
    const data = this.rawImageData.data;
    const grayscale = new Uint8ClampedArray(this.width * this.height);
    
    // Loop through pixels
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];     // Red
      const g = data[i + 1]; // Green
      const b = data[i + 2]; // Blue
      
      // Grayscale formula (luminosity method)
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      grayscale[i / 4] = gray;
    }
    
    this.grayscaleData = grayscale;
  }

  // ==================== IMAGE RESIZING ====================
  
  /**
   * Resize image to new dimensions using nearest neighbor
   * @param {number} newWidth - Target width
   * @param {number} newHeight - Target height
   */
  resize(newWidth, newHeight) {
    if (!this.grayscaleData) return;
    
    const resized = new Uint8ClampedArray(newWidth * newHeight);
    
    const xRatio = this.width / newWidth;
    const yRatio = this.height / newHeight;
    
    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const srcX = Math.floor(x * xRatio);
        const srcY = Math.floor(y * yRatio);
        
        const srcIdx = srcY * this.width + srcX;
        const dstIdx = y * newWidth + x;
        
        resized[dstIdx] = this.grayscaleData[srcIdx];
      }
    }
    
    this.grayscaleData = resized;
    this.originalGrayscale = new Uint8ClampedArray(resized);
    this.width = newWidth;
    this.height = newHeight;

    // Reset adjustments after resize
    this.brightness = 0;
    this.contrast = 0;
  }

  // ==================== BRIGHTNESS/CONTRAST ADJUSTMENTS ====================
  
  /**
   * Adjust brightness by delta
   * @param {number} delta - Change in brightness (-100 to 100)
   */
  adjustBrightness(delta) {
    this.brightness = Math.max(-100, Math.min(100, this.brightness + delta));
    this.applyAdjustments();
  }

  /**
   * Adjust contrast by delta
   * @param {number} delta - Change in contrast (-100 to 100)
   */
  adjustContrast(delta) {
    this.contrast = Math.max(-100, Math.min(100, this.contrast + delta));
    this.applyAdjustments();
  }

  /**
   * Set brightness and contrast directly
   * @param {number} brightness - Brightness value (-100 to 100)
   * @param {number} contrast - Contrast value (-100 to 100)
   */
  setBrightnessContrast(brightness, contrast) {
    this.brightness = Math.max(-100, Math.min(100, brightness));
    this.contrast = Math.max(-100, Math.min(100, contrast));
    this.applyAdjustments();
  }

  /**
   * Apply brightness and contrast adjustments to image
   * Always works from original data to avoid cumulative errors
   */
  applyAdjustments() {
    if (!this.originalGrayscale) return;
    
    // Work from original data
    this.grayscaleData = new Uint8ClampedArray(this.originalGrayscale);
    
    // Calculate contrast factor
    const contrastFactor = (259 * (this.contrast + 255)) / (255 * (259 - this.contrast));
    
    // Apply brightness and contrast
    for (let i = 0; i < this.grayscaleData.length; i++) {
      let pixel = this.grayscaleData[i];
      
      // Apply contrast
      pixel = contrastFactor * (pixel - 128) + 128;
      
      // Apply brightness
      pixel = pixel + this.brightness;
      
      // Clamp to 0-255
      this.grayscaleData[i] = Math.max(0, Math.min(255, pixel));
    }
  }

  /**
   * Reset brightness and contrast to defaults
   */
  resetAdjustments() {
    this.brightness = 0;
    this.contrast = 0;
    if (this.originalGrayscale) {
      this.grayscaleData = new Uint8ClampedArray(this.originalGrayscale);
    }
  }

  /**
   * Get current adjustment values
   * @returns {Object} Current brightness and contrast
   */
  getAdjustments() {
    return {
      brightness: this.brightness,
      contrast: this.contrast
    };
  }

  // ==================== FFT COMPUTATION ====================
  
  /**
   * Compute FFT for the current image
   * @returns {FourierTransform} FFT instance
   */
  computeFFT() {
    if (!this.grayscaleData) {
      console.warn('No grayscale data to compute FFT');
      return;
    }
    
    // Create FFT instance
    this.fft = new FourierTransform(this.width, this.height);
    
    // Compute FFT
    this.fft.compute2DFFT(this.grayscaleData);
    
    return this.fft;
  }

  /**
   * Check if FFT has been computed
   * @returns {boolean} True if FFT exists
   */
  hasFFT() {
    return this.fft !== null && this.fft.hasFFT();
  }

  // ==================== FFT COMPONENT RETRIEVAL ====================
  
  /**
   * Get FFT component for display
   * @param {string} componentType - Type: 'magnitude', 'phase', 'real', 'imaginary'
   * @returns {Uint8ClampedArray|null} Display data
   */
  getFFTComponent(componentType) {
    if (!this.fft) {
      console.warn('FFT not computed yet');
      return null;
    }
    
    switch (componentType) {
      case 'magnitude':
        return this.fft.getMagnitudeDisplay();
      case 'phase':
        return this.fft.getPhaseDisplay();
      case 'real':
        return this.fft.getRealDisplay();
      case 'imaginary':
        return this.fft.getImaginaryDisplay();
      default:
        return null;
    }
  }

  /**
   * Get FFT component with brightness/contrast adjustments
   * @param {string} componentType - Component type
   * @param {number} brightness - Brightness adjustment
   * @param {number} contrast - Contrast adjustment
   * @returns {Uint8ClampedArray|null} Adjusted display data
   */
  getFFTComponentWithAdjustments(componentType, brightness, contrast) {
    if (!this.fft) {
      console.warn('FFT not computed yet');
      return null;
    }
    
    return this.fft.getComponentWithAdjustments(componentType, brightness, contrast);
  }

  // ==================== IMAGE DATA RETRIEVAL ====================
  
  /**
   * Get grayscale image as ImageData for canvas display
   * @returns {ImageData|null} Image data for rendering
   */
  getGrayscaleImageData() {
    if (!this.grayscaleData) return null;
    
    const imageData = new ImageData(this.width, this.height);
    const data = imageData.data;
    
    for (let i = 0; i < this.grayscaleData.length; i++) {
      const gray = this.grayscaleData[i];
      const idx = i * 4;
      
      data[idx] = gray;      // Red
      data[idx + 1] = gray;  // Green
      data[idx + 2] = gray;  // Blue
      data[idx + 3] = 255;   // Alpha (fully opaque)
    }
    
    return imageData;
  }

  /**
   * Get grayscale data as Uint8ClampedArray
   * @returns {Uint8ClampedArray|null} Raw grayscale data
   */
  getGrayscaleData() {
    return this.grayscaleData;
  }

  /**
   * Convert Uint8ClampedArray to ImageData for canvas rendering
   * @param {Uint8ClampedArray} data - Grayscale pixel data
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {ImageData} Canvas-ready image data
   */
  static arrayToImageData(data, width, height) {
    const imageData = new ImageData(width, height);
    const pixels = imageData.data;
    
    for (let i = 0; i < data.length; i++) {
      const gray = data[i];
      const idx = i * 4;
      
      pixels[idx] = gray;      // Red
      pixels[idx + 1] = gray;  // Green
      pixels[idx + 2] = gray;  // Blue
      pixels[idx + 3] = 255;   // Alpha
    }
    
    return imageData;
  }

  // ==================== STATE CHECKS ====================
  
  /**
   * Check if processor has an image loaded
   * @returns {boolean} True if image exists
   */
  hasImage() {
    return this.grayscaleData !== null;
  }

  /**
   * Get image dimensions
   * @returns {Object} Width and height
   */
  getDimensions() {
    return {
      width: this.width,
      height: this.height
    };
  }
}

export default ImageProcessor;