
import React from 'react';
import { SimulationParams, Language } from '../types';
import { TEXT_CONTENT } from '../constants';

interface ControlPanelProps {
  isVisible: boolean;
  params: SimulationParams;
  lang: Language;
  onChange: (key: keyof SimulationParams, value: number) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ isVisible, params, lang, onChange }) => {
  const text = TEXT_CONTENT[lang];

  return (
    <div
      className={`absolute bottom-24 left-1/2 transform -translate-x-1/2 w-[90%] max-w-[340px] 
      bg-[#121214] bg-opacity-95 border border-[#bfa15f] border-opacity-20 rounded-xl shadow-[0_4px_30px_rgba(191,161,95,0.15)]
      p-6 transition-all duration-300 ease-in-out z-20 backdrop-blur-md
      ${isVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-5 pointer-events-none'}`}
    >
      <h3 className="text-[#ffc873] text-lg text-center mb-4 border-b border-white border-opacity-10 pb-2 tracking-widest uppercase font-light">
        {text.title}
      </h3>

      <div className="space-y-4">
        <Slider
          label={text.dopplerPower}
          min={1.0} max={5.0} step={0.1}
          value={params.dopplerPower}
          onChange={(v) => onChange('dopplerPower', v)}
        />
        <Slider
          label={text.colorShift}
          min={0.0} max={0.5} step={0.01}
          value={params.dopplerColorShift}
          onChange={(v) => onChange('dopplerColorShift', v)}
        />
        <Slider
          label={text.luminosity}
          min={0.5} max={5.0} step={0.05}
          value={params.luminosityScale}
          onChange={(v) => onChange('luminosityScale', v)}
        />
        
        <div className="h-px bg-white bg-opacity-5 my-3" />

        <Slider
          label={text.hueShift}
          min={0.0} max={1.0} step={0.01}
          value={params.hueShift}
          onChange={(v) => onChange('hueShift', v)}
        />
        <Slider
          label={text.exposure}
          min={0.1} max={2.0} step={0.05}
          value={params.exposure}
          onChange={(v) => onChange('exposure', v)}
        />
        <Slider
          label={text.bloom}
          min={0.0} max={5.0} step={0.1}
          value={params.bloomStrength}
          onChange={(v) => onChange('bloomStrength', v)}
        />
      </div>
    </div>
  );
};

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (val: number) => void;
}

const Slider: React.FC<SliderProps> = ({ label, min, max, step, value, onChange }) => (
  <div className="flex items-center text-[13px] text-white/90">
    <label className="w-24 font-medium text-white/80 whitespace-nowrap overflow-hidden text-ellipsis mr-2">{label}</label>
    <input
      type="range"
      min={min} max={max} step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="flex-grow mx-2 h-1 bg-white/20 rounded-sm appearance-none outline-none"
    />
    <span className="w-10 text-right text-[#ffc873] font-bold font-mono">{value.toFixed(2)}</span>
  </div>
);

export default ControlPanel;
