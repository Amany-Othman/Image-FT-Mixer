// App.js - Updated for new right sidebar design
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
  const [selectedOutput, setSelectedOutput] = useState(1);
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [regionConfig, setRegionConfig] = useState(null);
  
  // New states for the right sidebar controls
  const [mixMode, setMixMode] = useState('magnitude-phase');
  const [regionType, setRegionType] = useState('inner');

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

  const handleRegionConfigChange = (config) => {
    setRegionConfig(config);
    console.log('App: Region config updated:', config);
  };

  const handleMix = (processors, weights, currentMixMode, currentRegionConfig) => {
    try {
      console.log('Starting mix with:', {
        processorCount: processors.length,
        weights,
        mixMode: currentMixMode,
        regionConfig: currentRegionConfig,
        targetOutput: selectedOutput
      });

      const mixer = new FourierMixer();
      mixer.setProcessors(processors);
      mixer.setWeights(weights);
      mixer.setMixMode(currentMixMode);
      mixer.setRegionConfig(currentRegionConfig);

      const result = mixer.mix();
      
      console.log('Mix result:', {
        width: result.width,
        height: result.height,
        dataLength: result.imageData.length,
        targetOutput: selectedOutput
      });

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

      <main className="main-content-new">
        {/* Left: Input Images */}
        <section className="left-section">
          <div className="viewports-grid">
            <ImageViewport 
              id="1" 
              onImageLoaded={handleImageLoaded}
              targetSize={targetSize}
              regionConfig={regionConfig}
            />
            <ImageViewport 
              id="2" 
              onImageLoaded={handleImageLoaded}
              targetSize={targetSize}
              regionConfig={regionConfig}
            />
            <ImageViewport 
              id="3" 
              onImageLoaded={handleImageLoaded}
              targetSize={targetSize}
              regionConfig={regionConfig}
            />
            <ImageViewport 
              id="4" 
              onImageLoaded={handleImageLoaded}
              targetSize={targetSize}
              regionConfig={regionConfig}
            />
          </div>

          {targetSize && (
            <div className="info-box">
              <strong>Unified Size:</strong> {targetSize.width} x {targetSize.height}
            </div>
          )}

          {/* Mixer Controls Below Images */}
          <ComponentMixer 
            processors={getProcessorsArray()}
            onMix={handleMix}
            onRegionConfigChange={handleRegionConfigChange}
            mixMode={mixMode}
            onMixModeChange={setMixMode}
            key={updateTrigger}
          />
        </section>

        {/* Right: Output Viewport with Controls */}
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
          />
        </aside>
      </main>
    </div>
  );
}

export default App;