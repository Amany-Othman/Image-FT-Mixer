// App.js - Main React Application File
// Manages input images, output viewports, region configuration, and auto-mixing logic

import React, { useState, useEffect } from 'react';
import ImageViewport from './components/ImageViewport'; // Component for individual input image
import OutputViewport from './components/OutputViewport'; // Component to display outputs
import FourierMixer from './classes/FourierMixer'; // Class that handles FFT-based image mixing
import './App.css';

function App() {
  // State to store loaded images and their processors
  const [loadedImages, setLoadedImages] = useState({});

  // State for unified target size for all images
  const [targetSize, setTargetSize] = useState(null);

  // States for output images of Port 1 and Port 2
  const [outputData1, setOutputData1] = useState(null);
  const [outputData2, setOutputData2] = useState(null);

  // Currently selected output port (1 or 2)
  const [selectedOutput, setSelectedOutput] = useState(1);

  // Trigger to force re-render or update
  const [updateTrigger, setUpdateTrigger] = useState(0);
  
  // Initialize region configuration (disabled by default)
  const [regionConfig, setRegionConfig] = useState({
    enabled: false,
    type: 'inner', // inner or outer region
    size: 50
  });
  
  // Right sidebar controls
  const [mixMode, setMixMode] = useState('magnitude-phase'); // Mixing mode: magnitude/phase or real/imaginary
  const [regionType, setRegionType] = useState('inner'); // Region type selection for filter
  
  // Weight management for each input image
  const [weights, setWeights] = useState([0.25, 0.25, 0.25, 0.25]);

  // Sync regionType changes with regionConfig
  useEffect(() => {
    setRegionConfig(prev => ({
      ...prev,
      type: regionType
    }));
  }, [regionType]);

  // Called when an image is loaded in a viewport
  const handleImageLoaded = (viewportId, processor) => {
    const newLoadedImages = {
      ...loadedImages,
      [viewportId]: processor
    };
    
    setLoadedImages(newLoadedImages);
    updateTargetSize(newLoadedImages);
    
    // Trigger update after a short delay
    setTimeout(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 500);
  };

  // Determine minimum width and height across all loaded images for unified size
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

  // Update region configuration and trigger auto-mixing
  const handleRegionConfigChange = (config) => {
    console.log('App: Region config updated:', config);
    setRegionConfig(config);
    autoMix();
  };

  // Update weight of a specific viewport and trigger auto-mixing
  const handleWeightChange = (viewportId, newWeight) => {
    const index = parseInt(viewportId) - 1;
    const newWeights = [...weights];
    newWeights[index] = newWeight;
    setWeights(newWeights);
    console.log(`Weight changed for Image ${viewportId}: ${newWeight}%`);
    setTimeout(() => autoMix(), 100);
  };

  // Auto-mix function using FourierMixer
  const autoMix = () => {
    // Get all loaded processors that have FFT computed
    const processors = getProcessorsArray().filter(p => p && p.hasFFT());
    if (processors.length === 0) return;

    try {
      console.log('=== AUTO-MIXING ===');
      console.log('Processors:', processors.length);
      console.log('Weights:', weights);
      console.log('Mix Mode:', mixMode);
      console.log('Region Config:', regionConfig);
      console.log('Target Output:', selectedOutput);

      const mixer = new FourierMixer();
      mixer.setProcessors(processors);
      mixer.setWeights(weights);
      mixer.setMixMode(mixMode);
      mixer.setRegionConfig(regionConfig);

      // Perform mixing
      const result = mixer.mix();
      
      console.log('Mix result:', {
        width: result.width,
        height: result.height,
        dataLength: result.imageData.length,
        targetOutput: selectedOutput
      });

      // Assign result to selected output port
      if (selectedOutput === 1) {
        setOutputData1(result);
        console.log('✅ Output set to Port 1');
      } else {
        setOutputData2(result);
        console.log('✅ Output set to Port 2');
      }
    } catch (error) {
      console.error('❌ Auto-mixing error:', error);
      console.error('Error stack:', error.stack);
    }
  };

  // Auto-mix whenever weights, mixMode, regionConfig, or selectedOutput change
  useEffect(() => {
    autoMix();
  }, [weights, mixMode, regionConfig, selectedOutput]);

  // Helper function to return processors array in order
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
      {/* App Header */}
      <header className="app-header">
        <h1>🎨 Fourier Transform Mixer</h1>
      </header>

      <main className="main-content-new">
        {/* Left Section: Input Image Viewports */}
        <section className="left-section">
          <div className="viewports-grid">
            <ImageViewport 
              id="1" 
              onImageLoaded={handleImageLoaded}
              targetSize={targetSize}
              regionConfig={regionConfig}
              weight={weights[0]}
              onWeightChange={handleWeightChange}
              isDisabled={!loadedImages['1'] || !loadedImages['1'].hasFFT()}
            />
            <ImageViewport 
              id="2" 
              onImageLoaded={handleImageLoaded}
              targetSize={targetSize}
              regionConfig={regionConfig}
              weight={weights[1]}
              onWeightChange={handleWeightChange}
              isDisabled={!loadedImages['2'] || !loadedImages['2'].hasFFT()}
            />
            <ImageViewport 
              id="3" 
              onImageLoaded={handleImageLoaded}
              targetSize={targetSize}
              regionConfig={regionConfig}
              weight={weights[2]}
              onWeightChange={handleWeightChange}
              isDisabled={!loadedImages['3'] || !loadedImages['3'].hasFFT()}
            />
            <ImageViewport 
              id="4" 
              onImageLoaded={handleImageLoaded}
              targetSize={targetSize}
              regionConfig={regionConfig}
              weight={weights[3]}
              onWeightChange={handleWeightChange}
              isDisabled={!loadedImages['4'] || !loadedImages['4'].hasFFT()}
            />
          </div>

          {/* Display unified target size info */}
          {targetSize && (
            <div className="info-box">
              <strong>Unified Size:</strong> {targetSize.width} x {targetSize.height}
            </div>
          )}
        </section>

        {/* Right Section: Output Viewport with controls */}
        <aside className="right-section">
          <OutputViewport 
            outputData1={outputData1}
            outputData2={outputData2}
            selectedOutput={selectedOutput}
            onOutputSelect={setSelectedOutput}
            mixMode={mixMode}
            onMixModeChange={setMixMode}
            regionType={regionType}
            onRegionTypeChange={setRegionType}
            onRegionConfigChange={handleRegionConfigChange}
          />
        </aside>
      </main>
    </div>
  );
}

export default App;
