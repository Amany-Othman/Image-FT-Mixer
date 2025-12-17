// OutputViewport.jsx - UI ONLY - No processing logic

import React, { useRef, useEffect, useState } from "react";
import "./OutputViewport.css";

/**
 * OutputViewport Component - Handles UI for output display and controls
 * 
 * Responsibilities:
 * - Render output canvases
 * - Display mixing mode selector
 * - Display region filter controls
 * - Handle user input events
 * - Draw provided image data on canvas
 * 
 * Does NOT handle:
 * - FFT calculations
 * - Image mixing logic
 * - Region mask creation
 * - IFFT computation
 */
function OutputViewport({
  outputData1,
  outputData2,
  selectedOutput,
  onOutputSelect,
  mixMode,
  onMixModeChange,
  regionType,
  onRegionTypeChange,
  onRegionConfigChange,
}) {
  const canvas1Ref = useRef(null);
  const canvas2Ref = useRef(null);

  // Region filter UI state
  const [regionEnabled, setRegionEnabled] = useState(false);
  const [regionSize, setRegionSize] = useState(50);

  /**
   * Notify parent of region configuration changes
   */
  useEffect(() => {
    if (onRegionConfigChange) {
      const config = {
        enabled: regionEnabled,
        type: regionType,
        size: regionSize,
      };
      onRegionConfigChange(config);
    }
  }, [regionEnabled, regionType, regionSize, onRegionConfigChange]);

  /**
   * Handle region enabled toggle
   */
  const handleRegionEnabledChange = (e) => {
    setRegionEnabled(e.target.checked);
  };

  /**
   * Handle region size slider change
   */
  const handleRegionSizeChange = (e) => {
    setRegionSize(parseInt(e.target.value));
  };

  /**
   * Calculate gradient for region size slider
   * Maps 10-100 range to 0-100% for visual feedback
   */
  const getRegionSliderGradient = () => {
    const percent = ((regionSize - 10) / (100 - 10)) * 100;
    return `linear-gradient(to right, #667eea 0%, #764ba2 ${percent}%, #e0e0e0 ${percent}%, #e0e0e0 100%)`;
  };

  /**
   * Draw output 1 on canvas when data changes
   * Converts grayscale array to RGBA ImageData
   */
  useEffect(() => {
    if (!outputData1 || !canvas1Ref.current) return;

    const canvas = canvas1Ref.current;
    const ctx = canvas.getContext("2d");

    canvas.width = outputData1.width;
    canvas.height = outputData1.height;

    const imageData = ctx.createImageData(
      outputData1.width,
      outputData1.height
    );

    // Convert grayscale to RGBA
    for (let i = 0; i < outputData1.imageData.length; i++) {
      const val = outputData1.imageData[i];
      imageData.data[i * 4] = val;       // Red
      imageData.data[i * 4 + 1] = val;   // Green
      imageData.data[i * 4 + 2] = val;   // Blue
      imageData.data[i * 4 + 3] = 255;   // Alpha
    }

    ctx.putImageData(imageData, 0, 0);
  }, [outputData1]);

  /**
   * Draw output 2 on canvas when data changes
   * Converts grayscale array to RGBA ImageData
   */
  useEffect(() => {
    if (!outputData2 || !canvas2Ref.current) return;

    const canvas = canvas2Ref.current;
    const ctx = canvas.getContext("2d");

    canvas.width = outputData2.width;
    canvas.height = outputData2.height;

    const imageData = ctx.createImageData(
      outputData2.width,
      outputData2.height
    );

    // Convert grayscale to RGBA
    for (let i = 0; i < outputData2.imageData.length; i++) {
      const val = outputData2.imageData[i];
      imageData.data[i * 4] = val;       // Red
      imageData.data[i * 4 + 1] = val;   // Green
      imageData.data[i * 4 + 2] = val;   // Blue
      imageData.data[i * 4 + 3] = 255;   // Alpha
    }

    ctx.putImageData(imageData, 0, 0);
  }, [outputData2]);

  return (
    <div className="output-panel">
      {/* Mix Mode Selector */}
      <div className="control-row">
        <label className="control-label">Mode:</label>
        <select
          className="control-dropdown"
          value={mixMode}
          onChange={(e) => onMixModeChange(e.target.value)}
        >
          <option value="magnitude-phase">Magnitude/Phase</option>
          <option value="real-imaginary">Real/Imaginary</option>
        </select>
      </div>

      {/* Region Type Selector */}
      <div className="control-row">
        <label className="control-label">Region:</label>
        <select
          className="control-dropdown"
          value={regionType}
          onChange={(e) => onRegionTypeChange(e.target.value)}
        >
          <option value="inner">Inner</option>
          <option value="outer">Outer</option>
        </select>
      </div>

      {/* Enable Region Filter Toggle */}
      <div className="region-filter-toggle">
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={regionEnabled}
            onChange={handleRegionEnabledChange}
          />
          <span className="toggle-slider"></span>
        </label>
        <span className="toggle-label">Enable Region Filter</span>
      </div>

      {/* Region Size Slider - Only shown when enabled */}
      {regionEnabled && (
        <div className="region-size-control">
          <div className="slider-label-row">
            <span className="slider-name">SIZE:</span>
            <span className="slider-value">{regionSize}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={regionSize}
            onChange={handleRegionSizeChange}
            className="region-slider"
            style={{
              background: getRegionSliderGradient(),
            }}
          />
        </div>
      )}

      {/* Output Port Selector */}
      <div className="control-row">
        <label className="control-label">View:</label>
        <div className="radio-group">
          <label
            className={`radio-label ${selectedOutput === 1 ? "active" : ""}`}
          >
            <input
              type="radio"
              name="port"
              value="1"
              checked={selectedOutput === 1}
              onChange={() => onOutputSelect(1)}
            />
            <span className="radio-text">PORT 1</span>
          </label>
          <label
            className={`radio-label ${selectedOutput === 2 ? "active" : ""}`}
          >
            <input
              type="radio"
              name="port"
              value="2"
              checked={selectedOutput === 2}
              onChange={() => onOutputSelect(2)}
            />
            <span className="radio-text">PORT 2</span>
          </label>
        </div>
      </div>

      {/* Output Preview Canvases */}
      <div className="output-previews">
        {/* Port 1 Preview */}
        <div
          className={`preview-container ${
            selectedOutput === 1 ? "selected" : ""
          }`}
        >
          <div className="preview-canvas-wrapper">
            {outputData1 ? (
              <canvas ref={canvas1Ref} className="preview-canvas" />
            ) : (
              <div className="preview-placeholder">
                <p>Port 1</p>
                <span>No output</span>
              </div>
            )}
          </div>
        </div>

        {/* Port 2 Preview */}
        <div
          className={`preview-container ${
            selectedOutput === 2 ? "selected" : ""
          }`}
        >
          <div className="preview-canvas-wrapper">
            {outputData2 ? (
              <canvas ref={canvas2Ref} className="preview-canvas" />
            ) : (
              <div className="preview-placeholder">
                <p>Port 2</p>
                <span>No output</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OutputViewport;