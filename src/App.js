// App.js - Fixed counter updates and mixing

import React, { useState } from 'react';
import ImageViewport from './components/ImageViewport';
import ComponentMixer from './components/ComponentMixer';
import OutputViewport from './components/OutputViewport';
import FourierMixer from './classes/FourierMixer';
import './App.css';

function App() {
  const [loadedImages, setLoadedImages] = useState({});
  const [targetSize, setTargetSize] = useState(null);
  const [outputData, setOutputData] = useState(null);
  const [updateTrigger, setUpdateTrigger] = useState(0); // NEW: Force re-render

  const handleImageLoaded = (viewportId, processor) => {
    const newLoadedImages = {
      ...loadedImages,
      [viewportId]: processor
    };
    
    setLoadedImages(newLoadedImages);
    updateTargetSize(newLoadedImages);
    
    // Force update after a short delay to let FFT compute
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

  // Handle mixing
  const handleMix = (processors, weights, mixMode) => {
    try {
      console.log('Starting mix with:', {
        processorCount: processors.length,
        weights,
        mixMode
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
        sampleValues: Array.from(result.imageData.slice(0, 10))
      });

      setOutputData(result);
    } catch (error) {
      console.error('Mixing error:', error);
      alert('Error during mixing: ' + error.message);
      throw error;
    }
  };

  // Get processors array in order
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
        <h1>Fourier Transform Mixer</h1>
       
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

        {/* Mixer Controls */}
        <section className="section">
          <ComponentMixer 
            processors={getProcessorsArray()}
            onMix={handleMix}
            key={updateTrigger} // Force re-render when images update
          />
        </section>

        {/* Output */}
        <section className="section">
          <h2 className="section-title">Mixed Output</h2>
          <div className="output-container">
            <OutputViewport 
              id="1"
              outputData={outputData}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;