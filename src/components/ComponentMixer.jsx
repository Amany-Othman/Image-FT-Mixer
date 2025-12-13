// ComponentMixer.jsx - Stage 7: Clean UI, No Progress Bar

import React, { useState, useEffect, useRef } from "react";
import RegionSelector from "./RegionSelector";
import "./ComponentMixer.css";

function ComponentMixer({ processors, onMix, onRegionConfigChange }) {
  const [mixMode, setMixMode] = useState("magnitude-phase");
  const [weights, setWeights] = useState([0.25, 0.25, 0.25, 0.25]); // Default 25% each
  const [regionConfig, setRegionConfig] = useState(null);
  const [isMixing, setIsMixing] = useState(false);

  // Refs for cancellation and debouncing
  const cancelRef = useRef(false);
  const debounceTimerRef = useRef(null);
  const mixCountRef = useRef(0);

  // Check how many images have FFT
  const availableProcessors = processors.filter((p) => p && p.hasFFT());
  const canMix = availableProcessors.length > 0;

  // REAL-TIME: Auto-trigger mix whenever settings change
  useEffect(() => {
    if (!canMix) return;

    // Debounce: Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Start new timer
    debounceTimerRef.current = setTimeout(() => {
      performMix();
    }, 500);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [weights, mixMode, regionConfig, canMix]);

  // Handle weight change
  const handleWeightChange = (index, value) => {
    const newWeights = [...weights];
    newWeights[index] = parseFloat(value);
    setWeights(newWeights);
  };

  // Handle mix mode change
  const handleMixModeChange = (event) => {
    setMixMode(event.target.value);
  };

  // Handle region selection change
  const handleRegionChange = (config) => {
    setRegionConfig(config);
    console.log('Region config updated:', config);
    
    if (onRegionConfigChange) {
      onRegionConfigChange(config);
    }
  };

  // Perform the actual mixing (silently, no progress bar)
  const performMix = async () => {
    // Cancel any previous operation
    if (isMixing) {
      cancelRef.current = true;
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Start new operation
    const currentMixId = ++mixCountRef.current;
    cancelRef.current = false;
    setIsMixing(true);

    console.log(`🚀 Starting real-time mix #${currentMixId}`);

    try {
      // Perform mixing without progress bar
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            if (cancelRef.current) {
              console.log(`Mix #${currentMixId} cancelled`);
              resolve();
              return;
            }

            onMix(availableProcessors, weights, mixMode, regionConfig);
            resolve();
          } catch (error) {
            reject(error);
          }
        }, 50);
      });

      // Check if cancelled
      if (!cancelRef.current) {
        console.log(`✅ Mix #${currentMixId} completed`);
      }

      setIsMixing(false);

    } catch (error) {
      console.error("Error mixing:", error);
      setIsMixing(false);
    }
  };

  // Reset weights to 25% each
  const handleResetWeights = () => {
    setWeights([0.25, 0.25, 0.25, 0.25]);
  };

  // Normalize weights
  const normalizeWeights = () => {
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum === 0) return;
    const normalized = weights.map((w) => w / sum);
    setWeights(normalized);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      cancelRef.current = true;
    };
  }, []);

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
            <RegionSelector 
              onRegionChange={handleRegionChange}
            />
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
        </>
      )}
    </div>
  );
}

export default ComponentMixer;