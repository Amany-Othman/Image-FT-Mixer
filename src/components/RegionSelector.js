// RegionSelector.js - Handles frequency region selection

import React, { useState } from 'react';
import './RegionSelector.css';

function RegionSelector({ onRegionChange }) {
  const [regionSize, setRegionSize] = useState(30); // Percentage of image
  const [regionType, setRegionType] = useState('inner'); // 'inner' or 'outer'
  const [isEnabled, setIsEnabled] = useState(false);

  const handleSizeChange = (e) => {
    const newSize = parseInt(e.target.value);
    setRegionSize(newSize);
    
    if (isEnabled && onRegionChange) {
      onRegionChange({
        enabled: true,
        size: newSize,
        type: regionType
      });
    }
  };

  const handleTypeChange = (type) => {
    setRegionType(type);
    
    if (isEnabled && onRegionChange) {
      onRegionChange({
        enabled: true,
        size: regionSize,
        type: type
      });
    }
  };

  const handleToggle = (e) => {
    const enabled = e.target.checked;
    setIsEnabled(enabled);
    
    if (onRegionChange) {
      onRegionChange({
        enabled: enabled,
        size: regionSize,
        type: regionType
      });
    }
  };

  return (
    <div className="region-selector">
      <div className="region-header">
        <label className="region-toggle">
          <input 
            type="checkbox" 
            checked={isEnabled}
            onChange={handleToggle}
          />
          <span className="toggle-label">
            🎯 Enable Region Selection
          </span>
        </label>
      </div>

      {isEnabled && (
        <div className="region-controls">
          {/* Region Type Selection */}
          <div className="region-type-section">
            <label className="control-label">Region Type:</label>
            <div className="region-type-buttons">
              <button
                className={`region-btn ${regionType === 'inner' ? 'active' : ''}`}
                onClick={() => handleTypeChange('inner')}
              >
                📍 Inner (Low Freq)
              </button>
              <button
                className={`region-btn ${regionType === 'outer' ? 'active' : ''}`}
                onClick={() => handleTypeChange('outer')}
              >
                🌐 Outer (High Freq)
              </button>
            </div>
            <p className="region-hint">
              {regionType === 'inner' 
                ? '📍 Inner: Selects smooth, low-frequency content (structure, overall shape)'
                : '🌐 Outer: Selects sharp, high-frequency content (edges, fine details)'}
            </p>
          </div>

          {/* Region Size Slider */}
          <div className="region-size-section">
            <label className="control-label">
              Region Size: <strong>{regionSize}%</strong>
            </label>
            <input
              type="range"
              min="10"
              max="90"
              value={regionSize}
              onChange={handleSizeChange}
              className="region-slider"
            />
            <div className="slider-labels">
              <span>10% (Small)</span>
              <span>50% (Medium)</span>
              <span>90% (Large)</span>
            </div>
          </div>

          {/* Visual Guide */}
          <div className="region-visual-guide">
            <div className="guide-label">Preview:</div>
            <div className="guide-box">
              <div 
                className="guide-inner"
                style={{
                  width: `${regionSize}%`,
                  height: `${regionSize}%`,
                  opacity: regionType === 'inner' ? 0.6 : 0.2
                }}
              />
              <div className="guide-center">DC</div>
            </div>
            <p className="guide-text">
              {regionType === 'inner' 
                ? `✓ Using ${regionSize}% center region`
                : `✓ Using outer ${100 - regionSize}% region`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegionSelector;