// ImageViewport.jsx - Fixed
import React, { useState, useRef, useEffect } from "react";
import ImageProcessor from "../classes/ImageProcessor";
import "./ImageViewport.css";

function ImageViewport({ id, onImageLoaded, targetSize, regionConfig }) {
  const [hasImage, setHasImage] = useState(false);
  const [imageDimensions, setImageDimensions] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState("magnitude");
  const [isComputingFFT, setIsComputingFFT] = useState(false);

  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);

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
      setBrightness(0);
      setContrast(0);

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

    const componentData = processor.getFFTComponent(selectedComponent);

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
    if (processor.hasFFT()) {
      drawComponent();
    }
  };

  const handleBrightnessChange = (e) => {
    const value = parseInt(e.target.value);
    setBrightness(value);
    processor.setBrightnessContrast(value, contrast);
    drawImage();
  };

  const handleContrastChange = (e) => {
    const value = parseInt(e.target.value);
    setContrast(value);
    processor.setBrightnessContrast(brightness, value);
    drawImage();
  };

  const handleReset = () => {
    setBrightness(0);
    setContrast(0);
    processor.setBrightnessContrast(0, 0);
    drawImage();
  };

  // FIXED: Calculate proper gradient percentage
  const getBrightnessGradient = () => {
    const percent = ((brightness + 100) / 200) * 100;
    return `linear-gradient(to right, #667eea 0%, #764ba2 ${percent}%, #e0e0e0 ${percent}%, #e0e0e0 100%)`;
  };

  const getContrastGradient = () => {
    const percent = ((contrast + 100) / 200) * 100;
    return `linear-gradient(to right, #667eea 0%, #764ba2 ${percent}%, #e0e0e0 ${percent}%, #e0e0e0 100%)`;
  };

  useEffect(() => {
    if (processor.hasFFT()) {
      drawComponent();
    }
  }, [regionConfig]);

  useEffect(() => {
    if (targetSize && processor.hasImage()) {
      processor.resize(targetSize.width, targetSize.height);

      setBrightness(0);
      setContrast(0);

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
      {/* Side by Side Layout */}
      <div className="display-sections-container">
        {/* Original Image Display */}
        <div className="display-section">
          <div className="section-header">
            <h4>ORIGINAL IMAGE</h4>
          </div>
          <div
            className="canvas-container"
            onDoubleClick={handleDoubleClick}
            title="Double-click to change image"
          >
            {!hasImage && (
              <div className="placeholder">
                <p>Double-click to load</p>
              </div>
            )}
            <canvas ref={imageCanvasRef} />
          </div>

          {/* BRIGHTNESS SLIDER - FIXED GRADIENT */}
          {hasImage && (
            <div className="slider-control brightness-control">
              <div className="slider-label">
                <span className="slider-name">BRIGHTNESS:</span>
                <span className="slider-value">{brightness}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={brightness}
                onChange={handleBrightnessChange}
                className="slider"
                style={{
                  "--slider-bg": getBrightnessGradient(),
                }}
              />
            </div>
          )}
        </div>

        {/* FFT Component Display */}
        <div className="display-section">
          <div className="section-header">
            <h4>FFT COMPONENT</h4>
            <select
              value={selectedComponent}
              onChange={handleComponentChange}
              disabled={!processor.hasFFT()}
              className="component-selector"
            >
              <option value="magnitude">Magnitude</option>
              <option value="phase">Phase</option>
              <option value="real">Real</option>
              <option value="imaginary">Imaginary</option>
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

          {/* CONTRAST SLIDER - FIXED GRADIENT */}
          {hasImage && (
            <div className="slider-control contrast-control">
              <div className="slider-label">
                <span className="slider-name">CONTRAST:</span>
                <span className="slider-value">{contrast}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={contrast}
                onChange={handleContrastChange}
                className="slider"
                style={{
                  "--slider-bg": getContrastGradient(),
                }}
              />
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

      {/* RESET BUTTON - NOW PER IMAGE */}
      {hasImage && (brightness !== 0 || contrast !== 0) && (
        <div className="reset-container">
          <button
            className="reset-button"
            onClick={handleReset}
            title="Reset brightness and contrast to default"
          >
            RESET CONTROLS
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
