// OutputViewport.jsx - With improved region controls matching contrast slider design
import React, { useRef, useEffect, useState } from "react";
import "./OutputViewport.css";

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

  // Region filter state
  const [regionEnabled, setRegionEnabled] = useState(false);
  const [regionSize, setRegionSize] = useState(50);

  // Notify parent of region config changes
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

  const handleRegionEnabledChange = (e) => {
    setRegionEnabled(e.target.checked);
  };

  const handleRegionSizeChange = (e) => {
    setRegionSize(parseInt(e.target.value));
  };

  // Calculate gradient that fills from LEFT to thumb position (0-100 range)
  const getRegionSliderGradient = () => {
    // Map 10-100 range to 0-100% for gradient
    const percent = ((regionSize - 10) / (100 - 10)) * 100;
    return `linear-gradient(to right, #667eea 0%, #764ba2 ${percent}%, #e0e0e0 ${percent}%, #e0e0e0 100%)`;
  };

  // Draw output 1
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

    for (let i = 0; i < outputData1.imageData.length; i++) {
      const val = outputData1.imageData[i];
      imageData.data[i * 4] = val;
      imageData.data[i * 4 + 1] = val;
      imageData.data[i * 4 + 2] = val;
      imageData.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }, [outputData1]);

  // Draw output 2
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

    for (let i = 0; i < outputData2.imageData.length; i++) {
      const val = outputData2.imageData[i];
      imageData.data[i * 4] = val;
      imageData.data[i * 4 + 1] = val;
      imageData.data[i * 4 + 2] = val;
      imageData.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }, [outputData2]);

  return (
    <div className="output-panel">
      {/* Mode Selector */}
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

      {/* Enable Region Filter Toggle - Improved Design */}
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

      {/* Region Size Slider - Matching Contrast Slider Design */}
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

      {/* View/Port Selector */}
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

      {/* Output Previews */}
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
