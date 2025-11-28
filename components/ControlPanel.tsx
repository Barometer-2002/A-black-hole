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
      className={`
        relative w-[95%] max-w-[360px] 
        transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] overflow-hidden
        ${isVisible ? 'max-h-[60vh] opacity-100 mb-6 translate-y-0' : 'max-h-0 opacity-0 mb-0 translate-y-8'}
      `}
    >
      <div className="
        bg-[#121214]/90 backdrop-blur-xl border border-[#bfa15f]/20 rounded-2xl shadow-2xl
        p-5 w-full flex flex-col gap-4 overflow-y-auto max-h-[60vh] pointer-events-auto
      ">
        <h3 className="text-[#ffc873] text-base text-center border-b border-white/10 pb-2 tracking-[0.2em] uppercase font-light">
          {text.title}
        </h3>

        <div className="space-y-5">
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
          
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

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
  <div className="flex flex-col gap-1.5">
    <div className="flex justify-between items-end text-xs text-white/60 font-medium tracking-wide">
      <span>{label}</span>
      <span className="text-[#ffc873] font-mono">{value.toFixed(2)}</span>
    </div>
    <div className="relative h-6 flex items-center">
        <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none focus:bg-white/20 transition-colors"
        />
    </div>
  </div>
);

export default ControlPanel;