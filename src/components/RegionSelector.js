// RegionSelector.jsx - Stage 7: Fixed with Disabled State Support

import React, { useState } from "react";
import "./RegionSelector.css";

function RegionSelector({ onRegionChange, disabled = false }) {
  const [enabled, setEnabled] = useState(false);
  const [regionType, setRegionType] = useState("inner"); // 'inner' or 'outer'
  const [regionSize, setRegionSize] = useState(50); // percentage (0-100)

  // Notify parent whenever config changes
  const notifyChange = (newEnabled, newType, newSize) => {
    const config = {
      enabled: newEnabled,
      type: newType,
      size: newSize,
    };
    console.log("RegionSelector: Notifying change", config);
    onRegionChange(config);
  };

  const handleEnableToggle = (e) => {
    const newEnabled = e.target.checked;
    setEnabled(newEnabled);
    notifyChange(newEnabled, regionType, regionSize);
  };

  const handleTypeChange = (newType) => {
    setRegionType(newType);
    notifyChange(enabled, newType, regionSize);
  };

  const handleSizeChange = (e) => {
    const newSize = parseInt(e.target.value);
    setRegionSize(newSize);
    notifyChange(enabled, regionType, newSize);
  };

  return (
    <div className="region-selector">
      <div className="region-header">
        <h3>Region Selection</h3>
        <label className="region-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleEnableToggle}
            disabled={disabled}
          />
          <span>Enable Region Filter</span>
        </label>
      </div>

      {enabled && (
        <div className="region-controls">
          {/* Region Type Selection */}
          <div className="region-type">
            <label>Region Type:</label>
            <div className="type-buttons">
              <button
                className={`type-button ${regionType === "inner" ? "active inner" : ""}`}
                onClick={() => !disabled && handleTypeChange("inner")}
                disabled={disabled}
              >
                📍 Inner (Low Freq)
              </button>
              <button
                className={`type-button ${regionType === "outer" ? "active outer" : ""}`}
                onClick={() => !disabled && handleTypeChange("outer")}
                disabled={disabled}
              >
                🌐 Outer (High Freq)
              </button>
            </div>
          </div>

          {/* Region Size Slider */}
          <div className="region-size">
            <div className="size-label">
              <label>Region Size:</label>
              <span className="size-value">{regionSize}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={regionSize}
              onChange={handleSizeChange}
              disabled={disabled}
              className="size-slider"
            />
            <div className="size-markers">
              <span>10%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Visual Guide */}
          <div className="region-guide">
            <div className="guide-box">
              <div
                className={`guide-rectangle ${regionType}`}
                style={{
                  width: `${regionSize}%`,
                  height: `${regionSize}%`,
                }}
              />
              <div className="guide-center" />
            </div>
            <p className="guide-text">
              {regionType === "inner"
                ? "✅ Selected (low frequencies - smooth features)"
                : "✅ Selected (high frequencies - edges & details)"}
            </p>
          </div>
        </div>
      )}

      {!enabled && (
        <p className="region-disabled-hint">
          Enable region selection to filter specific frequency ranges
        </p>
      )}
    </div>
  );
}

export default RegionSelector;