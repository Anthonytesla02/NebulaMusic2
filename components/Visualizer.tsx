import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  color: string;
}

const Visualizer: React.FC<VisualizerProps> = ({ audioElement, isPlaying, color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();
  const audioContextRef = useRef<AudioContext>();
  const sourceRef = useRef<MediaElementAudioSourceNode>();

  useEffect(() => {
    if (!audioElement || !canvasRef.current) return;

    // Initialize Audio Context only once via user interaction usually, 
    // but here we assume it's triggered after playback starts
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      // Connect audio element to analyser
      // Need to check if source already exists to avoid errors on re-renders
      try {
         sourceRef.current = audioContextRef.current.createMediaElementSource(audioElement);
         sourceRef.current.connect(analyserRef.current);
         analyserRef.current.connect(audioContextRef.current.destination);
      } catch (e) {
        // Source might already be connected, ignore
      }
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;

    if (!ctx || !analyser) return;

    const renderFrame = () => {
      if (!isPlaying) {
         // Draw a flat line or idle state
         ctx.clearRect(0, 0, canvas.width, canvas.height);
         ctx.fillStyle = color + '33'; // low opacity
         ctx.fillRect(0, canvas.height / 2, canvas.width, 2);
         return;
      }

      animationRef.current = requestAnimationFrame(renderFrame);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];

        // Dynamic coloring based on the passed theme color
        ctx.fillStyle = color;
        // Make the top of the bar slightly transparent
        ctx.globalAlpha = 0.6 + (barHeight / 255) * 0.4; 

        // Draw mirrored visualizer
        const y = canvas.height - (barHeight / 255) * canvas.height * 0.5;
        const height = (barHeight / 255) * canvas.height * 0.5;
        
        // Bottom half
        ctx.fillRect(x, canvas.height / 2, barWidth, height);
        // Top half
        ctx.fillRect(x, canvas.height / 2 - height, barWidth, height);

        x += barWidth + 1;
      }
      ctx.globalAlpha = 1.0;
    };

    if (isPlaying) {
        // Resume context if suspended (browser policy)
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
        renderFrame();
    } else {
        cancelAnimationFrame(animationRef.current!);
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [audioElement, isPlaying, color]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full rounded-xl"
      width={600}
      height={200}
    />
  );
};

export default Visualizer;