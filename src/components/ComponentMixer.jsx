// ComponentMixer.jsx - Updated to receive weights as prop (no internal weight sliders)

import React, { useState, useEffect, useRef } from "react";
import RegionSelector from "./RegionSelector";
import "./ComponentMixer.css";

function ComponentMixer({
  processors,
  onMix,
  onRegionConfigChange,
  mixMode,
  onMixModeChange,
  weights, // Receive weights from parent
}) {
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
          {/* Region Selection */}
          <div className="mixer-section">
            <RegionSelector onRegionChange={handleRegionChange} />
          </div>

          {/* Weight Sum Display */}
          <div className="mixer-section">
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
