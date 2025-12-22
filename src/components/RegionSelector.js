// RegionSelector.jsx - Stage 7: Fixed with Disabled State Support

import React, { useState } from "react"; // Import React and useState for managing state
import "./RegionSelector.css"; // Import CSS for styling

function RegionSelector({ onRegionChange, disabled = false }) {
  // State to enable/disable the region filter
  const [enabled, setEnabled] = useState(false);
  // State to select region type: 'inner' = low freq, 'outer' = high freq
  const [regionType, setRegionType] = useState("inner"); 
  // State to select region size as a percentage (0-100%)
  const [regionSize, setRegionSize] = useState(50); 

  // Function to notify the parent whenever the configuration changes
  const notifyChange = (newEnabled, newType, newSize) => {
    const config = {
      enabled: newEnabled, // Whether the filter is enabled
      type: newType,       // Region type
      size: newSize,       // Region size percentage
    };
    console.log("RegionSelector: Notifying change", config);
    onRegionChange(config); // Call the parent's callback
  };

  // Handler for toggling enable/disable checkbox
  const handleEnableToggle = (e) => {
    const newEnabled = e.target.checked;
    setEnabled(newEnabled); // Update state
    notifyChange(newEnabled, regionType, regionSize); // Notify parent
  };

  // Handler for changing region type
  const handleTypeChange = (newType) => {
    setRegionType(newType);
    notifyChange(enabled, newType, regionSize); // Notify parent
  };

  // Handler for changing region size via slider
  const handleSizeChange = (e) => {
    const newSize = parseInt(e.target.value);
    setRegionSize(newSize);
    notifyChange(enabled, regionType, newSize); // Notify parent
  };

  return (
    <div className="region-selector">
      {/* Header with checkbox to enable/disable the filter */}
      <div className="region-header">
        <h3>Region Selection</h3>
        <label className="region-toggle">
          <input
            type="checkbox"
            checked={enabled} // Checkbox state tied to component state
            onChange={handleEnableToggle} // Call handler when toggled
            disabled={disabled} // Disable checkbox if prop disabled = true
          />
          <span>Enable Region Filter</span>
        </label>
      </div>

      {/* Controls appear only if enabled = true */}
      {enabled && (
        <div className="region-controls">
          {/* Region Type Selection */}
          <div className="region-type">
            <label>Region Type:</label>
            <div className="type-buttons">
              {/* Inner button */}
              <button
                className={`type-button ${regionType === "inner" ? "active inner" : ""}`} // Active if inner
                onClick={() => !disabled && handleTypeChange("inner")} // Change type if not disabled
                disabled={disabled} // Disable if prop disabled
              >
                📍 Inner (Low Freq)
              </button>
              {/* Outer button */}
              <button
                className={`type-button ${regionType === "outer" ? "active outer" : ""}`} // Active if outer
                onClick={() => !disabled && handleTypeChange("outer")} // Change type if not disabled
                disabled={disabled} // Disable if prop disabled
              >
                🌐 Outer (High Freq)
              </button>
            </div>
          </div>

          {/* Region Size Slider */}
          <div className="region-size">
            <div className="size-label">
              <label>Region Size:</label>
              <span className="size-value">{regionSize}%</span> {/* Display current size */}
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={regionSize} // Slider value tied to state
              onChange={handleSizeChange} // Update state on change
              disabled={disabled} // Disable if prop disabled
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
              {/* Rectangle representing selected region */}
              <div
                className={`guide-rectangle ${regionType}`} // CSS class inner/outer for coloring
                style={{
                  width: `${regionSize}%`,
                  height: `${regionSize}%`,
                }}
              />
              <div className="guide-center" /> {/* Center marker */}
            </div>
            {/* Text explaining what the selected region represents */}
            <p className="guide-text">
              {regionType === "inner"
                ? "✅ Selected (low frequencies - smooth features)"
                : "✅ Selected (high frequencies - edges & details)"}
            </p>
          </div>
        </div>
      )}

      {/* Hint shown when filter is not enabled */}
      {!enabled && (
        <p className="region-disabled-hint">
          Enable region selection to filter specific frequency ranges
        </p>
      )}
    </div>
  );
}

export default RegionSelector; // Export component for use elsewhere
