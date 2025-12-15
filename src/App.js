// App.js - Updated for weight slider management
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
  
  // Right sidebar controls
  const [mixMode, setMixMode] = useState('magnitude-phase');
  const [regionType, setRegionType] = useState('inner');
  
  // Weight management - NOW IN APP LEVEL
  const [weights, setWeights] = useState([0.25, 0.25, 0.25, 0.25]);

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

  // Handle weight changes from individual image sliders
  const handleWeightChange = (viewportId, newWeight) => {
    const index = parseInt(viewportId) - 1;
    const newWeights = [...weights];
    newWeights[index] = newWeight;
    setWeights(newWeights);
    console.log(`Weight changed for Image ${viewportId}: ${newWeight}`);
  };

  const handleMix = (processors, currentWeights, currentMixMode, currentRegionConfig) => {
    try {
      console.log('Starting mix with:', {
        processorCount: processors.length,
        weights: currentWeights,
        mixMode: currentMixMode,
        regionConfig: currentRegionConfig,
        targetOutput: selectedOutput
      });

      const mixer = new FourierMixer();
      mixer.setProcessors(processors);
      mixer.setWeights(currentWeights);
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
            weights={weights}
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