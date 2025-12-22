import FFT from 'fft.js';

class FourierTransform {
  constructor(width, height) {
    // Original image dimensions
    this.width = width;
    this.height = height;
    
   // FFT libraries usually require dimensions to be powers of 2
    // So we compute the next power of 2 for both width and height
    this.fftWidth = this.nextPowerOf2(width);
    this.fftHeight = this.nextPowerOf2(height);
    this.fftSize = this.fftWidth * this.fftHeight;
    
    /// These will store the FULL (padded) FFT results
    // We keep full size because it is required later for mixing
    this.complexData = null;    
    // Interleaved complex array: [real, imag, real, imag, ...]

    this.magnitude = null;
    this.phase = null; 
    this.real = null;   
    this.imaginary = null;  
  }

 // Compute the 2D FFT of a grayscale image
  compute2DFFT(grayscaleData) {
    // Convert input data to Float64 for numerical accuracy
    const data = new Float64Array(grayscaleData);
    
    // Pad data to power of 2 dimensions using zero padding
    const paddedData = this.padData(data, this.width, this.height, this.fftWidth, this.fftHeight);
    
   // Perform the actual 2D FFT (row-wise then column-wise)
    const fftResult = this.fft2D(paddedData, this.fftWidth, this.fftHeight);
    
    
     // Shift the FFT so that the DC component (low frequency)
    // is moved from the corner to the center of the spectrum
    const shiftedFFT = this.fftShiftComplex(fftResult, this.fftWidth, this.fftHeight);
    
     // Store the shifted complex FFT data
    // This is the standard representation used for frequency-domain mixing
    
    this.complexData = shiftedFFT;
    
    // Compute magnitude, phase, real, imaginary (for display)
    this.computeComponents();
     
     // Return the computed components
    return {
      magnitude: this.magnitude,
      phase: this.phase,
      real: this.real,
      imaginary: this.imaginary
    };
  }

    // Perform a 2D FFT by applying 1D FFTs on rows then columns
  fft2D(data, width, height) {
    // Create FFT instances for rows and columns
    const fftRow = new FFT(width);
    const fftCol = new FFT(height);
    
    // Allocate array for complex data
    // Each pixel has two values: real and imaginary
    const complexData = new Float64Array(width * height * 2);
    
    // -------------------------
    // Step 1: FFT on each row
    // -------------------------
    const rowData = new Float64Array(width * 2); // Interleaved complex row
   //re0/img0/re1/img1
    for (let y = 0; y < height; y++) {
      // Copy the real image row into the complex array
      // Imaginary parts are initialized to zero
      for (let x = 0; x < width; x++) {
        rowData[x * 2] = data[y * width + x]; // Real part
        rowData[x * 2 + 1] = 0;               // Imaginary part l2n lsa mfesh fft
      }
      
      // Apply 1D FFT on the current row
      const rowOutput = new Float64Array(width * 2);
      fftRow.transform(rowOutput, rowData);
      
      // Store the FFT result of the row into the complex data array
      for (let x = 0; x < width; x++) {
        complexData[y * width * 2 + x * 2] = rowOutput[x * 2];
        complexData[y * width * 2 + x * 2 + 1] = rowOutput[x * 2 + 1];
      }
    }
    
    // ----------------------------
    // Step 2: FFT on each column
    // ----------------------------
    const colData = new Float64Array(height * 2); // Interleaved complex column
    const result = new Float64Array(width * height * 2);
    
    for (let x = 0; x < width; x++) {
      // Extract one column from the row-FFT result
      for (let y = 0; y < height; y++) {
        colData[y * 2] =
          complexData[y * width * 2 + x * 2];       // Real part
        colData[y * 2 + 1] =
          complexData[y * width * 2 + x * 2 + 1];   // Imaginary part
      }
      
      // Apply 1D FFT on the column
      const colOutput = new Float64Array(height * 2);
      fftCol.transform(colOutput, colData);
      
      // Store the column FFT result into the final 2D FFT array
      for (let y = 0; y < height; y++) {
        result[y * width * 2 + x * 2] = colOutput[y * 2];//real
        result[y * width * 2 + x * 2 + 1] = colOutput[y * 2 + 1];//imaginary
      }
    }
    
    // Return the full 2D FFT result (complex, unshifted)
    //Interleaved Complex Format
    //each point in freq domain-> [ real0, imag0, real1, imag1, real2, imag2, ... ]

    return result;
  }


 // FFT Shift for 2D complex data
// This function moves the DC (zero frequency) component
// from the top-left corner to the center of the spectrum
fftShiftComplex(complexData, width, height) {

  // Create a new array to store the shifted result
  // Same size as the original complex FFT data
  const shifted = new Float64Array(complexData.length);

  // Half of width and height
  // Used to shift the frequency quadrants
  const halfW = Math.floor(width / 2);
  const halfH = Math.floor(height / 2);

  // Loop over every frequency point in the 2D FFT
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {

      // Compute the new (shifted) coordinates
      // This moves the origin (0,0) to the center
      const newX = (x + halfW) % width;
      const newY = (y + halfH) % height;

      // Index of the current complex value (real + imaginary)
      // Each frequency point occupies two consecutive values
      const oldIdx = (y * width + x) * 2;

      // Index of the new shifted position
      const newIdx = (newY * width + newX) * 2;

      // Copy the real part to the new location
      shifted[newIdx] = complexData[oldIdx];

      // Copy the imaginary part to the new location
      shifted[newIdx + 1] = complexData[oldIdx + 1];
    }
  }

