// ComponentMixer.jsx - Fixed with proper dependency tracking
import React, { useState, useEffect, useRef } from "react";
import "./ComponentMixer.css";

function ComponentMixer({
  processors,
  onMix,
  mixMode,
  weights,
  regionConfig,
}) {
  const [isMixing, setIsMixing] = useState(false);
  const cancelRef = useRef(false);
  const debounceTimerRef = useRef(null);
  const mixCountRef = useRef(0);

  const availableProcessors = processors.filter((p) => p && p.hasFFT());
  const canMix = availableProcessors.length > 0;

  // Create a stable string representation of dependencies for comparison
  const weightsKey = JSON.stringify(weights);
  const regionConfigKey = regionConfig ? JSON.stringify(regionConfig) : 'null';

  // Auto-trigger mix when settings change
  useEffect(() => {
    if (!canMix) {
      console.log('Cannot mix - no processors available');
      return;
    }

    console.log('Settings changed, scheduling mix:', {
      weights,
      mixMode,
      regionConfig,
      processorCount: availableProcessors.length
    });

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performMix();
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [weightsKey, mixMode, regionConfigKey, canMix]);

  const performMix = async () => {
    if (isMixing) {
      console.log('Already mixing, cancelling previous operation');
      cancelRef.current = true;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    const currentMixId = ++mixCountRef.current;
    cancelRef.current = false;
    setIsMixing(true);

    console.log(`🚀 Starting real-time mix #${currentMixId}`, {
      weights,
      mixMode,
      regionConfig,
      processorCount: availableProcessors.length
    });

    try {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            if (cancelRef.current) {
              console.log(`❌ Mix #${currentMixId} cancelled`);
              resolve();
              return;
            }

            // Call the mix function with all parameters
            onMix(availableProcessors, weights, mixMode, regionConfig);
            
            console.log(`✅ Mix #${currentMixId} completed successfully`);
            resolve();
          } catch (error) {
            console.error(`❌ Mix #${currentMixId} failed:`, error);
            reject(error);
          }
        }, 50);
      });

      setIsMixing(false);
    } catch (error) {
      console.error("Error mixing:", error);
      alert("Mixing failed: " + error.message);
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
          {isMixing && <span className="mixing-indicator"> • Mixing...</span>}
        </div>
      </div>

      {!canMix && (
        <div className="mixer-warning">
          <p>⚠️ Load at least one image with FFT to start mixing</p>
        </div>
      )}
    </div>
  );
}

export default ComponentMixer;