
export interface SimulationParams {
  dopplerPower: number;
  dopplerColorShift: number;
  luminosityScale: number;
  hueShift: number;
  exposure: number;
  bloomStrength: number;
}

export interface CameraState {
  radius: number;
  theta: number;
  phi: number;
}

export type Language = 'en' | 'zh';
