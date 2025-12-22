// ComponentMixer.jsx - UI ONLY - No processing logic

import React, { useState, useEffect, useRef } from "react";
import "./ComponentMixer.css";

/**
 * ComponentMixer Component - Handles UI for triggering mixing operations
 *
 * Responsibilities:
 * - Display mixing status
 * - Show available processor count
 * - Trigger mixing on setting changes
 * - Handle debouncing and cancellation
 *
 * Does NOT handle:
 * - FFT calculations
 * - Image processing
 * - Weight normalization
 * - Region mask creation
 */
function ComponentMixer({
  processors, // Array of image processors (with FFT data)
  onMix, // Callback to trigger actual mixing
  mixMode, // Mixing mode (e.g., magnitude/phase, real/imag)
  weights, // Current weights for each input
  regionConfig, // Configuration for selected FT regions
}) {
  // Local state to track whether mixing is in progress
  const [isMixing, setIsMixing] = useState(false);

  // Ref to allow cancellation of ongoing operations
  const cancelRef = useRef(false);

  // Ref for debouncing mix calls
  const debounceTimerRef = useRef(null);

  // Ref to track mix count (to differentiate async calls)
  const mixCountRef = useRef(0);

  // Filter processors that have FFT computed
  const availableProcessors = processors.filter((p) => p && p.hasFFT());

  // Can mix only if at least one processor is ready
  const canMix = availableProcessors.length > 0;

  // Stable string representations for dependency tracking in useEffect
  const weightsKey = JSON.stringify(weights);
  const regionConfigKey = regionConfig ? JSON.stringify(regionConfig) : "null";

  /**
   * Auto-trigger mix when settings change
   * Debounces to avoid excessive mixing during slider adjustments
   */
  useEffect(() => {
    if (!canMix) {
      console.log("Cannot mix - no processors available");
      return;
    }

    console.log("Settings changed, scheduling mix:", {
      weights,
      mixMode,
      regionConfig,
      processorCount: availableProcessors.length,
    });

    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Schedule new mix operation with 300ms debounce
    debounceTimerRef.current = setTimeout(() => {
      performMix();
    }, 300);

    // Cleanup on unmount or dependency change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [weightsKey, mixMode, regionConfigKey, canMix]);

  /**
   * Perform the mixing operation
   * Handles cancellation of previous operations and UI state
   */
  const performMix = async () => {
    // If already mixing, cancel previous operation
    if (isMixing) {
      console.log("Already mixing, cancelling previous operation");
      cancelRef.current = true;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Increment mix count and mark as not cancelled
    const currentMixId = ++mixCountRef.current;
    cancelRef.current = false;

    // Set mixing state to true to show indicator
    setIsMixing(true);

    console.log(`🚀 Starting real-time mix #${currentMixId}`, {
      weights,
      mixMode,
      regionConfig,
      processorCount: availableProcessors.length,
    });

    try {
      // Perform mix asynchronously to avoid blocking UI
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            // If operation was cancelled, resolve without mixing
            if (cancelRef.current) {
              console.log(`❌ Mix #${currentMixId} cancelled`);
              resolve();
              return;
            }

            // Call parent's mix handler
            // Parent is responsible for actual mixing logic
            onMix(availableProcessors, weights, mixMode, regionConfig);

            console.log(`✅ Mix #${currentMixId} completed successfully`);
            resolve();
          } catch (error) {
            console.error(`❌ Mix #${currentMixId} failed:`, error);
            reject(error);
          }
        }, 50); // Simulate async delay
      });

      // Reset mixing state
      setIsMixing(false);
    } catch (error) {
      console.error("Error mixing:", error);
      alert("Mixing failed: " + error.message);
      setIsMixing(false);
    }
  };

  /**
   * Cleanup on unmount
   * Clears any pending debounce timer and cancels ongoing mix
   */
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

      {/* Warning message if no processors are ready */}
      {!canMix && (
        <div className="mixer-warning">
          <p>⚠️ Load at least one image with FFT to start mixing</p>
        </div>
      )}
    </div>
  );
}

export default ComponentMixer;
