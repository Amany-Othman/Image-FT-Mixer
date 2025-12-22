// FourierMixer.js - Complete FFT mixing logic with region selection

import FFT from 'fft.js';

class FourierMixer {
  constructor() {
     // Array of image processors (each containing FFT data)
    this.processors = [];
    this.mixMode = 'magnitude-phase';// Default mixing mode: magnitude + phase
    this.weights = [0.25, 0.25, 0.25, 0.25];
    this.regionConfig = null;// Region selection configuration
    // Used to select low/high frequency regions in FFT
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
      // Defensive check: if an invalid mode is provided, default to 'magnitude-phase'
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
    // Warn if number of weights does not match number of processors
    if (weights.length !== this.processors.length && this.processors.length > 0) {
      console.warn(`Weight count (${weights.length}) doesn't match processor count (${this.processors.length})`);
    }
     // Normalize weights to sum to 1.0
    // Calculate the sum of the provided weights
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum === 0) {
      // If all weights are zero, assign equal weights to all processors
      console.warn('All weights are zero, using equal weights');
      this.weights = weights.map(() => 1.0 / weights.length);
    } else {
      // Normalize weights so that their sum = 1
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
    this.regionConfig = config;// Store the region configuration for later use during FFT mixing
    console.log('Region config:', config);
  }

  // ==================== MIXING ====================
  
  /**
   * Mix the configured processors
   * @returns {Object} Mixed image data with width and height
   * @throws {Error} If no processors or dimension mismatch
   */
  mix() {
    // 1️⃣ Check if there are any image processors set for mixing
    if (this.processors.length === 0) {
      throw new Error('No images with FFT data to mix');
    }
// 2️⃣ Get reference dimensions from the first image
    const width = this.processors[0].width;// Image width (spatial domain)
    const height = this.processors[0].height;// Image height (spatial domain)
    const fftWidth = this.processors[0].fft.fftWidth;// FFT width (frequency domain)
    const fftHeight = this.processors[0].fft.fftHeight;// FFT height (frequency domain)

    // Check all same dimensions
    // 3️⃣ Verify that all images have the same dimensions
    for (let proc of this.processors) {
      if (proc.width !== width || proc.height !== height) {
        throw new Error('All images must have the same dimensions');
      }
    }
 // 4️⃣ Log the mixing action for debugging purposes
    console.log(`Mixing ${this.processors.length} images in ${this.mixMode} mode`);

    let mixedComplexData;
// 5️⃣ Apply the appropriate mixing method based on the current mode
    if (this.mixMode === 'magnitude-phase') {
      // Mix using magnitude and phase components
      mixedComplexData = this.mixMagnitudePhase(fftWidth, fftHeight);
    } else {
      // Mix using real and imaginary components
      mixedComplexData = this.mixRealImaginary(fftWidth, fftHeight);
    }

     // 6️⃣ Perform the inverse FFT to convert back to spatial domain
    const outputImage = this.performIFFT(
      mixedComplexData, // mixed complex data from frequency domain
      fftWidth,         // width in frequency domain
      fftHeight,        // height in frequency domain
      width,            // final output image width
      height            // final output image height
    );
    return { // 7️⃣ Return the final mixed image with its dimensions
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
    const size = fftWidth * fftHeight;// Total number of frequency components in the FFT
    const mixedComplex = new Float64Array(size * 2); // Create output array for mixed FFT data
    // Each frequency has a real and imaginary part, so size * 2

    console.log('Mixing Magnitude/Phase mode');


    // Create region mask if region filtering is enabled
    // regionMask[i] = true if this frequency should be included
    const regionMask = this.regionConfig && this.regionConfig.enabled
      ? this.createRegionMask(fftWidth, fftHeight)
      : null;

    // Loop through all frequency components
    for (let i = 0; i < size; i++) {

      // If region filtering is enabled, skip frequencies outside the selected region
      if (regionMask && !regionMask[i]) {
        // Outside selected region - set to zero
        mixedComplex[i * 2] = 0; // Real part = 0
        mixedComplex[i * 2 + 1] = 0; // imag part = 0
        continue;   // Skip to next frequency
      }

      let mixedMagnitude = 0;// Weighted sum of magnitudes
      let sumCosPhase = 0;  // Sum of cosines of phases (for circular mean)
      let sumSinPhase = 0;

      

      // Loop through all processors (images) to accumulate their contribution
      for (let j = 0; j < this.processors.length; j++) {
        const fft = this.processors[j].fft;// FFT data of current image
        const weight = this.weights[j];  // Weight for current image

        if (weight === 0) continue;// Skip if weight is zero

        const real = fft.complexData[i * 2];// Real part of this frequency
        const imag = fft.complexData[i * 2 + 1];

        const magnitude = Math.sqrt(real * real + imag * imag);
        const phase = Math.atan2(imag, real);

        mixedMagnitude += magnitude * weight;// Accumulate weighted magnitude

        // Accumulate weighted cosine and sine for circular mean of phase
        sumCosPhase += Math.cos(phase) * weight;
        sumSinPhase += Math.sin(phase) * weight;
      }

       // Compute circular mean of phase for this frequency
      // atan2(sumSin, sumCos) gives the average phase taking angle wrap-around into account
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
  // Total number of frequency components
  const size = fftWidth * fftHeight;

  // Create array to store mixed FFT: size * 2 because each component has real + imag
  const mixedComplex = new Float64Array(size * 2);

  // Log to console for debugging
  console.log('Mixing Real/Imaginary mode');

  // Create region mask if region filtering is enabled
  // regionMask[i] = true → include frequency, false → exclude
  const regionMask = this.regionConfig && this.regionConfig.enabled
    ? this.createRegionMask(fftWidth, fftHeight)
    : null;

  // Loop over all frequency components
  for (let i = 0; i < size; i++) {
    // Skip frequencies outside selected region
    if (regionMask && !regionMask[i]) {
      mixedComplex[i * 2] = 0;       // real part = 0
      mixedComplex[i * 2 + 1] = 0;   // imag part = 0
      continue;
    }

    // Initialize accumulators for real and imaginary parts
    let mixedReal = 0;
    let mixedImag = 0;

    // Loop over all image processors
    for (let j = 0; j < this.processors.length; j++) {
      const fft = this.processors[j].fft; // Get FFT data of the j-th processor
      const weight = this.weights[j];     // Weight for this processor

      // Skip if weight is zero
      if (weight === 0) continue;

      // Add weighted real and imaginary values
      mixedReal += fft.complexData[i * 2] * weight;       // Real part
      mixedImag += fft.complexData[i * 2 + 1] * weight;  // Imaginary part
    }

    // Store the mixed values back to the complex array
    mixedComplex[i * 2] = mixedReal;
    mixedComplex[i * 2 + 1] = mixedImag;
  }

  // Return the final mixed FFT array
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
    // Initialize mask array with all zeros (size = width * height)
    const mask = new Uint8Array(width * height);
    // Determine the center coordinates of the FFT
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    
    // Calculate the size of the selection region based on percentage
    const regionPercent = this.regionConfig.size / 100; // convert 0-100% to 0-1
    const regionWidth = Math.floor(width * regionPercent / 2);// half-width of rectangle
    const regionHeight = Math.floor(height * regionPercent / 2);

    // The rectangle is centered at (centerX, centerY)
    // Half-width/height because we'll compare distances from center

    console.log('Creating region mask:', {
      type: this.regionConfig.type,
      size: this.regionConfig.size,
      regionWidth,
      regionHeight
    });

    // Loop through all FFT coordinates (x = column, y = row)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        // Distance from center
        const dx = Math.abs(x - centerX);
        const dy = Math.abs(y - centerY);
        
        // Check if this coordinate is inside the rectangle region
        const insideRect = dx <= regionWidth && dy <= regionHeight;
        
        // Set mask based on region type
        if (this.regionConfig.type === 'inner') {// Inner: include frequencies inside rectangle
          mask[idx] = insideRect ? 1 : 0;
        } else {// Outer: include frequencies outside rectangle
          mask[idx] = insideRect ? 0 : 1;
        }
      }
    }

    return mask;
  }

