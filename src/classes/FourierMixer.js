// FourierMixer.js - FIXED VERSION

import FFT from 'fft.js';

class FourierMixer {
  constructor() {
    this.processors = [];
    this.mixMode = 'magnitude-phase';
    this.weights = [0.25, 0.25, 0.25, 0.25];
  }

  setProcessors(processors) {
    this.processors = processors.filter(p => p && p.hasFFT());
  }

  setMixMode(mode) {
    this.mixMode = mode;
  }

  setWeights(weights) {
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

  // FIXED: Mix using magnitude and phase
  mixMagnitudePhase(fftWidth, fftHeight) {
    const size = fftWidth * fftHeight;
    const mixedComplex = new Float64Array(size * 2);

    console.log('Mixing Magnitude/Phase mode');

    for (let i = 0; i < size; i++) {
      let mixedMagnitude = 0;
      let sumCosPhase = 0; // For circular mean of phases
      let sumSinPhase = 0;

      // Weighted sum of magnitude and CIRCULAR mean of phase
      for (let j = 0; j < this.processors.length; j++) {
        const fft = this.processors[j].fft;
        const weight = this.weights[j];

        if (weight === 0) continue;

        const real = fft.complexData[i * 2];
        const imag = fft.complexData[i * 2 + 1];

        // Calculate magnitude and phase
        const magnitude = Math.sqrt(real * real + imag * imag);
        const phase = Math.atan2(imag, real);

        // Weighted sum of magnitude (simple average)
        mixedMagnitude += magnitude * weight;
        
        // Circular mean for phase (convert to unit vector)
        sumCosPhase += Math.cos(phase) * weight;
        sumSinPhase += Math.sin(phase) * weight;
      }

      // Get mixed phase from circular mean
      const mixedPhase = Math.atan2(sumSinPhase, sumCosPhase);

      // Convert back to complex: magnitude * e^(i*phase)
      const real = mixedMagnitude * Math.cos(mixedPhase);
      const imag = mixedMagnitude * Math.sin(mixedPhase);

      mixedComplex[i * 2] = real;
      mixedComplex[i * 2 + 1] = imag;
    }

    return mixedComplex;
  }

  // FIXED: Mix using real and imaginary
  mixRealImaginary(fftWidth, fftHeight) {
    const size = fftWidth * fftHeight;
    const mixedComplex = new Float64Array(size * 2);

    console.log('Mixing Real/Imaginary mode');

    for (let i = 0; i < size; i++) {
      let mixedReal = 0;
      let mixedImag = 0;

      // Simple weighted sum (weights already normalized)
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

  // Perform IFFT Shift (move zero frequency from center to corners)
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

  // FIXED: Perform 2D Inverse FFT
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
      for (let y = 0; y < fftHeight; y++) {
        colData[y * 2] = shiftedData[y * fftWidth * 2 + x * 2];
        colData[y * 2 + 1] = shiftedData[y * fftWidth * 2 + x * 2 + 1];
      }

      const colOutput = new Float64Array(fftHeight * 2);
      fftCol.inverseTransform(colOutput, colData);

      for (let y = 0; y < fftHeight; y++) {
        afterCols[y * fftWidth * 2 + x * 2] = colOutput[y * 2];
        afterCols[y * fftWidth * 2 + x * 2 + 1] = colOutput[y * 2 + 1];
      }
    }

    // Step 2: IFFT on each row
    const rowData = new Float64Array(fftWidth * 2);
    const result = new Float64Array(fftWidth * fftHeight * 2);

    for (let y = 0; y < fftHeight; y++) {
      for (let x = 0; x < fftWidth; x++) {
        rowData[x * 2] = afterCols[y * fftWidth * 2 + x * 2];
        rowData[x * 2 + 1] = afterCols[y * fftWidth * 2 + x * 2 + 1];
      }

      const rowOutput = new Float64Array(fftWidth * 2);
      fftRow.inverseTransform(rowOutput, rowData);

      for (let x = 0; x < fftWidth; x++) {
        result[y * fftWidth * 2 + x * 2] = rowOutput[x * 2];
        result[y * fftWidth * 2 + x * 2 + 1] = rowOutput[x * 2 + 1];
      }
    }

    // CRITICAL FIX: Take REAL part only, not magnitude!
    // For grayscale images, imaginary part should be near zero
    const imageData = new Uint8ClampedArray(outputWidth * outputHeight);
    
    // Extract real parts
    const realValues = [];
    for (let y = 0; y < outputHeight; y++) {
      for (let x = 0; x < outputWidth; x++) {
        const idx = y * fftWidth + x;
        const real = result[idx * 2];
        realValues.push(real);
      }
    }

    // FIXED: Find min/max without spread operator (causes stack overflow on large arrays)
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

    // Log statistics (without spread operator)
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

  canMix() {
    return this.processors.length > 0;
  }
}

export default FourierMixer;