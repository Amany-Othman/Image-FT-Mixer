import FFT from 'fft.js';

class FourierTransform {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    
    // FFT dimensions MUST be power of 2
    this.fftWidth = this.nextPowerOf2(width);
    this.fftHeight = this.nextPowerOf2(height);
    this.fftSize = this.fftWidth * this.fftHeight;
    
    // FFT results (FULL padded dimensions - needed for mixing!)
    this.complexData = null;
    this.magnitude = null;
    this.phase = null;
    this.real = null;
    this.imaginary = null;
  }

  // Compute 2D FFT from grayscale image data
  compute2DFFT(grayscaleData) {
    const data = new Float64Array(grayscaleData);
    
    // Pad data to power of 2 dimensions
    const paddedData = this.padData(data, this.width, this.height, this.fftWidth, this.fftHeight);
    
    // Perform 2D FFT
    const fftResult = this.fft2D(paddedData, this.fftWidth, this.fftHeight);
    
    // Apply FFT shift (move DC to center) for storage
    const shiftedFFT = this.fftShiftComplex(fftResult, this.fftWidth, this.fftHeight);
    
    // Store SHIFTED results (DC in center - standard for mixing)
    this.complexData = shiftedFFT;
    
    // Compute magnitude, phase, real, imaginary (for display)
    this.computeComponents();
    
    return {
      magnitude: this.magnitude,
      phase: this.phase,
      real: this.real,
      imaginary: this.imaginary
    };
  }

  // 2D FFT implementation
  fft2D(data, width, height) {
    // Create FFT instances
    const fftRow = new FFT(width);
    const fftCol = new FFT(height);
    
    // Complex data storage [real, imag, real, imag, ...]
    const complexData = new Float64Array(width * height * 2);
    
    // Step 1: FFT on each row
    const rowData = new Float64Array(width * 2);
    for (let y = 0; y < height; y++) {
      // Extract row
      for (let x = 0; x < width; x++) {
        rowData[x * 2] = data[y * width + x];
        rowData[x * 2 + 1] = 0;
      }
      
      // Perform FFT on row
      const rowOutput = new Float64Array(width * 2);
      fftRow.transform(rowOutput, rowData);
      
      // Store result
      for (let x = 0; x < width; x++) {
        complexData[y * width * 2 + x * 2] = rowOutput[x * 2];
        complexData[y * width * 2 + x * 2 + 1] = rowOutput[x * 2 + 1];
      }
    }
    
    // Step 2: FFT on each column
    const colData = new Float64Array(height * 2);
    const result = new Float64Array(width * height * 2);
    
    for (let x = 0; x < width; x++) {
      // Extract column
      for (let y = 0; y < height; y++) {
        colData[y * 2] = complexData[y * width * 2 + x * 2];
        colData[y * 2 + 1] = complexData[y * width * 2 + x * 2 + 1];
      }
      
      // Perform FFT on column
      const colOutput = new Float64Array(height * 2);
      fftCol.transform(colOutput, colData);
      
      // Store result
      for (let y = 0; y < height; y++) {
        result[y * width * 2 + x * 2] = colOutput[y * 2];
        result[y * width * 2 + x * 2 + 1] = colOutput[y * 2 + 1];
      }
    }
    
    return result;
  }

  // FIXED: FFT shift for complex data (shifts DC to center)
  fftShiftComplex(complexData, width, height) {
    const shifted = new Float64Array(complexData.length);
    const halfW = Math.floor(width / 2);
    const halfH = Math.floor(height / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const newX = (x + halfW) % width;
        const newY = (y + halfH) % height;
        
        const oldIdx = (y * width + x) * 2;
        const newIdx = (newY * width + newX) * 2;
        
        shifted[newIdx] = complexData[oldIdx];
        shifted[newIdx + 1] = complexData[oldIdx + 1];
      }
    }
    
    return shifted;
  }

  // FIXED: Compute magnitude, phase, real, imaginary from FULL complex data
  computeComponents() {
    // Use FULL FFT dimensions (not cropped)
    const size = this.fftWidth * this.fftHeight;
    
    this.magnitude = new Float64Array(size);
    this.phase = new Float64Array(size);
    this.real = new Float64Array(size);
    this.imaginary = new Float64Array(size);
    
    // Extract from FULL complex data
    for (let i = 0; i < size; i++) {
      const real = this.complexData[i * 2];
      const imag = this.complexData[i * 2 + 1];
      
      this.real[i] = real;
      this.imaginary[i] = imag;
      this.magnitude[i] = Math.sqrt(real * real + imag * imag);
      this.phase[i] = Math.atan2(imag, real);
    }
  }

  // Get magnitude as displayable image (crop to original size)
  getMagnitudeDisplay() {
    if (!this.magnitude) return null;
    
    // Crop to original dimensions
    const cropped = this.cropToOriginalSize(this.magnitude);
    
    // Apply log scale for better visualization
    const display = new Float64Array(cropped.length);
    for (let i = 0; i < cropped.length; i++) {
      display[i] = Math.log(1 + cropped[i]);
    }
    
    return this.normalizeForDisplay(display);
  }

  // Get phase as displayable image (crop to original size)
  getPhaseDisplay() {
    if (!this.phase) return null;
    const cropped = this.cropToOriginalSize(this.phase);
    return this.normalizeForDisplay(cropped);
  }

  // Get real component as displayable image (crop to original size)
  getRealDisplay() {
    if (!this.real) return null;
    const cropped = this.cropToOriginalSize(this.real);
    return this.normalizeForDisplay(cropped);
  }

  // Get imaginary component as displayable image (crop to original size)
  getImaginaryDisplay() {
    if (!this.imaginary) return null;
    const cropped = this.cropToOriginalSize(this.imaginary);
    return this.normalizeForDisplay(cropped);
  }

  // NEW: Crop FFT data from padded size to original image size
  cropToOriginalSize(data) {
    const cropped = new Float64Array(this.width * this.height);
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const srcIdx = y * this.fftWidth + x;
        const dstIdx = y * this.width + x;
        cropped[dstIdx] = data[srcIdx];
      }
    }
    
    return cropped;
  }

  // REMOVED: Old fftShift - we now shift during FFT computation

  // Normalize data to 0-255 range
  normalizeForDisplay(data) {
    let min = Infinity;
    let max = -Infinity;
    
    for (let i = 0; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }
    
    const normalized = new Uint8ClampedArray(data.length);
    const range = max - min;
    
    if (range === 0) {
      normalized.fill(128); // FIXED: Fill with gray instead of black
      return normalized;
    }
    
    for (let i = 0; i < data.length; i++) {
      normalized[i] = Math.floor(((data[i] - min) / range) * 255);
    }
    
    return normalized;
  }

  // Pad data to power of 2 dimensions
  padData(data, width, height, newWidth, newHeight) {
    const padded = new Float64Array(newWidth * newHeight);
    
    // Zero-padding (zeros are already there from initialization)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        padded[y * newWidth + x] = data[y * width + x];
      }
    }
    
    return padded;
  }

  // Find next power of 2
  nextPowerOf2(n) {
    if (n <= 1) return 2;
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }

  // Apply brightness/contrast to a component display
  applyBrightnessContrast(componentData, brightness, contrast) {
    if (!componentData) return null;
    
    const adjusted = new Uint8ClampedArray(componentData.length);
    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    
    for (let i = 0; i < componentData.length; i++) {
      let pixel = componentData[i];
      pixel = contrastFactor * (pixel - 128) + 128;
      pixel = pixel + brightness;
      adjusted[i] = Math.max(0, Math.min(255, pixel));
    }
    
    return adjusted;
  }

  // Get component with brightness/contrast applied
  getComponentWithAdjustments(componentType, brightness, contrast) {
    let componentData = null;
    
    switch (componentType) {
      case 'magnitude':
        componentData = this.getMagnitudeDisplay();
        break;
      case 'phase':
        componentData = this.getPhaseDisplay();
        break;
      case 'real':
        componentData = this.getRealDisplay();
        break;
      case 'imaginary':
        componentData = this.getImaginaryDisplay();
        break;
      default:
        return null;
    }
    
    if (!componentData) return null;
    
    if (brightness !== 0 || contrast !== 0) {
      return this.applyBrightnessContrast(componentData, brightness, contrast);
    }
    
    return componentData;
  }

  hasFFT() {
    return this.complexData !== null;
  }
}

export default FourierTransform;