
import { Language } from './types';

export const DEFAULT_PARAMS = {
  dopplerPower: 3.0,
  dopplerColorShift: 0.15,
  luminosityScale: 0.6,
  hueShift: 0.0,
  exposure: 0.60,
  bloomStrength: 1.2,
};

export const TEXT_CONTENT = {
  en: {
    title: "Aesthetics",
    dopplerPower: "Doppler Power",
    colorShift: "Color Shift",
    luminosity: "Luminosity",
    hueShift: "Hue Shift",
    exposure: "Exposure",
    bloom: "Bloom",
    statusTitle: "Schwarzschild Geodesic Ray Tracer",
    distance: "Distance",
    autoRotate: "Auto Rotate",
    on: "ON",
    off: "OFF",
    zooming: "Capturing High-Res Event Horizon...",
    saved: "Image Saved to Gallery",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    snapshot: "Snapshot"
  },
  zh: {
    title: "美学控制",
    dopplerPower: "集束强度",
    colorShift: "色彩偏移",
    luminosity: "亮度比例",
    hueShift: "色相偏移",
    exposure: "曝光强度",
    bloom: "辉光强度",
    statusTitle: "史瓦西度规光线追踪模拟 (a=0.0)",
    distance: "距离",
    autoRotate: "自动旋转",
    on: "开启",
    off: "关闭",
    zooming: "正在捕获高分辨率视界...",
    saved: "已保存至相册",
    zoomIn: "放大",
    zoomOut: "缩小",
    snapshot: "保存壁纸"
  }
};

export const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() { 
    vUv = uv; 
    gl_Position = vec4(position, 1.0); 
  }
