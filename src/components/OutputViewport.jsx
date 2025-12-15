// OutputViewport.jsx - Light theme matching your design
import React, { useRef, useEffect } from "react";
import "./OutputViewport.css";

function OutputViewport({
  outputData1,
  outputData2,
  selectedOutput,
  onOutputSelect,
  mixMode,
  onMixModeChange,
  regionType,
  onRegionTypeChange,
}) {
  const canvas1Ref = useRef(null);
  const canvas2Ref = useRef(null);

  // Draw output 1
  useEffect(() => {
    if (!outputData1 || !canvas1Ref.current) return;

    const canvas = canvas1Ref.current;
    const ctx = canvas.getContext("2d");

    canvas.width = outputData1.width;
    canvas.height = outputData1.height;

    const imageData = ctx.createImageData(
      outputData1.width,
      outputData1.height
    );

    for (let i = 0; i < outputData1.imageData.length; i++) {
      const val = outputData1.imageData[i];
      imageData.data[i * 4] = val;
      imageData.data[i * 4 + 1] = val;
      imageData.data[i * 4 + 2] = val;
      imageData.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }, [outputData1]);

  // Draw output 2
  useEffect(() => {
    if (!outputData2 || !canvas2Ref.current) return;

    const canvas = canvas2Ref.current;
    const ctx = canvas.getContext("2d");

    canvas.width = outputData2.width;
    canvas.height = outputData2.height;

    const imageData = ctx.createImageData(
      outputData2.width,
      outputData2.height
    );

    for (let i = 0; i < outputData2.imageData.length; i++) {
      const val = outputData2.imageData[i];
      imageData.data[i * 4] = val;
      imageData.data[i * 4 + 1] = val;
      imageData.data[i * 4 + 2] = val;
      imageData.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }, [outputData2]);

  return (
    <div className="output-panel">
      {/* Mode Selector */}
      <div className="control-row">
        <label className="control-label">Mode:</label>
        <select
          className="control-dropdown"
          value={mixMode}
          onChange={(e) => onMixModeChange(e.target.value)}
        >
          <option value="magnitude-phase">Magnitude/Phase</option>
          <option value="real-imaginary">Real/Imaginary</option>
        </select>
      </div>

      {/* Region Selector (was ROI) */}
      <div className="control-row">
        <label className="control-label">Region:</label>
        <select
          className="control-dropdown"
          value={regionType}
          onChange={(e) => onRegionTypeChange(e.target.value)}
        >
          <option value="inner">Inner</option>
          <option value="outer">Outer</option>
        </select>
      </div>

      {/* View/Port Selector */}
      <div className="control-row">
        <label className="control-label">View:</label>
        <div className="radio-group">
          <label
            className={`radio-label ${selectedOutput === 1 ? "active" : ""}`}
          >
            <input
              type="radio"
              name="port"
              value="1"
              checked={selectedOutput === 1}
              onChange={() => onOutputSelect(1)}
            />
            <span className="radio-text">Port 1</span>
          </label>
          <label
            className={`radio-label ${selectedOutput === 2 ? "active" : ""}`}
          >
            <input
              type="radio"
              name="port"
              value="2"
              checked={selectedOutput === 2}
              onChange={() => onOutputSelect(2)}
            />
            <span className="radio-text">Port 2</span>
          </label>
        </div>
      </div>

      {/* Output Previews */}
      <div className="output-previews">
        {/* Port 1 Preview */}
        <div
          className={`preview-container ${
            selectedOutput === 1 ? "selected" : ""
          }`}
        >
          <div className="preview-canvas-wrapper">
            {outputData1 ? (
              <canvas ref={canvas1Ref} className="preview-canvas" />
            ) : (
              <div className="preview-placeholder">
                <p>Port 1</p>
                <span>No output</span>
              </div>
            )}
          </div>
        </div>

        {/* Port 2 Preview */}
        <div
          className={`preview-container ${
            selectedOutput === 2 ? "selected" : ""
          }`}
        >
          <div className="preview-canvas-wrapper">
            {outputData2 ? (
              <canvas ref={canvas2Ref} className="preview-canvas" />
            ) : (
              <div className="preview-placeholder">
                <p>Port 2</p>
                <span>No output</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OutputViewport;
