// OutputViewport.js
// This component is responsible for displaying the OUTPUT image
// and applying brightness & contrast adjustments on the result of the mixer
import React, { useRef, useEffect, useState } from 'react';
import './OutputViewport.css';

function OutputViewport({ id, outputData, isSelected }) {   
  //id : no of viewport , output data (width , height , image data )     , is selected boolean
  // Reference to the HTML canvas element
  // We use canvas because we want to manually draw pixel values
  const canvasRef = useRef(null); 
  const [brightness, setBrightness] = useState(0); // State for brightness adjustment (0 = original image)
  const [contrast, setContrast] = useState(0);



  // useEffect:
  // This runs whenever:
  // 1) outputData changes (new mixed image)
  // 2) brightness changes
  // 3) contrast changes
  useEffect(() => {
    if (!outputData || !canvasRef.current) return; // If there is no output image OR canvas is not mounted yet (Safety check)

    const canvas = canvasRef.current;   // Get the canvas element
    const ctx = canvas.getContext('2d'); // Get 2D drawing context from canvas

    canvas.width = outputData.width;// Set canvas size equal to image size , This is important to avoid scaling distortion
    canvas.height = outputData.height;

    // Apply brightness and contrast on grayscale image data ,   outputData.imageData contains one value per pixel (grayscale)
    const adjustedData = applyAdjustments(outputData.imageData, brightness, contrast);


    // Create an ImageData object to store RGBA values
    // Canvas requires 4 values per pixel (R, G, B, A)
    const imageData = ctx.createImageData(outputData.width, outputData.height);
    for (let i = 0; i < adjustedData.length; i++) {
      const gray = adjustedData[i];
      const idx = i * 4;   // Each pixel occupies 4 consecutive indices in imageData
      imageData.data[idx] = gray;  //red   // Assign the same gray value to R, G, and B  ,This keeps the image in grayscale
      imageData.data[idx + 1] = gray;//green
      imageData.data[idx + 2] = gray;//blue
      imageData.data[idx + 3] = 255;//fully opaque
    }

    ctx.putImageData(imageData, 0, 0);    // Draw the processed image data onto the canvas
    // (0,0) means draw from the top-left corner
  }, [outputData, brightness, contrast]);

  // Apply brightness and contrast
  const applyAdjustments = (data, brightness, contrast) => {
    const adjusted = new Uint8ClampedArray(data.length);// Uint8ClampedArray ensures values stay between 0 and 255
    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast)); // Standard contrast adjustment formula

    for (let i = 0; i < data.length; i++) {
      let pixel = data[i];// Original grayscale pixel value
      pixel = contrastFactor * (pixel - 128) + 128; // Apply contrast around mid-gray (128)
      pixel = pixel + brightness;
      adjusted[i] = Math.max(0, Math.min(255, pixel));// Clamp the value between 0 and 255
    }

    return adjusted;
  };

  
  return (
    <div className={`output-viewport ${isSelected ? 'selected' : ''}`}>
      <div className="viewport-header">
        <h3>OUTPUT {id}</h3>
        {isSelected && <span className="selected-badge">📍 Active</span>}
        <span className="viewport-size">
          {outputData ? `${outputData.width} x ${outputData.height}` : 'No output'}
        </span>
      </div>

      <div className="viewport-content">
        <div className="canvas-container">
          {outputData ? (
            <canvas ref={canvasRef} className="output-canvas" />
          ) : (
            <div className="empty-output">
              <p>🎯 No output yet</p>
              <p className="hint">Mix images to see result here</p>
            </div>
          )}
        </div>

        {outputData && (
          <div className="viewport-controls">
            <div className="adjustment-info">
              <span>Brightness: {brightness.toFixed(0)}</span>
              <span>Contrast: {contrast.toFixed(0)}</span>
            </div>
            <button 
              className="reset-btn"
              onClick={handleReset}
            >
              Reset Adjustments
            </button>
            <p className="hint">💡 Adjust brightness and contrast using sliders</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default OutputViewport;