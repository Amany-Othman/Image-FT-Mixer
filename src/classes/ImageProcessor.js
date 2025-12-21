// Import the FourierTransform class which handles FFT operations
import FourierTransform from './FourierTransform';

class ImageProcessor {
  constructor() {
    // Stores the original colored image data (RGBA) ..from canvas.getImageData
    this.rawImageData = null;      
    // Stores the grayscale version of the image (1 value per pixel)
    this.grayscaleData = null;     
    this.width = 0; // Image width in pixels
    this.height = 0;
    this.fft = null;  // FFT object associated with this image
    this.brightness = 0;    // -100 to 100
    this.contrast = 0;      // -100 to 100
    // Copy of the original grayscale image (used for reset)
    this.originalGrayscale = null;  
  }

  // ==================== IMAGE LOADING ====================
  
  
  async loadImage(file) {
    // Return a Promise because image loading is asynchronous
    return new Promise((resolve, reject) => {
      // read the contents of files stored on the user's computer
      const reader = new FileReader();

      // Triggered after the file is successfully read
      //kol ely gwa { }  hyntfz b3d ma el file yt2ry 
      reader.onload = (e) => {
        // Create a new Image object
        const img = new Image();

        // Triggered when the image is fully loaded
        img.onload = () => {

          // Create an off-screen canvas to extract pixel data
          //de msh btzhr ll user 
          const canvas = document.createElement('canvas');
          //el tool ely bnrsm beha 3lcanvas 
          const ctx = canvas.getContext('2d');

          // Set canvas size equal to image size
          canvas.width = img.width;
          canvas.height = img.height;

          // Draw the image on the canvas
          ctx.drawImage(img, 0, 0);

          // Extract raw RGBA pixel data from the canvas
          this.rawImageData = ctx.getImageData(0, 0, img.width, img.height);

          // Store image dimensions
          this.width = img.width;
          this.height = img.height;

          // Immediately convert the image to grayscale
          this.convertToGrayscale();

          // Store a copy of the grayscale image for reset operations
          //3shan n3rd el original 3la tol mn gher revert 
          this.originalGrayscale = new Uint8ClampedArray(this.grayscaleData);

          // Resolve the promise with basic image data
          //hn pass el kalam dh lly hy call el function 
          resolve({
            width: this.width,
            height: this.height,
            grayscale: this.grayscaleData
          });
        };

        // Reject the promise if the image fails to load
        img.onerror = reject;

        // Set the image source to the loaded file data
        img.src = e.target.result;
      };

      // Reject the promise if the file fails to read
      reader.onerror = reject;

      // Read the image file as a Data URL
      reader.readAsDataURL(file);
    });
  }

  // ==================== COLOR CONVERSION ====================
  /**
   * Convert the loaded colored image to grayscale
   * Uses the luminosity method for better perceptual accuracy
   */
  convertToGrayscale() {
    // If no image data exists, do nothing
    if (!this.rawImageData) return;

    // RGBA pixel array from the original image
    const data = this.rawImageData.data;

    // Create a grayscale array (1 value per pixel msh 4 zy el original)
    const grayscale = new Uint8ClampedArray(this.width * this.height);

    // Loop over the RGBA data (4 values per pixel)
    for (let i = 0; i < data.length; i += 4) {
      //i += 4 3shan kol 4 values bt3br 3n 1 pixel

      // Extract red channel
      const r = data[i];

      // Extract green channel
      const g = data[i + 1];

      // Extract blue channel
      const b = data[i + 2];

      // Convert RGB to grayscale using luminosity formula
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // Store grayscale value (one per pixel)
      grayscale[i / 4] = gray;
    }

    // Save grayscale image data
    this.grayscaleData = grayscale;
  }


  // ==================== IMAGE RESIZING ====================
  
  
  resize(newWidth, newHeight) {
     // If no grayscale image exists, do nothing
    if (!this.grayscaleData) return;
    // Create a new array for the resized image
    const resized = new Uint8ClampedArray(newWidth * newHeight);
    // Compute scaling ratios between old and new dimensions
    const xRatio = this.width / newWidth;
    const yRatio = this.height / newHeight;
    
    // Loop over each pixel in the new image
    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        // Find the corresponding source pixel (nearest neighbor)
        //l kol pixel ashof a2rb pixel leha 
        // fel original w akhod elgray value bta3tha (3shan kda floor)
        const srcX = Math.floor(x * xRatio);
        const srcY = Math.floor(y * yRatio);
        // Compute source index in original image
        const srcIdx = srcY * this.width + srcX;
        // Compute destination index in resized image
        const dstIdx = y * newWidth + x;
        // *****Copy pixel value from source to destination*******
        resized[dstIdx] = this.grayscaleData[srcIdx];
      }
    }
    // Update grayscale data with resized image
    this.grayscaleData = resized;
    // Store a fresh copy for reset purposes
    this.originalGrayscale = new Uint8ClampedArray(resized);
    // Update image dimensions
    this.width = newWidth;
    this.height = newHeight;

    // Reset brightness and contrast after resizing
    this.brightness = 0;
    this.contrast = 0;
  }

  // ==================== BRIGHTNESS/CONTRAST ADJUSTMENTS ====================
  
 
 // Adjust the current brightness by a delta value (-100 to 100)
