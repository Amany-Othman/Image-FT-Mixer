// ComponentMixer.jsx - Updated to receive mixMode as prop

import React, { useState, useEffect, useRef } from "react";
import RegionSelector from "./RegionSelector";
import "./ComponentMixer.css";

function ComponentMixer({
  processors,
  onMix,
  onRegionConfigChange,
  mixMode,
  onMixModeChange,
}) {
  const [weights, setWeights] = useState([0.25, 0.25, 0.25, 0.25]);
  const [regionConfig, setRegionConfig] = useState(null);
  const [isMixing, setIsMixing] = useState(false);

  const cancelRef = useRef(false);
  const debounceTimerRef = useRef(null);
  const mixCountRef = useRef(0);

  const availableProcessors = processors.filter((p) => p && p.hasFFT());
  const canMix = availableProcessors.length > 0;

  // Auto-trigger mix when settings change
  useEffect(() => {
    if (!canMix) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performMix();
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [weights, mixMode, regionConfig, canMix]);

  const handleWeightChange = (index, value) => {
    const newWeights = [...weights];
    newWeights[index] = parseFloat(value);
    setWeights(newWeights);
  };

  const handleRegionChange = (config) => {
    setRegionConfig(config);
    console.log("Region config updated:", config);

    if (onRegionConfigChange) {
      onRegionConfigChange(config);
    }
  };

  const performMix = async () => {
    if (isMixing) {
      cancelRef.current = true;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    const currentMixId = ++mixCountRef.current;
    cancelRef.current = false;
    setIsMixing(true);

    console.log(`🚀 Starting real-time mix #${currentMixId}`);

    try {
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

      if (!cancelRef.current) {
        console.log(`✅ Mix #${currentMixId} completed`);
      }

      setIsMixing(false);
    } catch (error) {
      console.error("Error mixing:", error);
      setIsMixing(false);
    }
  };

  const handleResetWeights = () => {
    setWeights([0.25, 0.25, 0.25, 0.25]);
  };

  const normalizeWeights = () => {
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum === 0) return;
    const normalized = weights.map((w) => w / sum);
    setWeights(normalized);
  };

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
          {/* Note: Mix mode is now controlled from the right sidebar */}

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
        </>
      )}
    </div>
  );
}

export default ComponentMixer;
