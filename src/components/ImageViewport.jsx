// ImageViewport.jsx - Stage 6: FIXED with Region Rectangle Visualization

import React, { useState, useRef, useEffect } from "react";
import ImageProcessor from "../classes/ImageProcessor";
import BrightnessContrastControl from "./BrightnessContrastControl";
import "./ImageViewport.css";

function ImageViewport({ id, onImageLoaded, targetSize, regionConfig }) {
  const [hasImage, setHasImage] = useState(false);
  const [imageDimensions, setImageDimensions] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState("magnitude");
  const [isComputingFFT, setIsComputingFFT] = useState(false);

  // Separate adjustments for image and component
  const [imageAdjustments, setImageAdjustments] = useState({
    brightness: 0,
    contrast: 0,
  });
  const [componentAdjustments, setComponentAdjustments] = useState({
    brightness: 0,
    contrast: 0,
  });

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
      setImageAdjustments({ brightness: 0, contrast: 0 });
      setComponentAdjustments({ brightness: 0, contrast: 0 });

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

    const imageData = processor.getGrayscaleImageData();
    ctx.putImageData(imageData, 0, 0);
  };

  const drawComponent = () => {
    const canvas = componentCanvasRef.current;
    if (!canvas || !processor.hasFFT()) return;

    const ctx = canvas.getContext("2d");
    canvas.width = processor.width;
    canvas.height = processor.height;

    // Get component with adjustments
    const componentData = processor.getFFTComponentWithAdjustments(
      selectedComponent,
      componentAdjustments.brightness,
      componentAdjustments.contrast
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

    // NEW: Draw region rectangle if enabled
    drawRegionRectangle(ctx, canvas.width, canvas.height);
  };
  

  // NEW: Draw region selection rectangle on FFT canvas
  const drawRegionRectangle = (ctx, width, height) => {
    console.log('drawRegionRectangle called with regionConfig:', regionConfig);
  
  if (!regionConfig || !regionConfig.enabled) {
    console.log('Region not enabled, skipping draw');
    return;
  }
  
  console.log('Drawing rectangle!', { width, height, size: regionConfig.size, type: regionConfig.type });
    if (!regionConfig || !regionConfig.enabled) return;

    const centerX = width / 2;
    const centerY = height / 2;

    // Calculate rectangle dimensions based on region size percentage
    const rectWidth = (width * regionConfig.size) / 100;
    const rectHeight = (height * regionConfig.size) / 100;

    const x = centerX - rectWidth / 2;
    const y = centerY - rectHeight / 2;

    // Set style based on region type
    if (regionConfig.type === 'inner') {
      ctx.strokeStyle = '#00ff00'; // Green for inner (low frequencies)
      ctx.fillStyle = 'rgba(0, 255, 0, 0.1)'; // Semi-transparent green fill
    } else {
      ctx.strokeStyle = '#ff0000'; // Red for outer (high frequencies)
      ctx.fillStyle = 'rgba(255, 0, 0, 0.1)'; // Semi-transparent red fill
    }

    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // Dashed line

    // Draw filled rectangle (semi-transparent overlay)
    ctx.fillRect(x, y, rectWidth, rectHeight);

    // Draw rectangle border
    ctx.strokeRect(x, y, rectWidth, rectHeight);

    // Reset line dash
    ctx.setLineDash([]);

    // Draw center marker (DC component)
    ctx.fillStyle = regionConfig.type === 'inner' ? '#00ff00' : '#ff0000';
    ctx.fillRect(centerX - 2, centerY - 2, 4, 4);

    // Draw size label
    ctx.fillStyle = regionConfig.type === 'inner' ? '#00ff00' : '#ff0000';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(
      `${regionConfig.type.toUpperCase()} ${regionConfig.size}%`,
      10,
      height - 10
    );
  };

  const handleComponentChange = (event) => {
    setSelectedComponent(event.target.value);
  };

  // Handle image brightness/contrast adjustment
  const handleImageAdjustment = (brightness, contrast) => {
    processor.setBrightnessContrast(brightness, contrast);
    setImageAdjustments({ brightness, contrast });
    drawImage();
  };

  // Handle component brightness/contrast adjustment
  const handleComponentAdjustment = (brightness, contrast) => {
    setComponentAdjustments({ brightness, contrast });
  };

  // Redraw component when adjustments, selection, or REGION CONFIG changes
  useEffect(() => {
    if (processor.hasFFT()) {
      drawComponent();
    }
  }, [selectedComponent, componentAdjustments, regionConfig]); // Added regionConfig dependency

  useEffect(() => {
    console.log('ImageViewport received regionConfig:', regionConfig);
    if (targetSize && processor.hasImage()) {
      processor.resize(targetSize.width, targetSize.height);

      // Reset adjustments after resize
      setImageAdjustments({ brightness: 0, contrast: 0 });
      setComponentAdjustments({ brightness: 0, contrast: 0 });

      drawImage();

      if (processor.hasFFT()) {
        computeFFT();
      }
    }
  }, [targetSize]);

  const handleDoubleClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="image-viewport">
      <div className="viewport-header">
        <h3>Image {id}</h3>
        {imageDimensions && (
          <span className="dimensions">
            {imageDimensions.width} x {imageDimensions.height}
          </span>
        )}
      </div>

      {/* Original Image Display */}
      <div className="display-section">
        <h4>Original Image</h4>
        <div
          className="canvas-container"
          onDoubleClick={handleDoubleClick}
          title="Double-click to change image"
        >
          {!hasImage && (
            <div className="placeholder">
              <p>Double-click or click Browse to load an image</p>
            </div>
          )}
          <canvas ref={imageCanvasRef} />
        </div>

        {hasImage && (
          <BrightnessContrastControl
            label="Image Adjustments"
            brightness={imageAdjustments.brightness}
            contrast={imageAdjustments.contrast}
            onAdjust={handleImageAdjustment}
          />
        )}
      </div>

      {/* FFT Component Display */}
      <div className="display-section">
        <div className="section-header">
          <h4>FFT Component</h4>
          <select
            value={selectedComponent}
            onChange={handleComponentChange}
            disabled={!processor.hasFFT()}
            className="component-selector"
          >
            <option value="magnitude">FT Magnitude</option>
            <option value="phase">FT Phase</option>
            <option value="real">FT Real</option>
            <option value="imaginary">FT Imaginary</option>
          </select>
        </div>

        <div className="canvas-container component-canvas">
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
        </div>

        {processor.hasFFT() && (
          <>
            <BrightnessContrastControl
              label="Component Adjustments"
              brightness={componentAdjustments.brightness}
              contrast={componentAdjustments.contrast}
              onAdjust={handleComponentAdjustment}
            />
            
            {/* NEW: Region selection indicator */}
            {regionConfig && regionConfig.enabled && (
              <div className="region-indicator">
                <span className={`region-badge ${regionConfig.type}`}>
                  {regionConfig.type === 'inner' ? '📍 INNER' : '🌐 OUTER'} {regionConfig.size}%
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="viewport-controls">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <button onClick={() => fileInputRef.current.click()}>
          Browse Image
        </button>
      </div>
    </div>
  );
}

export default ImageViewport;