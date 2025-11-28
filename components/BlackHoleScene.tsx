import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { SimulationParams } from '../types';
import { VERTEX_SHADER, FRAGMENT_SHADER } from '../constants';

export interface BlackHoleSceneRef {
  zoomIn: () => number;
  zoomOut: () => number;
  takeSnapshot: () => void;
}

interface BlackHoleSceneProps {
  params: SimulationParams;
  isAutoRotate: boolean;
  onStatusUpdate: (msg: string) => void;
}

const BlackHoleScene = forwardRef<BlackHoleSceneRef, BlackHoleSceneProps>(({
  params,
  isAutoRotate,
  onStatusUpdate,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // These refs hold the "Source of Truth" for the simulation, decoupled from React state
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const uniformsRef = useRef<any>(null);

  // Physics State (Matches original JS variables)
  const state = useRef({
    targetRadius: 25.0,
    camRadius: 25.0,
    targetTheta: 0.0,
    camTheta: 0.0,
    targetPhi: Math.PI / 2,
    camPhi: Math.PI / 2,
  });

  // Interaction State
  const interaction = useRef({
    isDragging: false,
    lastX: 0,
    lastY: 0,
    lastPinchDist: 0,
  });

  // Expose methods to parent via Ref
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      state.current.targetRadius = Math.max(2.5, state.current.targetRadius - 3.0);
      return state.current.targetRadius;
    },
    zoomOut: () => {
      state.current.targetRadius = Math.min(60.0, state.current.targetRadius + 3.0);
      return state.current.targetRadius;
    },
    takeSnapshot: () => {
      if (rendererRef.current && composerRef.current) {
        const oldPR = rendererRef.current.getPixelRatio();
        rendererRef.current.setPixelRatio(4.0);
        composerRef.current.render();
        
        const link = document.createElement('a');
        link.download = `BlackHole_Schwarzschild_GR_${Date.now()}.png`;
        link.href = rendererRef.current.domElement.toDataURL('image/png');
        link.click();
        
        rendererRef.current.setPixelRatio(oldPR);
      }
    }
  }));

  // Update uniforms when params change (Low frequency updates)
  useEffect(() => {
    if (uniformsRef.current && bloomPassRef.current) {
      uniformsRef.current.uDopplerPower.value = params.dopplerPower;
      uniformsRef.current.uDopplerColorShift.value = params.dopplerColorShift;
      uniformsRef.current.uLuminosityScale.value = params.luminosityScale;
      uniformsRef.current.uHueShift.value = params.hueShift;
      uniformsRef.current.uExposure.value = params.exposure;
      bloomPassRef.current.strength = params.bloomStrength;
    }
  }, [params]);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Three.js Initialization (Strictly preserving original logic) ---
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const geometry = new THREE.PlaneGeometry(2, 2);
    
    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(width, height) },
      uCamPos: { value: new THREE.Vector3() },
      uCamTarget: { value: new THREE.Vector3(0, 0, 0) },
      uExposure: { value: params.exposure },
      uHueShift: { value: params.hueShift },
      uLuminosityScale: { value: params.luminosityScale },
      uDopplerPower: { value: params.dopplerPower },
      uDopplerColorShift: { value: params.dopplerColorShift },
    };
    uniformsRef.current = uniforms;

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: uniforms,
    });
    scene.add(new THREE.Mesh(geometry, material));

    // --- Post Processing ---
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      params.bloomStrength,
      0.8,
      0.2
    );
    bloomPassRef.current = bloomPass;
    composer.addPass(bloomPass);
    composerRef.current = composer;

    // --- Interaction Logic (Ported exactly from original script) ---
    const rotate = (dx: number, dy: number) => {
      state.current.targetTheta -= dx * 0.004;
      state.current.targetPhi -= dy * 0.004;
      state.current.targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, state.current.targetPhi));
    };

    const zoom = (delta: number) => {
      state.current.targetRadius += delta;
      state.current.targetRadius = Math.max(2.5, Math.min(60.0, state.current.targetRadius));
      // Debounce status updates slightly to avoid flooding but keep responsive
      // Since this runs in event loop, calling prop is fine as long as parent doesn't re-render THIS component
      onStatusUpdate(`Distance: ${state.current.targetRadius.toFixed(1)} M`);
    };

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      composer.setSize(w, h);
      uniforms.uResolution.value.set(w, h);
    };

    // Event Handlers
    const onMouseDown = (e: MouseEvent) => {
      interaction.current.isDragging = true;
      interaction.current.lastX = e.clientX;
      interaction.current.lastY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (interaction.current.isDragging) {
        rotate(e.clientX - interaction.current.lastX, e.clientY - interaction.current.lastY);
        interaction.current.lastX = e.clientX;
        interaction.current.lastY = e.clientY;
      }
    };

    const onMouseUp = () => {
      interaction.current.isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom(Math.sign(e.deltaY) * 2.0);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        interaction.current.isDragging = true;
        interaction.current.lastX = e.touches[0].clientX;
        interaction.current.lastY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        interaction.current.isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        interaction.current.lastPinchDist = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && interaction.current.isDragging) {
        rotate(e.touches[0].clientX - interaction.current.lastX, e.touches[0].clientY - interaction.current.lastY);
        interaction.current.lastX = e.touches[0].clientX;
        interaction.current.lastY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        zoom((interaction.current.lastPinchDist - dist) * 0.05);
        interaction.current.lastPinchDist = dist;
      }
    };

    const onTouchEnd = () => {
      interaction.current.isDragging = false;
    };

    // Bind Events
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    
    // Bind to Canvas for better control
    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    // --- Animation Loop ---
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Auto Rotate Logic
      if (isAutoRotate && !interaction.current.isDragging) {
        state.current.targetTheta += 0.001;
      }

      // Smooth Camera Interpolation (Matches original script exactly)
      const s = state.current;
      s.camRadius += (s.targetRadius - s.camRadius) * 0.08;
      s.camTheta += (s.targetTheta - s.camTheta) * 0.08;
      s.camPhi += (s.targetPhi - s.camPhi) * 0.08;

      // Spherical -> Cartesian
      const x = s.camRadius * Math.sin(s.camPhi) * Math.cos(s.camTheta);
      const y = s.camRadius * Math.cos(s.camPhi);
      const z = s.camRadius * Math.sin(s.camPhi) * Math.sin(s.camTheta);

      uniforms.uCamPos.value.set(x, y, z);
      uniforms.uCamTarget.value.set(0, 0, 0);
      uniforms.uTime.value = performance.now() / 1000;

      composer.render();
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isAutoRotate]); // Re-bind if autoRotate changes, though we could use a ref for that too. Keeping it safe.

  return <div ref={containerRef} className="w-full h-full absolute inset-0 z-0" />;
});

export default BlackHoleScene;