adjustBrightness(delta) {
  // Update brightness and clamp it between -100 and 100
  this.brightness = Math.max(-100, Math.min(100, this.brightness + delta));
  // Apply the changes immediately to the image
  this.applyAdjustments();
}

/**
 * Adjust contrast by a delta (-100 to 100)
 */
adjustContrast(delta) {
  // Update contrast and clamp it between -100 and 100
  this.contrast = Math.max(-100, Math.min(100, this.contrast + delta));
  // Apply the changes immediately to the image
  this.applyAdjustments();
}

// Set brightness and contrast directly (overwrite current values)

setBrightnessContrast(brightness, contrast) {
  // Clamp values to valid range
  this.brightness = Math.max(-100, Math.min(100, brightness));
  this.contrast = Math.max(-100, Math.min(100, contrast));
  // Apply adjustments to the image
  this.applyAdjustments();
}

/**
 * Apply brightness and contrast changes to the grayscale image
 * Always start from the original grayscale to avoid cumulative errors
 */
applyAdjustments() {
  // Do nothing if no original image exists
  if (!this.originalGrayscale) return;
  
  // Work on a fresh copy of the original image
  this.grayscaleData = new Uint8ClampedArray(this.originalGrayscale);
  
  // Compute the contrast factor using standard formula
  const contrastFactor = (259 * (this.contrast + 255)) / (255 * (259 - this.contrast));
  
  // Loop through each pixel and apply contrast and brightness
  for (let i = 0; i < this.grayscaleData.length; i++) {
    let pixel = this.grayscaleData[i];
    
    // Apply contrast adjustment
    pixel = contrastFactor * (pixel - 128) + 128;
    
    // Apply brightness adjustment
    pixel = pixel + this.brightness;
    
    // Clamp the value to valid grayscale range [0,255]
    this.grayscaleData[i] = Math.max(0, Math.min(255, pixel));
  }
}

/**
 * Reset brightness and contrast to default values (0)
 */
resetAdjustments() {
  this.brightness = 0;
  this.contrast = 0;
  // Restore the original grayscale image
  //bstkhdm copy el original w a7otha fel sora ely btt3rd
  if (this.originalGrayscale) {
    this.grayscaleData = new Uint8ClampedArray(this.originalGrayscale);
  }
}

//Get the current brightness and contrast values
//dol 3shan lma a3rdhom fel ui b get them mn el func de
getAdjustments() {
  return {
    brightness: this.brightness,
    contrast: this.contrast
  };
}

  // ==================== FFT COMPUTATION ====================
  

   // Compute FFT for the current image
   
  computeFFT() {
    // Do nothing if no grayscale image is loaded
    if (!this.grayscaleData) {
      console.warn('No grayscale data to compute FFT');
      return;
    }
    
    // Create a new instance of the FourierTransform class
    this.fft = new FourierTransform(this.width, this.height);
    
    // Compute the 2D FFT on the grayscale data
    this.fft.compute2DFFT(this.grayscaleData);
    // Return the FFT instance
    return this.fft;
  }

  
   //Check if FFT has been computed
   
  hasFFT() {
    return this.fft !== null && this.fft.hasFFT();
  }

  // ==================== FFT COMPONENT RETRIEVAL ====================

   //Get a specific FFT component for display
   
  getFFTComponent(componentType) {
    // Warn if FFT has not been computed
    if (!this.fft) {
      console.warn('FFT not computed yet');
      return null;
    }
    // Return the requested FFT component
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


  // Get FFT component with brightness/contrast adjustments
 
  getFFTComponentWithAdjustments(componentType, brightness, contrast) {
    if (!this.fft) {
      console.warn('FFT not computed yet');
      return null;
    }
    // Return the component after applying brightness/contrast adjustments
    return this.fft.getComponentWithAdjustments(componentType, brightness, contrast);
    // getComponentWithAdjustments fe fourier Transform class
  }

  // ==================== IMAGE DATA RETRIEVAL ====================
  
 
   // Get grayscale image as ImageData for canvas display
  
  getGrayscaleImageData() {
    if (!this.grayscaleData) return null;
    
    const imageData = new ImageData(this.width, this.height);
    const data = imageData.data;
    // Convert 1D grayscale array to RGBA format
    for (let i = 0; i < this.grayscaleData.length; i++) {
      const gray = this.grayscaleData[i];
      const idx = i * 4;
      // 3shan arsm 3l canvas -> lazem RGBA f bkrr el gray 
      data[idx] = gray;      // Red
      data[idx + 1] = gray;  // Green
      data[idx + 2] = gray;  // Blue
      data[idx + 3] = 255;   // Alpha (fully opaque)
    }
    
    return imageData;
  }

  
  // Get grayscale data as Uint8ClampedArray
   
  getGrayscaleData() {
    return this.grayscaleData;
  }

  
  //Convert a grayscale Array to ImageData for canvas rendering
  static arrayToImageData(data, width, height) {
    //static fa a2dr a use it mngher class instance 
    const imageData = new ImageData(width, height);
    const pixels = imageData.data;
    // Fill RGBA array from grayscale values
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
  
  
  //Check if an image has been loaded
  hasImage() {
    return this.grayscaleData !== null;
  }

 
   // Get image dimensions of current image 
   
  getDimensions() {
    return {
      width: this.width,
      height: this.height
    };
  }
}

export default ImageProcessor;