  // ==================== INVERSE FFT ====================
  
  /**
   * 
   * Apply IFFT shift to move zero frequency from center to corners
   * @param {Float64Array} complexData - Complex frequency data
   * @param {number} width - Data width
   * @param {number} height - Data height
   * @returns {Float64Array} Shifted data
   */

  /* * This function moves the zero-frequency component
 * from the center of the spectrum back to the corners,
 * which is required before applying IFFT.*/
  ifftShift(complexData, width, height) { //complex data (fft for real , imag)

     // Create a new array to store the shifted data
    const shifted = new Float64Array(complexData.length);

     // Half of width and height (used for shifting)
    const halfW = Math.floor(width / 2);
    const halfH = Math.floor(height / 2);

      // Loop over every frequency point
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Compute new position by shifting each point
      // This undoes the effect of fftshift
        const newX = (x + halfW) % width;
        const newY = (y + halfH) % height;

        const oldIdx = (y * width + x) * 2; // Index of the current complex value (real + imaginary)
        const newIdx = (newY * width + newX) * 2; // Index where the value should move after shifting

        shifted[newIdx] = complexData[oldIdx];// Copy real part
        shifted[newIdx + 1] = complexData[oldIdx + 1];// Copy imag part
      }
    }
// Return shifted data ready for inverse FFT
    return shifted;
  }

 /**
 * Perform 2D Inverse FFT to convert frequency domain back to spatial domain
 * This function takes the mixed frequency data and reconstructs the image
 */
