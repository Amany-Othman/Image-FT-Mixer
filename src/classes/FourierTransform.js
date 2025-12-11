

import FFT from 'fft.js';

class FourierTransform {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    
    // FFT dimensions MUST be power of 2
    this.fftWidth = this.nextPowerOf2(width);
    this.fftHeight = this.nextPowerOf2(height);
    this.fftSize = this.fftWidth * this.fftHeight;
    
    // FFT results
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
    
    // Store results
    this.complexData = fftResult;
    
    // Compute magnitude, phase, real, imaginary
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

  // Compute magnitude, phase, real, imaginary from complex data
  computeComponents() {
    // Use original dimensions for display (crop padded area)
    const size = this.width * this.height;
    
    this.magnitude = new Float64Array(size);
    this.phase = new Float64Array(size);
    this.real = new Float64Array(size);
    this.imaginary = new Float64Array(size);
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const fftIdx = y * this.fftWidth + x;
        const displayIdx = y * this.width + x;
        
        const real = this.complexData[fftIdx * 2];
        const imag = this.complexData[fftIdx * 2 + 1];
        
        this.real[displayIdx] = real;
        this.imaginary[displayIdx] = imag;
        this.magnitude[displayIdx] = Math.sqrt(real * real + imag * imag);
        this.phase[displayIdx] = Math.atan2(imag, real);
      }
    }
  }

  // Get magnitude as displayable image
  getMagnitudeDisplay() {
    if (!this.magnitude) return null;
    
    const display = new Float64Array(this.magnitude.length);
    const shifted = this.fftShift(this.magnitude, this.width, this.height);
    
    for (let i = 0; i < shifted.length; i++) {
      display[i] = Math.log(1 + shifted[i]);
    }
    
    return this.normalizeForDisplay(display);
  }

  // Get phase as displayable image
  getPhaseDisplay() {
    if (!this.phase) return null;
    const shifted = this.fftShift(this.phase, this.width, this.height);
    return this.normalizeForDisplay(shifted);
  }

  // Get real component as displayable image
  getRealDisplay() {
    if (!this.real) return null;
    const shifted = this.fftShift(this.real, this.width, this.height);
    return this.normalizeForDisplay(shifted);
  }

  // Get imaginary component as displayable image
  getImaginaryDisplay() {
    if (!this.imaginary) return null;
    const shifted = this.fftShift(this.imaginary, this.width, this.height);
    return this.normalizeForDisplay(shifted);
  }

  // Shift zero frequency to center
  fftShift(data, width, height) {
    const shifted = new Float64Array(data.length);
    const halfW = Math.floor(width / 2);
    const halfH = Math.floor(height / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const newX = (x + halfW) % width;
        const newY = (y + halfH) % height;
        shifted[newY * width + newX] = data[y * width + x];
      }
    }
    
    return shifted;
  }

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
      normalized.fill(0);
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