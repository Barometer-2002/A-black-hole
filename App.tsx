
import React, { useState, useRef, useEffect } from 'react';
import BlackHoleScene, { BlackHoleSceneRef } from './components/BlackHoleScene';
import ControlPanel from './components/ControlPanel';
import { SimulationParams, Language } from './types';
import { DEFAULT_PARAMS, TEXT_CONTENT } from './constants';

function App() {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [showControls, setShowControls] = useState(false);
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [lang, setLang] = useState<Language>('zh');
  
  // HUD Text management
  const [statusMessage, setStatusMessage] = useState(TEXT_CONTENT['zh'].statusTitle);
  const [statusOpacity, setStatusOpacity] = useState(1);
  const statusTimeoutRef = useRef<number | null>(null);
  
  // Reference to the scene to call imperative methods (Zoom, Snapshot)
  const sceneRef = useRef<BlackHoleSceneRef>(null);

  const text = TEXT_CONTENT[lang];

  // Refresh status text when language changes, unless a temporary message is active
  useEffect(() => {
    if (statusOpacity !== 1) {
      setStatusMessage(text.statusTitle);
    }
  }, [lang, text.statusTitle, statusOpacity]);

  const handleParamChange = (key: keyof SimulationParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const showTemporaryStatus = (msg: string) => {
    setStatusMessage(msg);
    setStatusOpacity(1);
    
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    
    statusTimeoutRef.current = window.setTimeout(() => {
      setStatusMessage(text.statusTitle);
      setStatusOpacity(0.75);
    }, 2000);
  };

  const handleZoomIn = () => {
    if (sceneRef.current) {
      const newDist = sceneRef.current.zoomIn();
      showTemporaryStatus(`${text.distance}: ${newDist.toFixed(1)} M`);
    }
  };

  const handleZoomOut = () => {
    if (sceneRef.current) {
      const newDist = sceneRef.current.zoomOut();
      showTemporaryStatus(`${text.distance}: ${newDist.toFixed(1)} M`);
    }
  };

  const handleSnapshot = () => {
    showTemporaryStatus(text.zooming);
    // Allow UI to update before blocking thread with render
    setTimeout(() => {
        if (sceneRef.current) {
            sceneRef.current.takeSnapshot();
            showTemporaryStatus(text.saved);
        }
    }, 100);
  };

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'zh' : 'en');
  };

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative selection:bg-none font-sans">
      
      {/* 3D Scene Layer */}
      <BlackHoleScene 
        ref={sceneRef}
        params={params}
        isAutoRotate={isAutoRotate}
        onStatusUpdate={(msg) => {
          // Parse the distance from the raw message if possible, or just ignore since we handle click feedback here
          // This callback is mostly for the wheel event which happens inside the component
          if (msg.includes('Distance')) {
             const dist = msg.split(':')[1];
             showTemporaryStatus(`${text.distance}:${dist}`);
          }
        }}
      />

      {/* HUD Layer */}
      <div className="absolute inset-x-0 bottom-[30px] flex flex-col items-center gap-6 pointer-events-none z-10 px-4 transition-opacity duration-500">
        
        {/* Status Text */}
        <div 
          className="text-xs text-white/75 tracking-[4px] uppercase bg-black/50 px-4 py-2 rounded-md transition-opacity duration-500 shadow-[0_0_15px_rgba(255,255,255,0.1)] backdrop-blur-sm border border-white/5"
          style={{ opacity: statusOpacity }}
        >
          {statusMessage}
        </div>

        {/* Control Panel */}
        <ControlPanel 
          isVisible={showControls} 
          params={params} 
          lang={lang}
          onChange={handleParamChange} 
        />

        {/* Main Toolbar */}
        <div className="flex gap-6 pointer-events-auto bg-[#0a0a0a]/80 px-8 py-3 rounded-full border border-[#bfa15f]/30 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.8),inset_0_0_5px_rgba(255,255,255,0.05)]">
          <ActionButton onClick={handleZoomOut} icon="−" title={text.zoomOut} />
          <ActionButton 
            onClick={() => setShowControls(!showControls)} 
            icon="🎨" 
            title={text.title} 
            active={showControls}
          />
          <ActionButton 
            onClick={() => {
              setIsAutoRotate(!isAutoRotate);
              showTemporaryStatus(`${text.autoRotate}: ${!isAutoRotate ? text.on : text.off}`);
            }} 
            icon="↻" 
            title={text.autoRotate} 
            active={isAutoRotate}
            activeColor="text-[#bfa15f] drop-shadow-[0_0_6px_#ffc873]"
          />
          <ActionButton 
            onClick={handleSnapshot} 
            icon="◉" 
            title={text.snapshot} 
          />
          <ActionButton 
            onClick={toggleLanguage} 
            icon={lang === 'en' ? "中" : "En"} 
            title="Switch Language" 
            className="font-bold text-sm pt-0.5"
          />
          <ActionButton onClick={handleZoomIn} icon="+" title={text.zoomIn} />
        </div>
      </div>
    </div>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  icon: string;
  title: string;
  active?: boolean;
  activeColor?: string;
  className?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, icon, title, active, activeColor, className }) => (
  <button
    onClick={onClick}
    title={title}
    className={`
      w-12 h-12 flex items-center justify-center text-2xl transition-all duration-200 ease-out rounded-full
      hover:bg-white/5 hover:scale-110 hover:text-white hover:drop-shadow-[0_0_8px_#ffc873]
      active:scale-95 active:text-[#bfa15f]
      ${active ? (activeColor || 'text-[#bfa15f]') : 'text-white/70'}
      ${className || ''}
    `}
  >
    {icon}
  </button>
);

export default App;
