// OutputViewport.js - Stage 5: Enhanced with selection indicator

import React, { useRef, useEffect, useState } from 'react';
import './OutputViewport.css';

function OutputViewport({ id, outputData, isSelected }) {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);

  // Draw output image with brightness/contrast
  useEffect(() => {
    if (!outputData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = outputData.width;
    canvas.height = outputData.height;

    // Apply brightness/contrast adjustments
    const adjustedData = applyAdjustments(outputData.imageData, brightness, contrast);

    // Create ImageData
    const imageData = ctx.createImageData(outputData.width, outputData.height);
    for (let i = 0; i < adjustedData.length; i++) {
      const gray = adjustedData[i];
      const idx = i * 4;
      imageData.data[idx] = gray;
      imageData.data[idx + 1] = gray;
      imageData.data[idx + 2] = gray;
      imageData.data[idx + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }, [outputData, brightness, contrast]);

  // Apply brightness and contrast
  const applyAdjustments = (data, brightness, contrast) => {
    const adjusted = new Uint8ClampedArray(data.length);
    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < data.length; i++) {
      let pixel = data[i];
      pixel = contrastFactor * (pixel - 128) + 128;
      pixel = pixel + brightness;
      adjusted[i] = Math.max(0, Math.min(255, pixel));
    }

    return adjusted;
  };

  // Mouse drag handlers for brightness/contrast
  const handleMouseDown = (e) => {
    if (!outputData) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    // Horizontal = contrast, Vertical = brightness
    const contrastDelta = deltaX * 0.5;
    const brightnessDelta = -deltaY * 0.5;

    setBrightness(prev => Math.max(-100, Math.min(100, prev + brightnessDelta)));
    setContrast(prev => Math.max(-100, Math.min(100, prev + contrastDelta)));

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset adjustments
  const handleReset = () => {
    setBrightness(0);
    setContrast(0);
  };

  return (
    <div className={`output-viewport ${isSelected ? 'selected' : ''}`}>
      <div className="viewport-header">
        <h3>OUTPUT {id}</h3>
        {isSelected && <span className="selected-badge">📍 Active</span>}
        <span className="viewport-size">
          {outputData ? `${outputData.width} x ${outputData.height}` : 'No output'}
        </span>
      </div>

      <div className="viewport-content">
        <div 
          className="canvas-container"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {outputData ? (
            <canvas ref={canvasRef} className="output-canvas" />
          ) : (
            <div className="empty-output">
              <p>🎯 No output yet</p>
              <p className="hint">Mix images to see result here</p>
            </div>
          )}
        </div>

        {outputData && (
          <div className="viewport-controls">
            <div className="adjustment-info">
              <span>Brightness: {brightness.toFixed(0)}</span>
              <span>Contrast: {contrast.toFixed(0)}</span>
            </div>
            <button 
              className="reset-btn"
              onClick={handleReset}
            >
              Reset Adjustments
            </button>
            <p className="hint">💡 Drag: ↕️ Brightness | ↔️ Contrast</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default OutputViewport;