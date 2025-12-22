// ImageViewport.jsx - With mouse-drag brightness/contrast controls
// This component represents ONE of the 4 input image viewports in the Fourier Mixer application.
// Each viewport displays:
//   1. Original grayscale image (left canvas)
//   2. Selected FFT component (right canvas) - magnitude, phase, real, or imaginary
//
// Key Features:
//   - Double-click to load images
//   - Mouse drag to adjust brightness/contrast independently for image and FFT component
//   - Weight slider for mixing contribution
//   - Region rectangle overlay on FFT component showing selected frequency area
//   - Auto-resize to match smallest loaded image across all viewports

import React, { useState, useRef, useEffect } from "react";
import ImageProcessor from "../classes/ImageProcessor";
import "./ImageViewport.css";

function ImageViewport({
  id, // Viewport ID (1-4) - Used to identify which viewport this is
  onImageLoaded, // Callback function to notify App.jsx when image loads successfully
  targetSize, // Target dimensions {width, height} - All images must match this size
  regionConfig, // Frequency region configuration: {enabled, type: 'inner'|'outer', size: 0-100%}
  weight, // Current mixing weight for this image (0.0 to 1.0)
  onWeightChange, // Callback when user adjusts weight slider
  isDisabled, // If true, disable weight slider (used when image/FFT not ready)
}) {
  // ==================== STATE MANAGEMENT ====================

  // Indicates whether an image is currently loaded in this viewport
  const [hasImage, setHasImage] = useState(false);

  // Stores original image dimensions (before any resizing)
  const [imageDimensions, setImageDimensions] = useState(null);

  // Currently selected FFT component to display on right canvas
  // Options: 'magnitude', 'phase', 'real', 'imaginary'
  const [selectedComponent, setSelectedComponent] = useState("magnitude");

  // Flag indicating FFT computation is in progress (shows loading message)
  const [isComputingFFT, setIsComputingFFT] = useState(false);

  // ==================== BRIGHTNESS/CONTRAST STATE ====================
  // Each canvas (image and component) has INDEPENDENT brightness/contrast controls
  // This allows users to adjust visualization without affecting the actual data used for mixing

  // Brightness/contrast for the ORIGINAL IMAGE (left canvas)
  // Range: -100 to +100 for both
  const [imageBrightness, setImageBrightness] = useState(0);
  const [imageContrast, setImageContrast] = useState(0);

  // Brightness/contrast for the FFT COMPONENT (right canvas)
  const [componentBrightness, setComponentBrightness] = useState(0);
  const [componentContrast, setComponentContrast] = useState(0);

  // ==================== MOUSE DRAG STATE FOR IMAGE CANVAS ====================
  // These states track mouse dragging for brightness/contrast adjustment on the IMAGE canvas

  // Flag: Is user currently dragging on the image canvas?
  const [isImageDragging, setIsImageDragging] = useState(false);

  // Mouse position when drag started (used to calculate delta movement)
  const [imageDragStart, setImageDragStart] = useState({ x: 0, y: 0 });

  // Brightness/contrast values when drag started (used as base for calculations)
  const [imageDragStartValues, setImageDragStartValues] = useState({
    brightness: 0,
    contrast: 0,
  });

  // ==================== MOUSE DRAG STATE FOR COMPONENT CANVAS ====================
  // Separate drag state for the FFT component canvas (independent from image canvas)

  const [isComponentDragging, setIsComponentDragging] = useState(false);
  const [componentDragStart, setComponentDragStart] = useState({ x: 0, y: 0 });
  const [componentDragStartValues, setComponentDragStartValues] = useState({
    brightness: 0,
    contrast: 0,
  });

  // ==================== REFS ====================
  // Refs persist across re-renders without causing re-renders when changed

  // Holds the ImageProcessor instance that handles all image operations
  // (loading, grayscale conversion, resizing, FFT computation, brightness/contrast)
  const processorRef = useRef(new ImageProcessor());

  // References to the two canvas elements for direct manipulation
  const imageCanvasRef = useRef(null); // Left canvas - displays original grayscale
  const componentCanvasRef = useRef(null); // Right canvas - displays FFT component

  // Reference to hidden file input element (triggered by double-click)
  const fileInputRef = useRef(null);

  // Shorthand reference to the processor instance
  const processor = processorRef.current;

  // ==================== IMAGE LOADING ====================

  /**
   * Handles file selection from the file input dialog
   * Flow:
   *   1. User double-clicks canvas → fileInputRef.current.click() → file dialog opens
   *   2. User selects image → this function is called
   *   3. Image is loaded and processed via ImageProcessor
   *   4. FFT is automatically computed
   *   5. Parent component (App.jsx) is notified
   */
  const handleFileChange = async (event) => {
    // Extract the selected file from the input event
    const file = event.target.files[0];
    if (!file) return; // User cancelled file selection

    try {
      // Call ImageProcessor.loadImage() which:
      //   - Reads file as Data URL
      //   - Creates Image object and loads it
      //   - Draws to off-screen canvas
      //   - Extracts RGBA pixel data
      //   - Converts to grayscale immediately
      //   - Stores original grayscale as backup for reset
      const result = await processor.loadImage(file);

      // Update component state to reflect successful load
      setHasImage(true);
      setImageDimensions({ width: result.width, height: result.height });

      // Reset all brightness/contrast values to default (0)
      // This ensures clean slate for new image
      setImageBrightness(0);
      setImageContrast(0);
      setComponentBrightness(0);
      setComponentContrast(0);

      // Notify parent component (App.jsx) that image is loaded
      // Parent will:
      //   - Store processor reference
      //   - Calculate target size (smallest dimensions across all loaded images)
      //   - Trigger resize if needed
      onImageLoaded(id, processor);

      // Render the grayscale image on the left canvas
      drawImage();

      // Start FFT computation (async, non-blocking)
      computeFFT();
    } catch (error) {
      console.error("Error loading image:", error);
      alert("Failed to load image. Please try another file.");
    }
  };

  // ==================== FFT COMPUTATION ====================

  /**
   * Computes the 2D FFT of the loaded grayscale image
   * Uses setTimeout to avoid blocking the UI thread
   * FFT computation involves:
   *   1. Padding to power-of-2 dimensions
   *   2. Row-wise 1D FFT
   *   3. Column-wise 1D FFT
   *   4. FFT shift (move DC component to center)
   *   5. Component extraction (magnitude, phase, real, imaginary)
   */
  const computeFFT = async () => {
    // Show "Computing FFT..." message in component canvas
    setIsComputingFFT(true);

    // Use setTimeout to yield control back to browser
    // This prevents UI from freezing during computation
    setTimeout(() => {
      try {
        // Call ImageProcessor.computeFFT() which:
        //   - Creates FourierTransform instance
        //   - Pads data to power-of-2
        //   - Performs 2D FFT
        //   - Shifts FFT to center DC component
        //   - Computes magnitude, phase, real, imaginary components
        processor.computeFFT();

        // Render the default component (magnitude) on the right canvas
        drawComponent();
      } catch (error) {
        console.error("Error computing FFT:", error);
      }

      // Clear the loading indicator
      setIsComputingFFT(false);
    }, 100); // 100ms delay to allow UI to update
  };

  // ==================== CANVAS RENDERING ====================

  /**
   * Renders the grayscale image on the LEFT canvas
   * Applies current brightness/contrast settings during rendering
   * Note: Brightness/contrast adjustments are for DISPLAY ONLY
   *       Original data used for FFT/mixing is unmodified
   */
  const drawImage = () => {
    const canvas = imageCanvasRef.current;

    // Safety check: Ensure canvas exists and image is loaded
    if (!canvas || !processor.hasImage()) return;

    // Get 2D drawing context
    const ctx = canvas.getContext("2d");

    // Set canvas dimensions to match processor dimensions
    canvas.width = processor.width;
    canvas.height = processor.height;

    // Clear canvas with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply current brightness/contrast adjustments to processor
    // This modifies processor.grayscaleData temporarily for display
    processor.setBrightnessContrast(imageBrightness, imageContrast);

    // Get the adjusted grayscale data as ImageData object (RGBA format)
    const imageData = processor.getGrayscaleImageData();

    // Draw the image data to canvas at position (0, 0)
    ctx.putImageData(imageData, 0, 0);
  };

  /**
   * Renders the selected FFT component on the RIGHT canvas
   * Also draws the region rectangle overlay if region selection is enabled
   *
   * Component rendering flow:
   *   1. Get selected component data (magnitude/phase/real/imaginary)
   *   2. Apply brightness/contrast adjustments for display
   *   3. Convert to ImageData format (RGBA)
   *   4. Draw to canvas
   *   5. Overlay region rectangle if enabled
   */
  const drawComponent = () => {
    const canvas = componentCanvasRef.current;

    // Safety check: Ensure canvas exists and FFT is computed
    if (!canvas || !processor.hasFFT()) return;

    const ctx = canvas.getContext("2d");
    canvas.width = processor.width;
    canvas.height = processor.height;

    // Clear canvas with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Get FFT component data with brightness/contrast adjustments
    // This calls FourierTransform.getComponentWithAdjustments() which:
    //   - Selects the correct component (magnitude/phase/real/imaginary)
    //   - Crops from padded FFT size to original image size
    //   - Applies log scaling for magnitude
    //   - Normalizes to 0-255 range
    //   - Applies brightness/contrast formula
    const componentData = processor.getFFTComponentWithAdjustments(
      selectedComponent,
      componentBrightness,
      componentContrast
    );

    // Safety check: Component data should exist
    if (!componentData) return;

    // Create ImageData object for canvas rendering
    const imageData = new ImageData(processor.width, processor.height);
    const data = imageData.data; // RGBA array

    // Convert grayscale component data to RGBA format
    // Each grayscale value becomes R=G=B=value, A=255
    for (let i = 0; i < componentData.length; i++) {
      const value = componentData[i]; // 0-255 grayscale value
      const idx = i * 4; // RGBA index (4 values per pixel)

      data[idx] = value; // Red channel
      data[idx + 1] = value; // Green channel
      data[idx + 2] = value; // Blue channel
      data[idx + 3] = 255; // Alpha channel (fully opaque)
    }

    // Draw the component data to canvas
    ctx.putImageData(imageData, 0, 0);

    // Draw region rectangle overlay on top
    // This shows which frequencies are selected for mixing (inner or outer)
    drawRegionRectangle(ctx, canvas.width, canvas.height);
  };

  /**
   * Draws a semi-transparent rectangle overlay on the FFT component canvas
   * Indicates the selected frequency region for mixing
   *
   * Region types:
   *   - INNER: Low frequencies (center of FFT) - typically structure/shape
   *   - OUTER: High frequencies (edges of FFT) - typically details/edges
   *
   * Visual representation:
   *   - Green rectangle + green tint = INNER region selected
   *   - Red rectangle + red tint = OUTER region selected
   *   - Dashed border for clarity
   *   - Label in bottom-left corner
   */
  const drawRegionRectangle = (ctx, width, height) => {
    // Only draw if region selection is enabled
    if (!regionConfig || !regionConfig.enabled) return;

    // Calculate center of the canvas (where DC component is located after FFT shift)
    const centerX = width / 2;
    const centerY = height / 2;

    // Calculate rectangle dimensions based on region size percentage
    // Size is a percentage (0-100) of the full FFT dimensions
    const rectWidth = (width * regionConfig.size) / 100;
    const rectHeight = (height * regionConfig.size) / 100;

    // Calculate top-left corner of rectangle (centered around DC component)
    const x = centerX - rectWidth / 2;
    const y = centerY - rectHeight / 2;

    // Set colors based on region type
    if (regionConfig.type === "inner") {
      ctx.strokeStyle = "#00c000"; // Green border
      ctx.fillStyle = "rgba(0, 200, 0, 0.1)"; // Semi-transparent green fill
    } else {
      ctx.strokeStyle = "#ff5050"; // Red border
      ctx.fillStyle = "rgba(255, 80, 80, 0.1)"; // Semi-transparent red fill
    }

    // Configure line style
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // Dashed line pattern: 5px dash, 5px gap

    // Draw filled rectangle (semi-transparent tint)
    ctx.fillRect(x, y, rectWidth, rectHeight);

    // Draw rectangle border (dashed)
    ctx.strokeRect(x, y, rectWidth, rectHeight);

    // Reset line dash for subsequent drawing
    ctx.setLineDash([]);

    // Draw center point marker (small square at DC component location)
    ctx.fillStyle = regionConfig.type === "inner" ? "#00c000" : "#ff5050";
    ctx.fillRect(centerX - 2, centerY - 2, 4, 4); // 4x4 pixel square

    // Draw text label showing region type and size
    ctx.fillStyle = regionConfig.type === "inner" ? "#00a000" : "#d00000";
    ctx.font = "bold 11px Arial";
    ctx.fillText(
      `${regionConfig.type.toUpperCase()} ${regionConfig.size}%`,
      10, // X position (left edge + 10px padding)
      height - 10 // Y position (bottom edge - 10px padding)
    );
  };

  // ==================== FFT COMPONENT SELECTION ====================

  /**
   * Handles dropdown change to select different FFT component for display
   * Options: magnitude, phase, real, imaginary
   *
   * When switching components:
   *   - Reset brightness/contrast to 0 for the new component
   *   - Redraw the component canvas
   *
   * This allows users to inspect different frequency domain representations
   */
  const handleComponentChange = (event) => {
    setSelectedComponent(event.target.value);

    // Reset component brightness/contrast when switching components
    // This ensures each component starts with default visualization
    setComponentBrightness(0);
    setComponentContrast(0);

    // Redraw the canvas with the new component
    if (processor.hasFFT()) {
      drawComponent();
    }
  };

  // ==================== IMAGE CANVAS MOUSE HANDLERS ====================
  // These handlers implement brightness/contrast adjustment via mouse dragging
  // on the LEFT canvas (original grayscale image)
  //
  // Drag behavior:
  //   - Horizontal drag (left/right) = Contrast adjustment
  //   - Vertical drag (up/down) = Brightness adjustment (inverted: up = brighter)
  //   - Sensitivity: 0.5 units per pixel of movement

  /**
   * Mouse down on image canvas - Start drag operation
   * Captures starting mouse position and current B/C values
   */
  const handleImageMouseDown = (e) => {
    // Only allow dragging if image is loaded
    if (!hasImage) return;

    // Mark drag as active
    setIsImageDragging(true);

    // Store starting mouse position (used to calculate delta in mousemove)
    setImageDragStart({ x: e.clientX, y: e.clientY });

    // Store current brightness/contrast as baseline for adjustments
    setImageDragStartValues({
      brightness: imageBrightness,
      contrast: imageContrast,
    });

    // Prevent text selection or other default behaviors during drag
    e.preventDefault();
  };

  /**
   * Mouse move on image canvas - Apply brightness/contrast adjustments
   * Calculates delta from drag start position and updates B/C accordingly
   */
  const handleImageMouseMove = (e) => {
    // Only process if actively dragging
    if (!isImageDragging) return;

    // Calculate how far the mouse has moved since drag started
    const deltaX = e.clientX - imageDragStart.x; // Horizontal movement
    const deltaY = e.clientY - imageDragStart.y; // Vertical movement

    // Left/Right drag = Contrast adjustment
    // Sensitivity: 0.5 contrast units per pixel
    // Clamped to [-100, 100] range
    const newContrast = Math.max(
      -100,
      Math.min(100, imageDragStartValues.contrast + deltaX * 0.5)
    );

    // Up/Down drag = Brightness adjustment
    // Sensitivity: 0.5 brightness units per pixel
    // INVERTED: Dragging UP (negative deltaY) increases brightness
    // Clamped to [-100, 100] range
    const newBrightness = Math.max(
      -100,
      Math.min(100, imageDragStartValues.brightness - deltaY * 0.5)
    );

    // Update state with new values
    setImageContrast(newContrast);
    setImageBrightness(newBrightness);

    // Immediately redraw image with new adjustments
    // This provides real-time visual feedback during drag
    drawImage();
  };

  /**
   * Mouse up on image canvas - End drag operation
   * Simply marks drag as inactive
   */
  const handleImageMouseUp = () => {
    setIsImageDragging(false);
  };

  // ==================== COMPONENT CANVAS MOUSE HANDLERS ====================
  // Identical behavior to image canvas handlers, but for the RIGHT canvas
  // (FFT component display) with independent brightness/contrast state

  /**
   * Mouse down on component canvas - Start drag operation
   */
  const handleComponentMouseDown = (e) => {
    // Only allow dragging if FFT is computed
    if (!processor.hasFFT()) return;

    setIsComponentDragging(true);
    setComponentDragStart({ x: e.clientX, y: e.clientY });
    setComponentDragStartValues({
      brightness: componentBrightness,
      contrast: componentContrast,
    });

    e.preventDefault();
  };

  /**
   * Mouse move on component canvas - Apply brightness/contrast adjustments
   */
  const handleComponentMouseMove = (e) => {
    if (!isComponentDragging) return;

    const deltaX = e.clientX - componentDragStart.x;
    const deltaY = e.clientY - componentDragStart.y;

    // Left/Right = Contrast
    const newContrast = Math.max(
      -100,
      Math.min(100, componentDragStartValues.contrast + deltaX * 0.5)
    );

    // Up/Down = Brightness (inverted)
    const newBrightness = Math.max(
      -100,
      Math.min(100, componentDragStartValues.brightness - deltaY * 0.5)
    );

    setComponentContrast(newContrast);
    setComponentBrightness(newBrightness);

    // Redraw component with new adjustments
    drawComponent();
  };

  /**
   * Mouse up on component canvas - End drag operation
   */
  const handleComponentMouseUp = () => {
    setIsComponentDragging(false);
  };

  // ==================== GLOBAL MOUSE EVENT HANDLERS ====================

  /**
   * Effect: Register global mouseup listener
   *
   * Purpose: End drag operations even if mouse is released outside canvas
   * Without this, dragging outside the canvas and releasing would leave
   * the drag state stuck as "active"
   */
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsImageDragging(false);
      setIsComponentDragging(false);
    };

    // Register listener on window
    window.addEventListener("mouseup", handleGlobalMouseUp);

    // Cleanup: Remove listener when component unmounts
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []); // Empty dependency array = run once on mount

  // ==================== RESET FUNCTIONALITY ====================

  /**
   * Resets all brightness/contrast adjustments to default (0)
   * Applies to both image and component canvases
   */
  const handleReset = () => {
    // Reset all B/C state to 0
    setImageBrightness(0);
    setImageContrast(0);
    setComponentBrightness(0);
    setComponentContrast(0);

    // Reset processor's internal B/C values and restore original grayscale
    processor.setBrightnessContrast(0, 0);

    // Redraw both canvases with default values
    drawImage();

    if (processor.hasFFT()) {
      drawComponent();
    }
  };

  // ==================== REGION CONFIG UPDATES ====================

  /**
   * Effect: Redraw component canvas when region configuration changes
   *
   * Region config changes come from App.jsx and include:
   *   - enabled: true/false
   *   - type: 'inner' or 'outer'
   *   - size: 0-100 (percentage)
   *
   * When changed, the region rectangle overlay needs to be redrawn
   */
  useEffect(() => {
    if (processor.hasFFT()) {
      drawComponent();
    }
  }, [regionConfig]); // Re-run when regionConfig changes

  // ==================== TARGET SIZE SYNCHRONIZATION ====================

  /**
   * Effect: Resize image when target size changes
   *
   * Target size is calculated by App.jsx as the smallest dimensions
   * across all loaded images. When it changes, all images must resize
   * to match for consistent mixing.
   *
   * Resize flow:
   *   1. App.jsx detects new image loaded or size change
   *   2. Calculates new target size (smallest width/height)
   *   3. Passes targetSize to all ImageViewport components
   *   4. This effect triggers, calling processor.resize()
   *   5. FFT is recomputed on resized image
   *   6. Both canvases are redrawn
   */
  useEffect(() => {
    // Only resize if both conditions are met
    if (targetSize && processor.hasImage()) {
      // Resize the image using nearest-neighbor interpolation
      processor.resize(targetSize.width, targetSize.height);

      // Reset all adjustments on resize
      // This prevents confusing states where adjustments from old size
      // are applied to new size
      setImageBrightness(0);
      setImageContrast(0);
      setComponentBrightness(0);
      setComponentContrast(0);

      // Redraw image with new dimensions
      drawImage();

      // Recompute FFT on resized data
      if (processor.hasFFT()) {
        computeFFT();
      }
    }
  }, [targetSize]); // Re-run when targetSize changes

  // ==================== FILE INPUT TRIGGER ====================

  /**
   * Double-click on canvas triggers file input dialog
   * This provides intuitive interaction: double-click empty area to load image
   */
  const handleDoubleClick = () => {
    fileInputRef.current.click();
  };

  // ==================== RENDER HELPERS ====================

  /**
   * Check if ANY brightness/contrast adjustments are active
   * Used to conditionally show the "RESET ALL ADJUSTMENTS" button
   */
  const hasAnyAdjustments =
    imageBrightness !== 0 ||
    imageContrast !== 0 ||
    componentBrightness !== 0 ||
    componentContrast !== 0;

  // ==================== JSX RENDER ====================

  return (
    <div className="image-viewport">
      {/* Side by Side Layout: Original Image (left) + FFT Component (right) */}
      <div className="display-sections-container">
        {/* ========== LEFT SECTION: ORIGINAL IMAGE ========== */}
        <div className="display-section">
          <div className="section-header">
            <h4>ORIGINAL IMAGE</h4>
          </div>

          {/* WEIGHT SLIDER - Only shown when image is loaded */}
          {/* Controls this image's contribution to the final mix (0-100%) */}
          {hasImage && (
            <div className="weight-slider-container">
              <div className="slider-label">
                <span className="slider-name">WEIGHT:</span>
                <span className="slider-value">
                  {(weight * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={weight}
                onChange={(e) =>
                  onWeightChange(parseInt(id), parseFloat(e.target.value))
                }
                disabled={isDisabled} // Disabled if FFT not computed yet
                className="weight-slider-input"
                style={{
                  // Dynamic gradient showing filled portion of slider
                  background: `linear-gradient(to right, #667eea 0%, #764ba2 ${
                    weight * 100
                  }%, #e0e0e0 ${weight * 100}%, #e0e0e0 100%)`,
                }}
              />
            </div>
          )}

          {/* IMAGE CANVAS CONTAINER */}
          <div
            className={`canvas-container ${isImageDragging ? "dragging" : ""}`}
            onDoubleClick={handleDoubleClick} // Open file dialog
            onMouseDown={handleImageMouseDown} // Start B/C drag
            onMouseMove={handleImageMouseMove} // Apply B/C adjustments
            title="Double-click to change image | Drag to adjust brightness/contrast"
          >
            {/* Placeholder shown when no image loaded */}
            {!hasImage && (
              <div className="placeholder">
                <p>Double-click to load</p>
              </div>
            )}

            {/* Actual canvas element for rendering image */}
            <canvas ref={imageCanvasRef} />

            {/* Brightness/Contrast Indicator - Only shown when adjustments are active */}
            {hasImage && (imageBrightness !== 0 || imageContrast !== 0) && (
              <div className="bc-indicator">
                <span>B: {Math.round(imageBrightness)}</span>
                <span>C: {Math.round(imageContrast)}</span>
              </div>
            )}
          </div>

          {/* Drag instructions shown below canvas */}
          {hasImage && (
            <div className="drag-instructions">
              <span>🖱️ Drag: ↕️ Brightness | ↔️ Contrast</span>
            </div>
          )}
        </div>

        {/* ========== RIGHT SECTION: FFT COMPONENT ========== */}
        <div className="display-section">
          <div className="section-header">
            <h4>FFT COMPONENT</h4>
          </div>

          {/* FFT COMPONENT SELECTOR - Dropdown to choose which component to display */}
          {processor.hasFFT() && (
            <div className="fft-component-selector-container">
              <select
                value={selectedComponent}
                onChange={handleComponentChange}
                className="fft-component-selector"
              >
                <option value="magnitude">Magnitude</option>
                <option value="phase">Phase</option>
                <option value="real">Real</option>
                <option value="imaginary">Imaginary</option>
              </select>
            </div>
          )}

          {/* Spacer to align with weight slider when FFT not yet computed */}
          {!processor.hasFFT() && hasImage && (
            <div style={{ height: "46px" }}></div>
          )}

          {/* COMPONENT CANVAS CONTAINER */}
          <div
            className={`canvas-container component-canvas ${
              isComponentDragging ? "dragging" : ""
            }`}
            onMouseDown={handleComponentMouseDown} // Start B/C drag
            onMouseMove={handleComponentMouseMove} // Apply B/C adjustments
            title="Drag to adjust brightness/contrast"
          >
            {/* Loading/placeholder messages */}
            {!processor.hasFFT() && hasImage && (
              <div className="placeholder">
                {isComputingFFT ? (
                  <p>Computing FFT...</p>
                ) : (
                  <p>FFT will appear here</p>
                )}
              </div>
            )}
            {!hasImage && (
              <div className="placeholder">
                <p>Load an image first</p>
              </div>
            )}

            {/* Actual canvas element for rendering FFT component */}
            <canvas ref={componentCanvasRef} />

            {/* Brightness/Contrast Indicator for component */}
            {processor.hasFFT() &&
              (componentBrightness !== 0 || componentContrast !== 0) && (
                <div className="bc-indicator">
                  <span>B: {Math.round(componentBrightness)}</span>
                  <span>C: {Math.round(componentContrast)}</span>
                </div>
              )}
          </div>

          {/* Drag instructions for component canvas */}
          {processor.hasFFT() && (
            <div className="drag-instructions">
              <span>🖱️ Drag: ↕️ Brightness | ↔️ Contrast</span>
            </div>
          )}

          {/* Region indicator badge - Shows selected frequency region */}
          {regionConfig && regionConfig.enabled && (
            <div className="region-indicator">
              <span className={`region-badge ${regionConfig.type}`}>
                {regionConfig.type === "inner" ? "📍 INNER" : "🌐 OUTER"}{" "}
                {regionConfig.size}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* RESET BUTTON */}
      {hasImage && hasAnyAdjustments && (
        <div className="reset-container">
          <button
            className="reset-button"
            onClick={handleReset}
            title="Reset all brightness and contrast adjustments"
          >
            RESET ALL ADJUSTMENTS
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </div>
  );
}

export default ImageViewport;
