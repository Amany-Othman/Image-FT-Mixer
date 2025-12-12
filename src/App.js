// App.js - Stage 5: Two Output Viewports

import React, { useState } from 'react';
import ImageViewport from './components/ImageViewport';
import ComponentMixer from './components/ComponentMixer';
import OutputViewport from './components/OutputViewport';
import FourierMixer from './classes/FourierMixer';
import './App.css';

function App() {
  const [loadedImages, setLoadedImages] = useState({});
  const [targetSize, setTargetSize] = useState(null);
  const [outputData1, setOutputData1] = useState(null);
  const [outputData2, setOutputData2] = useState(null);
  const [selectedOutput, setSelectedOutput] = useState(1); // NEW: Which output to use
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const handleImageLoaded = (viewportId, processor) => {
    const newLoadedImages = {
      ...loadedImages,
      [viewportId]: processor
    };
    
    setLoadedImages(newLoadedImages);
    updateTargetSize(newLoadedImages);
    
    setTimeout(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 500);
  };

  const updateTargetSize = (images) => {
    const processors = Object.values(images);
    
    if (processors.length === 0) return;

    let minWidth = Infinity;
    let minHeight = Infinity;

    processors.forEach(processor => {
      if (processor.width < minWidth) minWidth = processor.width;
      if (processor.height < minHeight) minHeight = processor.height;
    });

    setTargetSize({ width: minWidth, height: minHeight });
  };

  // Handle mixing - route to selected output
  const handleMix = (processors, weights, mixMode) => {
    try {
      console.log('Starting mix with:', {
        processorCount: processors.length,
        weights,
        mixMode,
        targetOutput: selectedOutput
      });

      const mixer = new FourierMixer();
      mixer.setProcessors(processors);
      mixer.setWeights(weights);
      mixer.setMixMode(mixMode);

      const result = mixer.mix();
      
      console.log('Mix result:', {
        width: result.width,
        height: result.height,
        dataLength: result.imageData.length,
        targetOutput: selectedOutput
      });

      // Route to selected output
      if (selectedOutput === 1) {
        setOutputData1(result);
      } else {
        setOutputData2(result);
      }
    } catch (error) {
      console.error('Mixing error:', error);
      alert('Error during mixing: ' + error.message);
      throw error;
    }
  };

  const getProcessorsArray = () => {
    return [
      loadedImages['1'] || null,
      loadedImages['2'] || null,
      loadedImages['3'] || null,
      loadedImages['4'] || null
    ];
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎨 Fourier Transform Mixer</h1>
      </header>

      <main className="main-content">
        {/* Input Viewports */}
        <section className="section">
          <h2 className="section-title">Input Images</h2>
          <div className="viewports-grid">
            <ImageViewport 
              id="1" 
              onImageLoaded={handleImageLoaded}
              targetSize={targetSize}
            />
            <ImageViewport 
              id="2" 
              onImageLoaded={handleImageLoaded}
              targetSize={targetSize}
            />
            <ImageViewport 
              id="3" 
              onImageLoaded={handleImageLoaded}
              targetSize={targetSize}
            />
            <ImageViewport 
              id="4" 
              onImageLoaded={handleImageLoaded}
              targetSize={targetSize}
            />
          </div>

          {targetSize && (
            <div className="info-box">
              <strong>Unified Size:</strong> {targetSize.width} x {targetSize.height}
            </div>
          )}
        </section>

        {/* Mixer Controls with Output Selection */}
        <section className="section">
          <h2 className="section-title">Mixer Controls</h2>
          
          {/* NEW: Output Selection */}
          <div className="output-selector">
            <label className="output-selector-label">
              <strong>Send Result To:</strong>
            </label>
            <div className="output-selector-buttons">
              <button
                className={`output-select-btn ${selectedOutput === 1 ? 'active' : ''}`}
                onClick={() => setSelectedOutput(1)}
              >
                📤 Output 1
              </button>
              <button
                className={`output-select-btn ${selectedOutput === 2 ? 'active' : ''}`}
                onClick={() => setSelectedOutput(2)}
              >
                📤 Output 2
              </button>
            </div>
          </div>

          <ComponentMixer 
            processors={getProcessorsArray()}
            onMix={handleMix}
            key={updateTrigger}
          />
        </section>

        {/* Two Output Viewports */}
        <section className="section">
          <h2 className="section-title">Mixed Outputs</h2>
          <div className="outputs-grid">
            <OutputViewport 
              id="1"
              outputData={outputData1}
              isSelected={selectedOutput === 1}
            />
            <OutputViewport 
              id="2"
              outputData={outputData2}
              isSelected={selectedOutput === 2}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;