performIFFT(complexData, fftWidth, fftHeight, outputWidth, outputHeight) {
  // Log dimensions for debugging
  console.log('Starting IFFT:', { fftWidth, fftHeight, outputWidth, outputHeight });

  // IMPORTANT:
  // Before applying IFFT, we must undo the fftshift
  // FFT processing was done with DC component at the center,
  // but IFFT expects DC at the corners
  const shiftedData = this.ifftShift(complexData, fftWidth, fftHeight);

  // Create FFT objects for rows and columns
  const fftRow = new FFT(fftWidth);
  const fftCol = new FFT(fftHeight);

  // ==================== STEP 1: IFFT on columns ====================

  // Temporary array to hold one column (complex values)
  const colData = new Float64Array(fftHeight * 2);

  // Array to store result after column-wise IFFT
  const afterCols = new Float64Array(fftWidth * fftHeight * 2);

  // Loop over each column
  for (let x = 0; x < fftWidth; x++) {

    // Extract one column from the shifted frequency data
    for (let y = 0; y < fftHeight; y++) {
      colData[y * 2]     = shiftedData[y * fftWidth * 2 + x * 2];     // real part
      colData[y * 2 + 1] = shiftedData[y * fftWidth * 2 + x * 2 + 1]; // imaginary part
    }

    // Apply 1D inverse FFT on this column
    const colOutput = new Float64Array(fftHeight * 2);
    fftCol.inverseTransform(colOutput, colData);

    // Store the column result back
    for (let y = 0; y < fftHeight; y++) {
      afterCols[y * fftWidth * 2 + x * 2]     = colOutput[y * 2];
      afterCols[y * fftWidth * 2 + x * 2 + 1] = colOutput[y * 2 + 1];
    }
  }

  // ==================== STEP 2: IFFT on rows ====================

  // Temporary array to hold one row (complex values)
  const rowData = new Float64Array(fftWidth * 2);

  // Final complex spatial-domain result
  const result = new Float64Array(fftWidth * fftHeight * 2);

  // Loop over each row
  for (let y = 0; y < fftHeight; y++) {

    // Extract one row from column-processed data
    for (let x = 0; x < fftWidth; x++) {
      rowData[x * 2]     = afterCols[y * fftWidth * 2 + x * 2];
      rowData[x * 2 + 1] = afterCols[y * fftWidth * 2 + x * 2 + 1];
    }

    // Apply 1D inverse FFT on this row
    const rowOutput = new Float64Array(fftWidth * 2);
    fftRow.inverseTransform(rowOutput, rowData);

    // Store final spatial-domain result
    for (let x = 0; x < fftWidth; x++) {
      result[y * fftWidth * 2 + x * 2]     = rowOutput[x * 2];
      result[y * fftWidth * 2 + x * 2 + 1] = rowOutput[x * 2 + 1];
    }
  }

  // Convert complex spatial data to grayscale image (0–255)
  // This is where the image becomes viewable again
  return this.complexToGrayscale(
    result,
    fftWidth,
    fftHeight,
    outputWidth,
    outputHeight
  );
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
  // Create array to store final grayscale image
  const imageData = new Uint8ClampedArray(outputWidth * outputHeight);
  
  // ----------------------------
  // 1️⃣ Extract real parts of complex data
  // Imaginary part should be near zero for real images
  // ----------------------------
  const realValues = [];
  for (let y = 0; y < outputHeight; y++) {
    for (let x = 0; x < outputWidth; x++) {
      const idx = y * fftWidth + x;           // Compute 1D index in complex array
      const real = complexResult[idx * 2];    // Get real part (even indices)
      realValues.push(real);                   // Store real values for normalization
    }
  }

  // ----------------------------
  // 2️⃣ Find min and max values to normalize data
  // ----------------------------
  let min = realValues[0];
  let max = realValues[0];
  for (let i = 1; i < realValues.length; i++) {
    if (realValues[i] < min) min = realValues[i];
    if (realValues[i] > max) max = realValues[i];
  }
  
  const range = max - min;

  console.log('IFFT real value range:', { min, max, range });

  // Handle invalid range (all pixels same value or NaN)
  if (range === 0 || !isFinite(range)) {
    console.warn('Invalid range, filling with gray');
    imageData.fill(128);  // Fill with mid-gray
    return imageData;
  }

  // ----------------------------
  // 3️⃣ Normalize real values to 0-255 for grayscale
  // ----------------------------
  for (let i = 0; i < realValues.length; i++) {
    const normalized = ((realValues[i] - min) / range) * 255;      // Scale to 0-255
    imageData[i] = Math.max(0, Math.min(255, Math.round(normalized)));  // Clamp values
  }

  // ----------------------------
  // 4️⃣ Compute image statistics for debugging
  // ----------------------------
  const sampleValues = Array.from(imageData.slice(0, 20)); // First 20 pixels as sample
  let sum = 0;
  let minVal = imageData[0];
  let maxVal = imageData[0];
  
  for (let i = 0; i < imageData.length; i++) {
    sum += imageData[i];                  // Total intensity
    if (imageData[i] < minVal) minVal = imageData[i];  // Minimum pixel value
    if (imageData[i] > maxVal) maxVal = imageData[i];  // Maximum pixel value
  }
  
  const avg = sum / imageData.length;     // Average pixel intensity
  
  console.log('Output statistics:', { 
    sample: sampleValues, 
    average: avg.toFixed(2),
    min: minVal,
    max: maxVal
  });

  return imageData; // Return final grayscale image
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