  // Return the FFT data with DC component centered
  return shifted;
}

// Compute all main FFT components from the full complex data
  computeComponents() {
    // Use full FFT dimensions (not cropped)
    const size = this.fftWidth * this.fftHeight;
    
    // Initialize arrays for each component
    this.magnitude = new Float64Array(size);   // Magnitude of each frequency
    this.phase = new Float64Array(size);       // Phase (angle) of each frequency
    this.real = new Float64Array(size);        // Real part of each frequency
    this.imaginary = new Float64Array(size);   // Imaginary part of each frequency
    
    // Loop over every point in the full FFT
    for (let i = 0; i < size; i++) {
      const real = this.complexData[i * 2];       // Extract real part
      const imag = this.complexData[i * 2 + 1];   // Extract imaginary part
      
      this.real[i] = real;                         // Store real
      this.imaginary[i] = imag;                    // Store imaginary
      this.magnitude[i] = Math.sqrt(real * real + imag * imag); // Compute magnitude
      this.phase[i] = Math.atan2(imag, real);      // Compute phase (angle)
    }
  }

  // Get magnitude as a displayable image (cropped to original size)
  getMagnitudeDisplay() {
    if (!this.magnitude) return null;
    
    // Crop from padded FFT to original image size
    const cropped = this.cropToOriginalSize(this.magnitude);
    
    // Apply logarithmic scale to make small details visible
    const display = new Float64Array(cropped.length);
    for (let i = 0; i < cropped.length; i++) {
      display[i] = Math.log(1 + cropped[i]);
    }
    
    // Normalize to 0-255 for displaying as image
    return this.normalizeForDisplay(display);
  }

  // Get phase as displayable image (cropped)
  getPhaseDisplay() {
    if (!this.phase) return null;
    const cropped = this.cropToOriginalSize(this.phase);
    return this.normalizeForDisplay(cropped);
  }

  // Get real component as displayable image (cropped)
  getRealDisplay() {
    if (!this.real) return null;
    const cropped = this.cropToOriginalSize(this.real);
    return this.normalizeForDisplay(cropped);
  }

  // Get imaginary component as displayable image (cropped)
  getImaginaryDisplay() {
    if (!this.imaginary) return null;
    const cropped = this.cropToOriginalSize(this.imaginary);
    return this.normalizeForDisplay(cropped);
  }

  // Crop FFT data from padded size to original image size
  //mngherha hykon fe 7waf soda bsbb en el value lehom 
  //zero mn el zero padding w fel mixer wel region el coordinates htkon ghlt
  cropToOriginalSize(data) {
    const cropped = new Float64Array(this.width * this.height);
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const srcIdx = y * this.fftWidth + x;  // Index in padded FFT
        const dstIdx = y * this.width + x;     // Index in cropped array
        cropped[dstIdx] = data[srcIdx];        // Copy value
      }
    }
    
    return cropped;
  }

  // Normalize data to 0-255 range for display
  normalizeForDisplay(data) {
    let min = Infinity;
    let max = -Infinity;
    
    // Find min and max in the array
    for (let i = 0; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }
    
    const normalized = new Uint8ClampedArray(data.length);
    const range = max - min;
    
    // If all values are the same, fill with gray
    if (range === 0) {
      normalized.fill(128);
      return normalized;
    }
    
    // Scale all values to 0-255
    for (let i = 0; i < data.length; i++) {
      normalized[i] = Math.floor(((data[i] - min) / range) * 255);
    }
    
    return normalized;
  }

  // Pad data to power-of-2 dimensions (needed for FFT)
  padData(data, width, height, newWidth, newHeight) {
    const padded = new Float64Array(newWidth * newHeight);
    
    // Copy original data into padded array
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        padded[y * newWidth + x] = data[y * width + x];
      }
    }
    
    // Remaining values are zero by default
    return padded;
  }

  // Find next power of 2 (for padding)
  nextPowerOf2(n) {
    if (n <= 1) return 2;
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }

  // Apply brightness and contrast adjustment to a displayable component
  applyBrightnessContrast(componentData, brightness, contrast) {
    if (!componentData) return null;
    
    const adjusted = new Uint8ClampedArray(componentData.length);
    // Contrast formula factor
    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    
    for (let i = 0; i < componentData.length; i++) {
      let pixel = componentData[i];
      pixel = contrastFactor * (pixel - 128) + 128; // Apply contrast
      pixel = pixel + brightness;                   // Apply brightness
      adjusted[i] = Math.max(0, Math.min(255, pixel)); // Clamp to 0-255
    }
    
    return adjusted;
  }

  // Get component with optional brightness/contrast adjustment
  getComponentWithAdjustments(componentType, brightness, contrast) {
    let componentData = null;
    
    // Select component
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
    
    // Apply brightness/contrast if needed
    if (brightness !== 0 || contrast !== 0) {
      return this.applyBrightnessContrast(componentData, brightness, contrast);
    }
    
    return componentData;
  }

  // Check if FFT data exists
  hasFFT() {
    return this.complexData !== null;
  }
}

export default FourierTransform;