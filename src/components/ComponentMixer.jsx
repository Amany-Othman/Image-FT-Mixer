// ComponentMixer.jsx - Stage 6: FIXED with Region Config Exposure

import React, { useState, useEffect } from "react";
import RegionSelector from "./RegionSelector";
import "./ComponentMixer.css";

function ComponentMixer({ processors, onMix, onRegionConfigChange }) {
  const [mixMode, setMixMode] = useState("magnitude-phase");
  const [weights, setWeights] = useState([0.25, 0.25, 0.25, 0.25]);
  const [regionConfig, setRegionConfig] = useState(null);
  const [isMixing, setIsMixing] = useState(false);

  // Check how many images have FFT
  const availableProcessors = processors.filter((p) => p && p.hasFFT());
  const canMix = availableProcessors.length > 0;

  // Handle weight change for a specific image
  const handleWeightChange = (index, value) => {
    const newWeights = [...weights];
    newWeights[index] = parseFloat(value);
    setWeights(newWeights);
  };

  // Handle mix mode change
  const handleMixModeChange = (event) => {
    setMixMode(event.target.value);
  };

  // NEW: Handle region selection change and notify parent
  const handleRegionChange = (config) => {
    setRegionConfig(config);
    console.log('Region config updated:', config);
    
    // Notify parent (App.js) so it can pass to ImageViewports
    if (onRegionConfigChange) {
      onRegionConfigChange(config);
    }
  };

  // Handle mix button click
  const handleMixClick = async () => {
    if (!canMix) return;

    setIsMixing(true);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        // Pass regionConfig to onMix
        onMix(availableProcessors, weights, mixMode, regionConfig);
      } catch (error) {
        console.error("Error mixing:", error);
        alert("Error during mixing: " + error.message);
      }
      setIsMixing(false);
    }, 100);
  };

  // Reset weights to equal distribution
  const handleResetWeights = () => {
    const equalWeight = 1.0 / availableProcessors.length;
    setWeights([equalWeight, equalWeight, equalWeight, equalWeight]);
  };

  // Normalize weights to sum to 1
  const normalizeWeights = () => {
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum === 0) return;
    const normalized = weights.map((w) => w / sum);
    setWeights(normalized);
  };

  return (
    <div className="component-mixer">
      <div className="mixer-header">
        <h2>Component Mixer</h2>
        <div className="available-images">
          {availableProcessors.length} / 4 images ready
        </div>
      </div>

      {!canMix && (
        <div className="mixer-warning">
          <p>⚠️ Load at least one image with FFT to start mixing</p>
        </div>
      )}

      {canMix && (
        <>
          {/* Mix Mode Selection */}
          <div className="mixer-section">
            <h3>Mix Mode</h3>
            <div className="mode-selector">
              <label className={mixMode === "magnitude-phase" ? "active" : ""}>
                <input
                  type="radio"
                  value="magnitude-phase"
                  checked={mixMode === "magnitude-phase"}
                  onChange={handleMixModeChange}
                />
                <span>Magnitude & Phase</span>
              </label>
              <label className={mixMode === "real-imaginary" ? "active" : ""}>
                <input
                  type="radio"
                  value="real-imaginary"
                  checked={mixMode === "real-imaginary"}
                  onChange={handleMixModeChange}
                />
                <span>Real & Imaginary</span>
              </label>
            </div>
          </div>

          {/* Region Selection */}
          <div className="mixer-section">
            <RegionSelector onRegionChange={handleRegionChange} />
          </div>

          {/* Weight Sliders */}
          <div className="mixer-section">
            <div className="section-header-row">
              <h3>Image Weights</h3>
              <div className="weight-controls">
                <button
                  className="secondary-button"
                  onClick={normalizeWeights}
                  title="Normalize weights to sum to 1"
                >
                  Normalize
                </button>
                <button
                  className="secondary-button"
                  onClick={handleResetWeights}
                >
                  Reset to Equal
                </button>
              </div>
            </div>

            <div className="weights-grid">
              {[0, 1, 2, 3].map((index) => {
                const hasFFT = processors[index] && processors[index].hasFFT();
                return (
                  <div
                    key={index}
                    className={`weight-control ${!hasFFT ? "disabled" : ""}`}
                  >
                    <div className="weight-label">
                      <span className="image-number">Image {index + 1}</span>
                      <span className="weight-value">
                        {(weights[index] * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={weights[index]}
                      onChange={(e) =>
                        handleWeightChange(index, e.target.value)
                      }
                      disabled={!hasFFT}
                      className="weight-slider"
                    />
                  </div>
                );
              })}
            </div>

            <div className="weight-sum">
              Total: {(weights.reduce((a, b) => a + b, 0) * 100).toFixed(0)}%
              {Math.abs(weights.reduce((a, b) => a + b, 0) - 1.0) > 0.01 && (
                <span className="sum-warning"> (Should be 100%)</span>
              )}
            </div>
          </div>

          {/* Mix Button */}
          <div className="mixer-section">
            <button
              className="mix-button"
              onClick={handleMixClick}
              disabled={isMixing}
            >
              {isMixing ? "Mixing..." : "Mix Images"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ComponentMixer;