// BrightnessContrastControl.jsx - Mouse drag control for brightness/contrast

import React, { useState, useRef, useEffect } from "react";
import "./BrightnessContrastControl.css";

function BrightnessContrastControl({
  onAdjust,
  brightness = 0,
  contrast = 0,
  label = "Image",
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentAdjustments, setCurrentAdjustments] = useState({
    brightness,
    contrast,
  });

  const containerRef = useRef(null);

  // Update when props change
  useEffect(() => {
    setCurrentAdjustments({ brightness, contrast });
  }, [brightness, contrast]);

  // Handle mouse down - start dragging
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setStartPos({
      x: e.clientX,
      y: e.clientY,
    });
  };

  // Handle mouse move - adjust values
  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startPos.x;
    const deltaY = e.clientY - startPos.y;

    // Sensitivity factor
    const sensitivity = 0.5;

    // Horizontal = contrast, Vertical = brightness
    const contrastDelta = deltaX * sensitivity;
    const brightnessDelta = -deltaY * sensitivity; // Negative because up = increase

    const newBrightness = Math.max(
      -100,
      Math.min(100, currentAdjustments.brightness + brightnessDelta)
    );
    const newContrast = Math.max(
      -100,
      Math.min(100, currentAdjustments.contrast + contrastDelta)
    );

    setCurrentAdjustments({
      brightness: newBrightness,
      contrast: newContrast,
    });

    setStartPos({ x: e.clientX, y: e.clientY });

    // Notify parent
    if (onAdjust) {
      onAdjust(newBrightness, newContrast);
    }
  };

  // Handle mouse up - stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle reset
  const handleReset = () => {
    setCurrentAdjustments({ brightness: 0, contrast: 0 });
    if (onAdjust) {
      onAdjust(0, 0);
    }
  };

  // Add global mouse move and up listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, startPos, currentAdjustments]);

  return (
    <div className="brightness-contrast-control">
      <div className="control-label">{label}</div>

      <div
        ref={containerRef}
        className={`drag-area ${isDragging ? "dragging" : ""}`}
        onMouseDown={handleMouseDown}
      >
        <div className="drag-instructions">
          {isDragging ? "↕ Brightness | ↔ Contrast" : "Click & Drag"}
        </div>

        <div className="values-display">
          <div className="value-item">
            <span className="value-label">B:</span>
            <span className="value-number">
              {Math.round(currentAdjustments.brightness)}
            </span>
          </div>
          <div className="value-item">
            <span className="value-label">C:</span>
            <span className="value-number">
              {Math.round(currentAdjustments.contrast)}
            </span>
          </div>
        </div>

        {(currentAdjustments.brightness !== 0 ||
          currentAdjustments.contrast !== 0) && (
          <button
            className="reset-button"
            onClick={handleReset}
            title="Reset to default"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

export default BrightnessContrastControl;
