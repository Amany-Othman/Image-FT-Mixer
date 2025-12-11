// OutputViewport.jsx - Display mixed output

import React, { useRef, useEffect } from "react";
import BrightnessContrastControl from "./BrightnessContrastControl";
import "./OutputViewport.css";

function OutputViewport({ id, outputData }) {
  const canvasRef = useRef(null);

  // Draw output when data changes
  useEffect(() => {
    if (outputData) {
      drawOutput();
    }
  }, [outputData]);

  const drawOutput = () => {
    const canvas = canvasRef.current;
    if (!canvas || !outputData) return;

    const { imageData, width, height } = outputData;

    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;

    // Convert to ImageData
    const imgData = new ImageData(width, height);
    const data = imgData.data;

    for (let i = 0; i < imageData.length; i++) {
      const value = imageData[i];
      const idx = i * 4;

      data[idx] = value; // R
      data[idx + 1] = value; // G
      data[idx + 2] = value; // B
      data[idx + 3] = 255; // A
    }

    ctx.putImageData(imgData, 0, 0);
  };

  return (
    <div className="output-viewport">
      <div className="output-header">
        <h3>Output {id}</h3>
        {outputData && (
          <span className="output-dimensions">
            {outputData.width} x {outputData.height}
          </span>
        )}
      </div>

      <div className="output-canvas-container">
        {!outputData && (
          <div className="output-placeholder">
            <p>Mixed result will appear here</p>
            <p className="hint">Click "Mix Images" to generate output</p>
          </div>
        )}
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export default OutputViewport;
