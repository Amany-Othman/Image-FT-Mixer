import React, { useState, useEffect } from "react";

// Component to control Brightness and Contrast via sliders
function BrightnessContrastControl({ onAdjust, brightness = 0, contrast = 0 }) {
  // Local state for brightness and contrast
  const [currentBrightness, setCurrentBrightness] = useState(brightness);
  const [currentContrast, setCurrentContrast] = useState(contrast);

  // Update local state when props change
  useEffect(() => {
    setCurrentBrightness(brightness);
    setCurrentContrast(contrast);
  }, [brightness, contrast]);

  // Handle changes in the Brightness slider
  const handleBrightnessChange = (e) => {
    const value = parseInt(e.target.value);
    setCurrentBrightness(value);
    // Call parent callback with new brightness and current contrast
    if (onAdjust) {
      onAdjust(value, currentContrast);
    }
  };

  // Handle changes in the Contrast slider
  const handleContrastChange = (e) => {
    const value = parseInt(e.target.value);
    setCurrentContrast(value);
    // Call parent callback with current brightness and new contrast
    if (onAdjust) {
      onAdjust(currentBrightness, value);
    }
  };

  // Reset sliders to default values (0)
  const handleReset = () => {
    setCurrentBrightness(0);
    setCurrentContrast(0);
    if (onAdjust) {
      onAdjust(0, 0);
    }
  };

  // Calculate gradient for Brightness slider background
  // Gradient stops exactly at the thumb position
  const getBrightnessGradient = () => {
    const percent = ((currentBrightness + 100) / 200) * 100;
    return `linear-gradient(to right, #667eea 0%, #764ba2 ${percent}%, #e0e0e0 ${percent}%, #e0e0e0 100%)`;
  };

  // Calculate gradient for Contrast slider background
  const getContrastGradient = () => {
    const percent = ((currentContrast + 100) / 200) * 100;
    return `linear-gradient(to right, #667eea 0%, #764ba2 ${percent}%, #e0e0e0 ${percent}%, #e0e0e0 100%)`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.slidersContainer}>
        {/* Brightness Slider */}
        <div style={styles.sliderItem}>
          <div style={styles.sliderLabel}>
            <span style={styles.sliderName}>BRIGHTNESS:</span>
            <span style={styles.sliderValue}>
              {Math.round(currentBrightness)}
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={currentBrightness}
            onChange={handleBrightnessChange}
            style={{
              ...styles.slider,
              background: getBrightnessGradient(), // Apply gradient
            }}
          />
        </div>

        {/* Contrast Slider */}
        <div style={styles.sliderItem}>
          <div style={styles.sliderLabel}>
            <span style={styles.sliderName}>CONTRAST:</span>
            <span style={styles.sliderValue}>
              {Math.round(currentContrast)}
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={currentContrast}
            onChange={handleContrastChange}
            style={{
              ...styles.slider,
              background: getContrastGradient(), // Apply gradient
            }}
          />
        </div>
      </div>

      {/* Reset Button - always visible for better UX */}
      <button
        style={{
          ...styles.resetButton,
          // Reduce opacity when already at default values
          opacity: currentBrightness !== 0 || currentContrast !== 0 ? 1 : 0.5,
        }}
        onClick={handleReset}
        disabled={currentBrightness === 0 && currentContrast === 0}
        title="Reset to default"
      >
        RESET
      </button>
    </div>
  );
}

// Inline styles for the sliders and container
const styles = {
  container: {
    marginTop: "10px",
    padding: "12px 12px 20px 12px",
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: "6px",
    position: "relative",
  },
  slidersContainer: {
    display: "flex",
    flexDirection: "row",
    gap: "20px",
    justifyContent: "space-between",
  },
  sliderItem: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  sliderLabel: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  sliderName: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  sliderValue: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#333",
    minWidth: "40px",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  },
  slider: {
    WebkitAppearance: "none",
    width: "100%",
    height: "8px",
    borderRadius: "4px",
    outline: "none",
    margin: 0,
    padding: 0,
    cursor: "pointer",
  },
  resetButton: {
    position: "absolute",
    bottom: "8px",
    right: "8px",
    background: "rgba(102, 126, 234, 0.1)",
    color: "#667eea",
    border: "1px solid #667eea",
    padding: "4px 10px",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
};

// Demo component to test BrightnessContrastControl
export default function Demo() {
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);

  // Callback to update current brightness/contrast values
  const handleAdjust = (b, c) => {
    setBrightness(b);
    setContrast(c);
  };

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "20px", color: "#333" }}>
        Fixed Brightness/Contrast Control
      </h2>
      <p style={{ marginBottom: "20px", color: "#666" }}>
        ✅ Gradient now stops exactly at the thumb position
        <br />✅ Reset button always visible for better UX
      </p>

      {/* Brightness/Contrast sliders */}
      <BrightnessContrastControl
        brightness={brightness}
        contrast={contrast}
        onAdjust={handleAdjust}
      />

      {/* Display current values below sliders */}
      <div
        style={{
          marginTop: "30px",
          padding: "15px",
          background: "#f5f5f5",
          borderRadius: "6px",
        }}
      >
        <h3 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
          Current Values:
        </h3>
        <p style={{ margin: "5px 0" }}>Brightness: {brightness}</p>
        <p style={{ margin: "5px 0" }}>Contrast: {contrast}</p>
      </div>

      {/* Custom CSS for sliders and buttons */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #667eea;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          transition: all 0.2s;
        }

        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          border-color: #764ba2;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
        }

        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #667eea;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          transition: all 0.2s;
        }

        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.1);
          border-color: #764ba2;
        }

        button:disabled {
          cursor: not-allowed !important;
        }

        button:not(:disabled):hover {
          background: rgba(102, 126, 234, 0.2) !important;
          border-color: #764ba2 !important;
          color: #764ba2 !important;
        }

        button:not(:disabled):active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
}