`;

// Exact copy of the original Fragment Shader to preserve all logic and aesthetics
export const FRAGMENT_SHADER = `
  precision highp float;

  // Uniform Variables
  uniform float uTime;             
  uniform vec2 uResolution;        
  uniform vec3 uCamPos;            
  uniform vec3 uCamTarget;         
  uniform float uExposure;         
  uniform float uHueShift;         
  uniform float uLuminosityScale;  
  uniform float uDopplerPower; 
  uniform float uDopplerColorShift; 
  
  varying vec2 vUv;

  // Constants
  #define MAX_STEPS 1000      
  #define MAX_DIST 150.0      
  #define PI 3.14159265359

  // Physics Parameters (Schwarzschild)
  #define MASS 1.0            
  #define SPIN 0.0            
  #define DISK_IN 3.0         
  
  // --- Random & Noise Functions ---
  float hash(vec2 p) { p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float hash31(vec3 p) { p=fract(p*0.3183+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  
  float noise(vec2 p) {
      vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*(3.0-2.0*f);
      return mix(mix(hash(i+vec2(0,0)),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
  }
  
  mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}

  float fbm(vec2 p){
      float v=0.0, a=0.5;
      for(int i=0;i<6;i++){ 
          v+=a*noise(p + float(i)*1.3 + uTime*0.01); 
          p*=rot(0.7)*2.5; 
          a*=0.5;
      }
      return v;
  }

  // --- Starfield Background ---
  // FIXED: Used Tri-planar mapping to eliminate vertical stripes/stretching artifacts
  // WEAKENED: Reduced intensity and contrast to make it less distracting
  vec3 getStarfield(vec3 rd) {
      vec3 stars = vec3(0.0);
      float scale = 60.0;
      
      // 1. Nebula / Deep Space Background (Tri-planar)
      vec3 nebula = vec3(0.0);
      
      // Calculate blending weights based on ray direction
      vec3 w = abs(rd);
      w /= (w.x + w.y + w.z); // Normalize weights
      
      // Detail Layer (High Frequency)
      // Sample noise on 3 axis-aligned planes
      float nx = fbm(rd.yz * 12.0);
      float ny = fbm(rd.xz * 12.0);
      float nz = fbm(rd.xy * 12.0);
      float n_detail = nx*w.x + ny*w.y + nz*w.z;
      
      // Cloud Layer (Low Frequency)
      float cx = fbm(rd.yz * 3.5);
      float cy = fbm(rd.xz * 3.5);
      float cz = fbm(rd.xy * 3.5);
      float n_cloud = cx*w.x + cy*w.y + cz*w.z;
      
      // Significantly increased power (contrast) to make clouds sparser
      // Reduced multipliers to make them fainter
      float contrast_detail = pow(n_detail * 1.0, 4.0); 
      float contrast_cloud = pow(n_cloud * 0.9, 3.0);   

      nebula += vec3(0.05, 0.1, 0.2) * contrast_detail * 0.04; // Very faint
      nebula += vec3(0.2, 0.05, 0.1) * contrast_cloud * 0.03;  // Very faint
      
      stars += clamp(nebula, 0.0, 1.0) * 0.5; 

      // 2. Star Distribution
      // Direct 3D mapping prevents projection distortions
      vec3 p = rd * scale; 
      
      vec3 id = floor(p);
      vec3 uv = fract(p)-0.5;
      
      float r = hash31(id); 
      
      // 3. Time modulation for twinkling
      float twinkle = sin(uTime * 6.0 + r * 15.0) * 0.1 + 0.9; 

      // 4. Star Brightness Levels
      if(r > 0.998) { 
          float s = smoothstep(0.4, 0.02, length(uv)); 
          vec3 starCol = vec3(1.0, 1.0, 1.0) * mix(1.0, 2.0, fract(r*7.0)); 
          stars += starCol * s * r * twinkle; 
      }
      else if(r > 0.980) { 
          float s = smoothstep(0.4, 0.10, length(uv)); 
          vec3 starCol = mix(vec3(1.0, 0.95, 0.8), vec3(1.0, 0.7, 0.5), fract(r*11.0));
          stars += starCol * s * r * 1.0 * twinkle; 
      }
      else if(r > 0.95) { 
          float s = smoothstep(0.4, 0.20, length(uv)); 
          vec3 starCol = mix(vec3(0.7, 0.8, 1.0), vec3(0.8, 0.4, 0.3), fract(r*15.0));
          stars += starCol * s * r * 0.3; 
      }
      
      return stars;
  }

  // --- Accretion Disk Density ---
  float accretionDisk(vec3 p, float r) {
      float angle = atan(p.z, p.x);
      // Schwarzschild orbital speed approximation
      float speed = 4.0 / sqrt(r); 
      
      vec2 uv = vec2(cos(angle + uTime * speed * 0.15), sin(angle + uTime * speed * 0.15)) * r;
      
      vec2 warp = vec2(fbm(uv*0.5 + uTime*0.06), fbm(uv*0.5 - uTime*0.04));
      
      float cloud = fbm(uv * vec2(1.0, 2.0) + warp * 3.5);
      
      return smoothstep(0.1, 0.9, cloud);
  }

  // --- Color Conversions ---
  vec3 rgbToHsv(vec3 c) {
      vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
      vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
      vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
      float d = q.x - min(q.w, q.y);
      float e = 1.0e-10;
      return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }

  vec3 hsvToRgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.w);
      vec3 col = c.z * mix(K.xxx, clamp(p - K.x, 0.0, 1.0), c.y);
      return col;
  }

  // --- Black Hole Color Temperature ---
  vec3 getBlackHoleColor(float t) { 
      vec3 col = vec3(0.0);
      
      vec3 edgeCol = vec3(0.3, 0.0, 0.0);     
      vec3 mainCol = vec3(1.0, 0.5, 0.0);     
      vec3 highCol = vec3(1.0, 1.0, 0.8);     

      col += edgeCol * smoothstep(0.0, 0.2, t);
      col += mainCol * smoothstep(0.1, 0.6, t);
      col += highCol * smoothstep(0.5, 1.5, t); 
      
      return col;
  }

  void main() {
      vec2 uv = (vUv - 0.5) * 2.0;
      uv.x *= uResolution.x / uResolution.y;

      // Shift black hole position slightly up
      uv.y += -0.2; 

      // Ray Origin & Direction
      vec3 ro = uCamPos;
      vec3 fwd = normalize(uCamTarget - ro);
      vec3 right = normalize(cross(vec3(0,1,0), fwd));
      vec3 up = cross(fwd, right);
      vec3 rd = normalize(fwd + right*uv.x + up*uv.y);

      float rs = 2.0 * MASS;       
      float diskIn = DISK_IN * MASS;   
      float diskOut = 14.0 * MASS; 

      vec3 pos = ro;
      vec3 dir = rd;
      
      vec3 col = vec3(0.0);
      float alpha = 0.0;

      // --- Schwarzschild Geodesic Raymarching ---
      
      for(int i=0; i<MAX_STEPS; i++) {
          float r = length(pos);

          // Adaptive Step Size
          float step = max(0.005, r * 0.01); 
          
          // --- GR Bending Calculation ---
          if(r > rs * 0.1) {
              
              // Newtonian (1/r^2) + GR Correction (3M^2/r^4)
              float newtonianTerm = MASS / (r * r); 
              float grCorrectionTerm = 3.0 * MASS * MASS / (r * r * r * r); 
              
              float totalBendingFactor = newtonianTerm + grCorrectionTerm;
              
              // Apply bending force
              dir = normalize(dir + normalize(-pos) * totalBendingFactor * step * 1.5);
          }
          pos += dir * step;

          // Event Horizon Check
          if(r < rs) { 
              alpha = 1.0; 
              break; 
          }

          // Accretion Disk Check
          float h = abs(pos.y);
          float thickness = 0.1 + r * 0.01; 
          
          if(h < thickness && r >= diskIn && r < diskOut) {
              float dens = accretionDisk(pos, r);
              
              float radialFade = smoothstep(diskIn, diskIn+0.2, r) * smoothstep(diskOut, diskOut-3.0, r);
              float verticalFade = smoothstep(thickness, 0.0, h);
              
              // Doppler Effect & Relativistic Beaming
              float rxz = length(pos.xz);
              float doppler = 1.0;
              float dopplerTerm = 0.0; 
              
              if (rxz > 1.0e-5) {
                  // Tangential velocity vector approximation
                  vec3 velUnit = normalize(vec3(-pos.z, 0.0, pos.x));
                  
                  dopplerTerm = dot(velUnit, dir); 
                  
                  doppler = 1.0 + dopplerTerm;
                  doppler = pow(doppler, uDopplerPower); 
              }

              float intensity = dens * radialFade * verticalFade * doppler * uLuminosityScale;
              
              if(intensity > 0.01) {
                  vec3 c = getBlackHoleColor(intensity * 1.0); 
                  
                  vec3 hsv = rgbToHsv(c);
                  
                  // Doppler Color Shift
                  hsv.x = mod(hsv.x + dopplerTerm * uDopplerColorShift, 1.0);
                  hsv.x = mod(hsv.x + 1.0, 1.0); 
                  
                  // Global Hue Shift
                  hsv.x = mod(hsv.x + uHueShift, 1.0); 
                  c = hsvToRgb(hsv);
                  
                  float a = intensity * 0.25; 
                  col += c * a * (1.0 - alpha);
                  alpha += a;
                  if(alpha > 0.99) break; 
              }
          }
          if(r > MAX_DIST) break; 
      }

      // Background Composition
      if(alpha < 0.99) {
          col += getStarfield(dir) * (1.0 - alpha);
      }

      // ACES Tone Mapping
      col *= uExposure; 
      float a = 2.51; float b = 0.03; float c = 2.43; float d = 0.59; float e = 0.14;
      col = clamp((col*(a*col+b))/(col*(c*col+d)+e), 0.0, 1.0);
      
      // Gamma Correction
      col = pow(col, vec3(1.0/2.2));
      
      gl_FragColor = vec4(col, 1.0);
  }
`;
