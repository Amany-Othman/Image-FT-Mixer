// ImageViewport.jsx - With mouse-drag brightness/contrast controls
import React, { useState, useRef, useEffect } from "react";
import ImageProcessor from "../classes/ImageProcessor";
import "./ImageViewport.css";

function ImageViewport({
  id,
  onImageLoaded,
  targetSize,
  regionConfig,
  weight,
  onWeightChange,
  isDisabled,
}) {
  const [hasImage, setHasImage] = useState(false);
  const [imageDimensions, setImageDimensions] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState("magnitude");
  const [isComputingFFT, setIsComputingFFT] = useState(false);

  // Separate brightness/contrast for image and FFT component
  const [imageBrightness, setImageBrightness] = useState(0);
  const [imageContrast, setImageContrast] = useState(0);
  const [componentBrightness, setComponentBrightness] = useState(0);
  const [componentContrast, setComponentContrast] = useState(0);

  // Mouse drag state for image canvas
  const [isImageDragging, setIsImageDragging] = useState(false);
  const [imageDragStart, setImageDragStart] = useState({ x: 0, y: 0 });
  const [imageDragStartValues, setImageDragStartValues] = useState({ brightness: 0, contrast: 0 });

  // Mouse drag state for component canvas
  const [isComponentDragging, setIsComponentDragging] = useState(false);
  const [componentDragStart, setComponentDragStart] = useState({ x: 0, y: 0 });
  const [componentDragStartValues, setComponentDragStartValues] = useState({ brightness: 0, contrast: 0 });

  const processorRef = useRef(new ImageProcessor());
  const imageCanvasRef = useRef(null);
  const componentCanvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const processor = processorRef.current;

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const result = await processor.loadImage(file);

      setHasImage(true);
      setImageDimensions({ width: result.width, height: result.height });
      
      // Reset all brightness/contrast values
      setImageBrightness(0);
      setImageContrast(0);
      setComponentBrightness(0);
      setComponentContrast(0);

      onImageLoaded(id, processor);

      drawImage();
      computeFFT();
    } catch (error) {
      console.error("Error loading image:", error);
      alert("Failed to load image. Please try another file.");
    }
  };

  const computeFFT = async () => {
    setIsComputingFFT(true);

    setTimeout(() => {
      try {
        processor.computeFFT();
        drawComponent();
      } catch (error) {
        console.error("Error computing FFT:", error);
      }
      setIsComputingFFT(false);
    }, 100);
  };

  const drawImage = () => {
    const canvas = imageCanvasRef.current;
    if (!canvas || !processor.hasImage()) return;

    const ctx = canvas.getContext("2d");
    canvas.width = processor.width;
    canvas.height = processor.height;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply brightness/contrast to the image
    processor.setBrightnessContrast(imageBrightness, imageContrast);
    const imageData = processor.getGrayscaleImageData();
    ctx.putImageData(imageData, 0, 0);
  };

  const drawComponent = () => {
    const canvas = componentCanvasRef.current;
    if (!canvas || !processor.hasFFT()) return;

    const ctx = canvas.getContext("2d");
    canvas.width = processor.width;
    canvas.height = processor.height;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Get component data with brightness/contrast adjustments
    const componentData = processor.getFFTComponentWithAdjustments(
      selectedComponent,
      componentBrightness,
      componentContrast
    );

    if (!componentData) return;

    const imageData = new ImageData(processor.width, processor.height);
    const data = imageData.data;

    for (let i = 0; i < componentData.length; i++) {
      const value = componentData[i];
      const idx = i * 4;

      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
      data[idx + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);

    drawRegionRectangle(ctx, canvas.width, canvas.height);
  };

  const drawRegionRectangle = (ctx, width, height) => {
    if (!regionConfig || !regionConfig.enabled) return;

    const centerX = width / 2;
    const centerY = height / 2;

    const rectWidth = (width * regionConfig.size) / 100;
    const rectHeight = (height * regionConfig.size) / 100;

    const x = centerX - rectWidth / 2;
    const y = centerY - rectHeight / 2;

    if (regionConfig.type === "inner") {
      ctx.strokeStyle = "#00c000";
      ctx.fillStyle = "rgba(0, 200, 0, 0.1)";
    } else {
      ctx.strokeStyle = "#ff5050";
      ctx.fillStyle = "rgba(255, 80, 80, 0.1)";
    }

    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    ctx.fillRect(x, y, rectWidth, rectHeight);
    ctx.strokeRect(x, y, rectWidth, rectHeight);

    ctx.setLineDash([]);

    ctx.fillStyle = regionConfig.type === "inner" ? "#00c000" : "#ff5050";
    ctx.fillRect(centerX - 2, centerY - 2, 4, 4);

    ctx.fillStyle = regionConfig.type === "inner" ? "#00a000" : "#d00000";
    ctx.font = "bold 11px Arial";
    ctx.fillText(
      `${regionConfig.type.toUpperCase()} ${regionConfig.size}%`,
      10,
      height - 10
    );
  };

  const handleComponentChange = (event) => {
    setSelectedComponent(event.target.value);
    // Reset component brightness/contrast when switching components
    setComponentBrightness(0);
    setComponentContrast(0);
    if (processor.hasFFT()) {
      drawComponent();
    }
  };

  // ==================== IMAGE CANVAS MOUSE HANDLERS ====================
  
  const handleImageMouseDown = (e) => {
    if (!hasImage) return;
    
    setIsImageDragging(true);
    setImageDragStart({ x: e.clientX, y: e.clientY });
    setImageDragStartValues({ 
      brightness: imageBrightness, 
      contrast: imageContrast 
    });
    
    e.preventDefault();
  };

  const handleImageMouseMove = (e) => {
    if (!isImageDragging) return;

    const deltaX = e.clientX - imageDragStart.x;
    const deltaY = e.clientY - imageDragStart.y;

    // Left/Right = Contrast (sensitivity: 0.5 per pixel)
    const newContrast = Math.max(-100, Math.min(100, 
      imageDragStartValues.contrast + deltaX * 0.5
    ));

    // Up/Down = Brightness (sensitivity: 0.5 per pixel, inverted)
    const newBrightness = Math.max(-100, Math.min(100, 
      imageDragStartValues.brightness - deltaY * 0.5
    ));

    setImageContrast(newContrast);
    setImageBrightness(newBrightness);
    
    drawImage();
  };

  const handleImageMouseUp = () => {
    setIsImageDragging(false);
  };

  // ==================== COMPONENT CANVAS MOUSE HANDLERS ====================
  
  const handleComponentMouseDown = (e) => {
    if (!processor.hasFFT()) return;
    
    setIsComponentDragging(true);
    setComponentDragStart({ x: e.clientX, y: e.clientY });
    setComponentDragStartValues({ 
      brightness: componentBrightness, 
      contrast: componentContrast 
    });
    
    e.preventDefault();
  };

  const handleComponentMouseMove = (e) => {
    if (!isComponentDragging) return;

    const deltaX = e.clientX - componentDragStart.x;
    const deltaY = e.clientY - componentDragStart.y;

    // Left/Right = Contrast
    const newContrast = Math.max(-100, Math.min(100, 
      componentDragStartValues.contrast + deltaX * 0.5
    ));

    // Up/Down = Brightness (inverted)
    const newBrightness = Math.max(-100, Math.min(100, 
      componentDragStartValues.brightness - deltaY * 0.5
    ));

    setComponentContrast(newContrast);
    setComponentBrightness(newBrightness);
    
    drawComponent();
  };

  const handleComponentMouseUp = () => {
    setIsComponentDragging(false);
  };

  // Global mouse up handler
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsImageDragging(false);
      setIsComponentDragging(false);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Handle reset
  const handleReset = () => {
    setImageBrightness(0);
    setImageContrast(0);
    setComponentBrightness(0);
    setComponentContrast(0);
    
    processor.setBrightnessContrast(0, 0);
    drawImage();
    
    if (processor.hasFFT()) {
      drawComponent();
    }
  };

  useEffect(() => {
    if (processor.hasFFT()) {
      drawComponent();
    }
  }, [regionConfig]);

  useEffect(() => {
    if (targetSize && processor.hasImage()) {
      processor.resize(targetSize.width, targetSize.height);

      // Reset all adjustments on resize
      setImageBrightness(0);
      setImageContrast(0);
      setComponentBrightness(0);
      setComponentContrast(0);

      drawImage();

      if (processor.hasFFT()) {
        computeFFT();
      }
    }
  }, [targetSize]);

  const handleDoubleClick = () => {
    fileInputRef.current.click();
  };

  const hasAnyAdjustments = imageBrightness !== 0 || imageContrast !== 0 || 
                            componentBrightness !== 0 || componentContrast !== 0;

  return (
    <div className="image-viewport">
      {/* Side by Side Layout */}
      <div className="display-sections-container">
        {/* Original Image Display */}
        <div className="display-section">
          <div className="section-header">
            <h4>ORIGINAL IMAGE</h4>
          </div>

          {/* WEIGHT SLIDER with LABEL */}
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
                disabled={isDisabled}
                className="weight-slider-input"
                style={{
                  background: `linear-gradient(to right, #667eea 0%, #764ba2 ${
                    weight * 100
                  }%, #e0e0e0 ${weight * 100}%, #e0e0e0 100%)`,
                }}
              />
            </div>
          )}

          <div
            className={`canvas-container ${isImageDragging ? 'dragging' : ''}`}
            onDoubleClick={handleDoubleClick}
            onMouseDown={handleImageMouseDown}
            onMouseMove={handleImageMouseMove}
            title="Double-click to change image | Drag to adjust brightness/contrast"
          >
            {!hasImage && (
              <div className="placeholder">
                <p>Double-click to load</p>
              </div>
            )}
            <canvas ref={imageCanvasRef} />
            
            {/* Brightness/Contrast Indicator for Image */}
            {hasImage && (imageBrightness !== 0 || imageContrast !== 0) && (
              <div className="bc-indicator">
                <span>B: {Math.round(imageBrightness)}</span>
                <span>C: {Math.round(imageContrast)}</span>
              </div>
            )}
          </div>

          {/* Instructions */}
          {hasImage && (
            <div className="drag-instructions">
              <span>🖱️ Drag: ↕️ Brightness | ↔️ Contrast</span>
            </div>
          )}
        </div>

        {/* FFT Component Display */}
        <div className="display-section">
          <div className="section-header">
            <h4>FFT COMPONENT</h4>
          </div>

          {/* FFT COMPONENT SELECTOR - Full width above canvas */}
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

          {/* Add spacer when no FFT but has image to align with weight slider */}
          {!processor.hasFFT() && hasImage && (
            <div style={{ height: "46px" }}></div>
          )}

          <div 
            className={`canvas-container component-canvas ${isComponentDragging ? 'dragging' : ''}`}
            onMouseDown={handleComponentMouseDown}
            onMouseMove={handleComponentMouseMove}
            title="Drag to adjust brightness/contrast"
          >
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
            <canvas ref={componentCanvasRef} />
            
            {/* Brightness/Contrast Indicator for Component */}
            {processor.hasFFT() && (componentBrightness !== 0 || componentContrast !== 0) && (
              <div className="bc-indicator">
                <span>B: {Math.round(componentBrightness)}</span>
                <span>C: {Math.round(componentContrast)}</span>
              </div>
            )}
          </div>

          {/* Instructions */}
          {processor.hasFFT() && (
            <div className="drag-instructions">
              <span>🖱️ Drag: ↕️ Brightness | ↔️ Contrast</span>
            </div>
          )}

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