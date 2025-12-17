// FourierMixer.js - Complete FFT mixing logic with region selection

import FFT from 'fft.js';

class FourierMixer {
  constructor() {
    this.processors = [];
    this.mixMode = 'magnitude-phase';
    this.weights = [0.25, 0.25, 0.25, 0.25];
    this.regionConfig = null;
  }

  // ==================== CONFIGURATION ====================
  
  /**
   * Set the image processors to mix
   * @param {Array<ImageProcessor>} processors - Array of processors with FFT data
   */
  setProcessors(processors) {
    this.processors = processors.filter(p => p && p.hasFFT());
    console.log(`Set ${this.processors.length} processors for mixing`);
  }

  /**
   * Set the mixing mode
   * @param {string} mode - 'magnitude-phase' or 'real-imaginary'
   */
  setMixMode(mode) {
    if (mode !== 'magnitude-phase' && mode !== 'real-imaginary') {
      console.warn(`Invalid mix mode: ${mode}. Using magnitude-phase.`);
      this.mixMode = 'magnitude-phase';
    } else {
      this.mixMode = mode;
    }
    console.log(`Mix mode set to: ${this.mixMode}`);
  }

  /**
   * Set mixing weights for each processor
   * Automatically normalizes weights to sum to 1.0
   * @param {Array<number>} weights - Weight for each processor
   */
  setWeights(weights) {
    if (weights.length !== this.processors.length && this.processors.length > 0) {
      console.warn(`Weight count (${weights.length}) doesn't match processor count (${this.processors.length})`);
    }
    
    // Normalize weights to sum to 1.0
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum === 0) {
      console.warn('All weights are zero, using equal weights');
      this.weights = weights.map(() => 1.0 / weights.length);
    } else {
      this.weights = weights.map(w => w / sum);
    }
    console.log('Normalized weights:', this.weights);
  }

  /**
   * Set region selection configuration
   * @param {Object} config - Region configuration
   * @param {boolean} config.enabled - Whether region filtering is enabled
   * @param {string} config.type - 'inner' or 'outer'
   * @param {number} config.size - Region size as percentage (0-100)
   */
  setRegionConfig(config) {
    this.regionConfig = config;
    console.log('Region config:', config);
  }

  // ==================== MIXING ====================
  
  /**
   * Mix the configured processors
   * @returns {Object} Mixed image data with width and height
   * @throws {Error} If no processors or dimension mismatch
   */
  mix() {
    if (this.processors.length === 0) {
      throw new Error('No images with FFT data to mix');
    }

    const width = this.processors[0].width;
    const height = this.processors[0].height;
    const fftWidth = this.processors[0].fft.fftWidth;
    const fftHeight = this.processors[0].fft.fftHeight;

    // Check all same dimensions
    for (let proc of this.processors) {
      if (proc.width !== width || proc.height !== height) {
        throw new Error('All images must have the same dimensions');
      }
    }

    console.log(`Mixing ${this.processors.length} images in ${this.mixMode} mode`);

    let mixedComplexData;

    if (this.mixMode === 'magnitude-phase') {
      mixedComplexData = this.mixMagnitudePhase(fftWidth, fftHeight);
    } else {
      mixedComplexData = this.mixRealImaginary(fftWidth, fftHeight);
    }

    // Perform inverse FFT
    const outputImage = this.performIFFT(mixedComplexData, fftWidth, fftHeight, width, height);

    return {
      imageData: outputImage,
      width: width,
      height: height
    };
  }

  // ==================== MAGNITUDE/PHASE MIXING ====================
  
  /**
   * Mix using magnitude and phase components
   * Uses weighted average for magnitude and circular mean for phase
   * @param {number} fftWidth - FFT width
   * @param {number} fftHeight - FFT height
   * @returns {Float64Array} Mixed complex data
   */
  mixMagnitudePhase(fftWidth, fftHeight) {
    const size = fftWidth * fftHeight;
    const mixedComplex = new Float64Array(size * 2);

    console.log('Mixing Magnitude/Phase mode');

    // Create region mask if enabled
    const regionMask = this.regionConfig && this.regionConfig.enabled
      ? this.createRegionMask(fftWidth, fftHeight)
      : null;

    for (let i = 0; i < size; i++) {
      // Check if this frequency should be included
      if (regionMask && !regionMask[i]) {
        // Outside selected region - set to zero
        mixedComplex[i * 2] = 0;
        mixedComplex[i * 2 + 1] = 0;
        continue;
      }

      let mixedMagnitude = 0;
      let sumCosPhase = 0;
      let sumSinPhase = 0;

      // Weighted sum of magnitude and circular mean of phase
      for (let j = 0; j < this.processors.length; j++) {
        const fft = this.processors[j].fft;
        const weight = this.weights[j];

        if (weight === 0) continue;

        const real = fft.complexData[i * 2];
        const imag = fft.complexData[i * 2 + 1];

        const magnitude = Math.sqrt(real * real + imag * imag);
        const phase = Math.atan2(imag, real);

        mixedMagnitude += magnitude * weight;
        sumCosPhase += Math.cos(phase) * weight;
        sumSinPhase += Math.sin(phase) * weight;
      }

      // Circular mean for phase
      const mixedPhase = Math.atan2(sumSinPhase, sumCosPhase);

      // Convert back to complex form
      const real = mixedMagnitude * Math.cos(mixedPhase);
      const imag = mixedMagnitude * Math.sin(mixedPhase);

      mixedComplex[i * 2] = real;
      mixedComplex[i * 2 + 1] = imag;
    }

    return mixedComplex;
  }

  // ==================== REAL/IMAGINARY MIXING ====================
  
  /**
   * Mix using real and imaginary components
   * Uses simple weighted average
   * @param {number} fftWidth - FFT width
   * @param {number} fftHeight - FFT height
   * @returns {Float64Array} Mixed complex data
   */
  mixRealImaginary(fftWidth, fftHeight) {
    const size = fftWidth * fftHeight;
    const mixedComplex = new Float64Array(size * 2);

    console.log('Mixing Real/Imaginary mode');

    // Create region mask if enabled
    const regionMask = this.regionConfig && this.regionConfig.enabled
      ? this.createRegionMask(fftWidth, fftHeight)
      : null;

    for (let i = 0; i < size; i++) {
      // Check if this frequency should be included
      if (regionMask && !regionMask[i]) {
        mixedComplex[i * 2] = 0;
        mixedComplex[i * 2 + 1] = 0;
        continue;
      }

      let mixedReal = 0;
      let mixedImag = 0;

      for (let j = 0; j < this.processors.length; j++) {
        const fft = this.processors[j].fft;
        const weight = this.weights[j];

        if (weight === 0) continue;

        mixedReal += fft.complexData[i * 2] * weight;
        mixedImag += fft.complexData[i * 2 + 1] * weight;
      }

      mixedComplex[i * 2] = mixedReal;
      mixedComplex[i * 2 + 1] = mixedImag;
    }

    return mixedComplex;
  }

  // ==================== REGION SELECTION ====================
  
  /**
   * Create a mask for region selection (inner or outer frequencies)
   * @param {number} width - FFT width
   * @param {number} height - FFT height
   * @returns {Uint8Array} Binary mask (1 = include, 0 = exclude)
   */
  createRegionMask(width, height) {
    const mask = new Uint8Array(width * height);
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    
    // Calculate region size in pixels
    const regionPercent = this.regionConfig.size / 100;
    const regionWidth = Math.floor(width * regionPercent / 2);
    const regionHeight = Math.floor(height * regionPercent / 2);

    console.log('Creating region mask:', {
      type: this.regionConfig.type,
      size: this.regionConfig.size,
      regionWidth,
      regionHeight
    });

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        // Distance from center
        const dx = Math.abs(x - centerX);
        const dy = Math.abs(y - centerY);
        
        // Check if inside rectangle
        const insideRect = dx <= regionWidth && dy <= regionHeight;
        
        // Set mask based on region type
        if (this.regionConfig.type === 'inner') {
          mask[idx] = insideRect ? 1 : 0;
        } else { // outer
          mask[idx] = insideRect ? 0 : 1;
        }
      }
    }

    return mask;
  }

  // ==================== INVERSE FFT ====================
  
  /**
   * Apply IFFT shift to move zero frequency from center to corners
   * @param {Float64Array} complexData - Complex frequency data
   * @param {number} width - Data width
   * @param {number} height - Data height
   * @returns {Float64Array} Shifted data
   */
  ifftShift(complexData, width, height) {
    const shifted = new Float64Array(complexData.length);
    const halfW = Math.floor(width / 2);
    const halfH = Math.floor(height / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Reverse of fftshift
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

  /**
   * Perform 2D Inverse FFT to convert frequency domain back to spatial domain
   * @param {Float64Array} complexData - Complex frequency data
   * @param {number} fftWidth - FFT width
   * @param {number} fftHeight - FFT height
   * @param {number} outputWidth - Output image width
   * @param {number} outputHeight - Output image height
   * @returns {Uint8ClampedArray} Spatial domain image data (0-255)
   */
  performIFFT(complexData, fftWidth, fftHeight, outputWidth, outputHeight) {
    console.log('Starting IFFT:', { fftWidth, fftHeight, outputWidth, outputHeight });

    // Apply ifftshift BEFORE ifft
    const shiftedData = this.ifftShift(complexData, fftWidth, fftHeight);

    const fftRow = new FFT(fftWidth);
    const fftCol = new FFT(fftHeight);

    // Step 1: IFFT on each column
    const colData = new Float64Array(fftHeight * 2);
    const afterCols = new Float64Array(fftWidth * fftHeight * 2);

    for (let x = 0; x < fftWidth; x++) {
      // Extract column
      for (let y = 0; y < fftHeight; y++) {
        colData[y * 2] = shiftedData[y * fftWidth * 2 + x * 2];
        colData[y * 2 + 1] = shiftedData[y * fftWidth * 2 + x * 2 + 1];
      }

      // Perform IFFT
      const colOutput = new Float64Array(fftHeight * 2);
      fftCol.inverseTransform(colOutput, colData);

      // Store result
      for (let y = 0; y < fftHeight; y++) {
        afterCols[y * fftWidth * 2 + x * 2] = colOutput[y * 2];
        afterCols[y * fftWidth * 2 + x * 2 + 1] = colOutput[y * 2 + 1];
      }
    }

    // Step 2: IFFT on each row
    const rowData = new Float64Array(fftWidth * 2);
    const result = new Float64Array(fftWidth * fftHeight * 2);

    for (let y = 0; y < fftHeight; y++) {
      // Extract row
      for (let x = 0; x < fftWidth; x++) {
        rowData[x * 2] = afterCols[y * fftWidth * 2 + x * 2];
        rowData[x * 2 + 1] = afterCols[y * fftWidth * 2 + x * 2 + 1];
      }

      // Perform IFFT
      const rowOutput = new Float64Array(fftWidth * 2);
      fftRow.inverseTransform(rowOutput, rowData);

      // Store result
      for (let x = 0; x < fftWidth; x++) {
        result[y * fftWidth * 2 + x * 2] = rowOutput[x * 2];
        result[y * fftWidth * 2 + x * 2 + 1] = rowOutput[x * 2 + 1];
      }
    }

    // Convert complex result to grayscale image
    return this.complexToGrayscale(result, fftWidth, fftHeight, outputWidth, outputHeight);
  }

  /**
   * Convert complex IFFT result to grayscale image
   * Takes only the real part and normalizes to 0-255
   * @param {Float64Array} complexResult - Complex IFFT result
   * @param {number} fftWidth - FFT width
   * @param {number} fftHeight - FFT height
   * @param {number} outputWidth - Output width
   * @param {number} outputHeight - Output height
   * @returns {Uint8ClampedArray} Grayscale image (0-255)
   */
  complexToGrayscale(complexResult, fftWidth, fftHeight, outputWidth, outputHeight) {
    const imageData = new Uint8ClampedArray(outputWidth * outputHeight);
    
    // Extract real parts (imaginary should be near zero for real images)
    const realValues = [];
    for (let y = 0; y < outputHeight; y++) {
      for (let x = 0; x < outputWidth; x++) {
        const idx = y * fftWidth + x;
        const real = complexResult[idx * 2];
        realValues.push(real);
      }
    }

    // Find min/max without spread operator (avoids stack overflow)
    let min = realValues[0];
    let max = realValues[0];
    for (let i = 1; i < realValues.length; i++) {
      if (realValues[i] < min) min = realValues[i];
      if (realValues[i] > max) max = realValues[i];
    }
    
    const range = max - min;

    console.log('IFFT real value range:', { min, max, range });

    if (range === 0 || !isFinite(range)) {
      console.warn('Invalid range, filling with gray');
      imageData.fill(128);
      return imageData;
    }

    // Normalize to 0-255
    for (let i = 0; i < realValues.length; i++) {
      const normalized = ((realValues[i] - min) / range) * 255;
      imageData[i] = Math.max(0, Math.min(255, Math.round(normalized)));
    }

    // Log statistics
    const sampleValues = Array.from(imageData.slice(0, 20));
    let sum = 0;
    let minVal = imageData[0];
    let maxVal = imageData[0];
    
    for (let i = 0; i < imageData.length; i++) {
      sum += imageData[i];
      if (imageData[i] < minVal) minVal = imageData[i];
      if (imageData[i] > maxVal) maxVal = imageData[i];
    }
    
    const avg = sum / imageData.length;
    
    console.log('Output statistics:', { 
      sample: sampleValues, 
      average: avg.toFixed(2),
      min: minVal,
      max: maxVal
    });

    return imageData;
  }

  // ==================== UTILITY ====================
  
  /**
   * Check if mixing is possible
   * @returns {boolean} True if at least one processor has FFT data
   */
  canMix() {
    return this.processors.length > 0;
  }

  /**
   * Get number of processors ready for mixing
   * @returns {number} Count of processors with FFT
   */
  getProcessorCount() {
    return this.processors.length;
  }

  /**
   * Get current configuration
   * @returns {Object} Current mixer configuration
   */
  getConfig() {
    return {
      mixMode: this.mixMode,
      weights: [...this.weights],
      regionConfig: this.regionConfig ? { ...this.regionConfig } : null,
      processorCount: this.processors.length
    };
  }
}

export default FourierMixer;