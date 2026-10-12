import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sparkles,
  TrendingUp,
  Maximize2,
  Sliders,
  CheckCircle2,
  Radio,
} from 'lucide-react';

interface MathGraphVisualizerProps {
  problem: string;
  solutionResult?: string;
  language?: 'English' | 'Hindi' | 'Odia';
}

interface Point {
  x: number;
  y: number;
}

export const MathGraphVisualizer: React.FC<MathGraphVisualizerProps> = ({
  problem,
  solutionResult,
  language = 'English',
}) => {
  // Graph boundaries
  const [xMin, setXMin] = useState<number>(-10);
  const [xMax, setXMax] = useState<number>(10);
  const [yMin, setYMin] = useState<number>(-10);
  const [yMax, setYMax] = useState<number>(10);

  // Custom function formula override
  const [customFormula, setCustomFormula] = useState<string>('');
  const [showFormulaEditor, setShowFormulaEditor] = useState<boolean>(false);

  // Audio Sonification States
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0); // 0.5x, 1x, 2x
  const [waveType, setWaveType] = useState<OscillatorType>('sine');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Cursor hover state
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  // Animated tracer position
  const [tracerProgress, setTracerProgress] = useState<number | null>(null); // 0 to 1

  // Audio context refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const playbackStartRef = useRef<number>(0);

  // Parse Problem string to mathematical function f(x)
  const parsedFunction = useMemo(() => {
    const raw = (customFormula.trim() || problem || '2x + 8 = 20').trim();

    const parseSide = (s: string) => {
      return s
        .replace(/(\d+)([a-zA-Z])/g, '$1*$2') // 2x -> 2*x
        .replace(/([a-zA-Z])(\d+)/g, '$1*$2')
        .replace(/\^/g, '**'); // x^2 -> x**2
    };

    // 1. Check for equations with '='
    if (raw.includes('=')) {
      const parts = raw.split('=');
      const lhs = parts[0].trim();
      const rhs = parts[1].trim();
      const exprStr = `(${parseSide(lhs)}) - (${parseSide(rhs)})`;

      return {
        displayStr: `f(x) = ${lhs} - (${rhs})`,
        fn: (x: number) => {
          try {
            const sanitized = exprStr.replace(/\bx\b/gi, `(${x})`);
            // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
            const evalFn = new Function(
              'xVal',
              `const { sin, cos, tan, sqrt, abs, exp, log, PI, E } = Math;
               const pi = PI, e = E;
               return (${sanitized});`
            );
            const res = evalFn(x);
            return typeof res === 'number' && !isNaN(res) && isFinite(res) ? res : 0;
          } catch {
            return 0;
          }
        },
      };
    }

    // 2. Direct functions (e.g. sin(x), x^2 - 4, 3x + 5)
    const clean = raw
      .replace(/(\d+)([a-zA-Z])/g, '$1*$2')
      .replace(/\^/g, '**');

    // Handle arithmetic expressions like '(14 * 3) / 2' or '(3/4) + (5/6)' without x
    if (!clean.includes('x') && !clean.includes('X')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
        const evalFn = new Function(
          `const { sin, cos, tan, sqrt, abs, exp, log, PI, E } = Math;
           const pi = PI, e = E;
           return (${clean});`
        );
        const constVal = evalFn();
        return {
          displayStr: `f(x) = ${typeof constVal === 'number' ? constVal.toFixed(2) : '0'}`,
          fn: () => (typeof constVal === 'number' ? constVal : 0),
        };
      } catch {
        return { displayStr: `f(x) = 0`, fn: () => 0 };
      }
    }

    return {
      displayStr: `f(x) = ${raw}`,
      fn: (x: number) => {
        try {
          const sanitized = clean.replace(/\bx\b/gi, `(${x})`);
          // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
          const evalFn = new Function(
            'xVal',
            `const { sin, cos, tan, sqrt, abs, exp, log, PI, E } = Math;
             const pi = PI, e = E;
             return (${sanitized});`
          );
          const res = evalFn(x);
          return typeof res === 'number' && !isNaN(res) && isFinite(res) ? res : 0;
        } catch {
          return 0;
        }
      },
    };
  }, [problem, customFormula]);

  // Compute sampled points across [xMin, xMax]
  const samplePoints: Point[] = useMemo(() => {
    const pts: Point[] = [];
    const steps = 250;
    const dx = (xMax - xMin) / steps;

    for (let i = 0; i <= steps; i++) {
      const x = xMin + i * dx;
      const y = parsedFunction.fn(x);
      // Clamp extreme spikes for stability
      const clampedY = Math.max(-100, Math.min(100, y));
      pts.push({ x, y: clampedY });
    }
    return pts;
  }, [parsedFunction, xMin, xMax]);

  // Find Key Points: Roots (x-intercepts) & Y-intercept
  const keyPoints = useMemo(() => {
    const roots: Point[] = [];
    const steps = samplePoints.length;

    // Detect zero crossings
    for (let i = 0; i < steps - 1; i++) {
      const p1 = samplePoints[i];
      const p2 = samplePoints[i + 1];

      if (p1.y === 0) {
        roots.push(p1);
      } else if (p1.y * p2.y < 0) {
        // Linear interpolation root approximation
        const rootX = p1.x - p1.y * ((p2.x - p1.x) / (p2.y - p1.y));
        roots.push({ x: parseFloat(rootX.toFixed(2)), y: 0 });
      }
    }

    // Y-intercept at x = 0
    const yInterceptY = parsedFunction.fn(0);
    const yIntercept: Point = { x: 0, y: parseFloat(yInterceptY.toFixed(2)) };

    return { roots, yIntercept };
  }, [samplePoints, parsedFunction]);

  // SVG Dimension Constants
  const svgWidth = 620;
  const svgHeight = 360;
  const padding = 36;

  // Coordinate transforms
  const toSvgX = useCallback(
    (x: number) => padding + ((x - xMin) / (xMax - xMin)) * (svgWidth - 2 * padding),
    [xMin, xMax]
  );

  const toSvgY = useCallback(
    (y: number) => svgHeight - padding - ((y - yMin) / (yMax - yMin)) * (svgHeight - 2 * padding),
    [yMin, yMax]
  );

  const fromSvgX = useCallback(
    (svgX: number) => xMin + ((svgX - padding) / (svgWidth - 2 * padding)) * (xMax - xMin),
    [xMin, xMax]
  );

  // SVG Path Data for Curve
  const svgPathData = useMemo(() => {
    if (samplePoints.length === 0) return '';
    return samplePoints.reduce((acc, p, idx) => {
      const sx = toSvgX(p.x);
      const sy = toSvgY(p.y);
      return idx === 0 ? `M ${sx.toFixed(1)} ${sy.toFixed(1)}` : `${acc} L ${sx.toFixed(1)} ${sy.toFixed(1)}`;
    }, '');
  }, [samplePoints, toSvgX, toSvgY]);

  // SVG Shaded Area Path (under curve down to y=0)
  const svgAreaPathData = useMemo(() => {
    if (samplePoints.length === 0) return '';
    const firstX = toSvgX(samplePoints[0].x);
    const lastX = toSvgX(samplePoints[samplePoints.length - 1].x);
    const zeroY = toSvgY(0);

    return `${svgPathData} L ${lastX.toFixed(1)} ${zeroY.toFixed(1)} L ${firstX.toFixed(1)} ${zeroY.toFixed(1)} Z`;
  }, [svgPathData, samplePoints, toSvgX, toSvgY]);

  // Web Audio Sonification Engine
  const startAudioSonification = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Create Oscillator & Gain
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = waveType;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(isMuted ? 0 : 0.18, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      oscRef.current = osc;
      gainRef.current = gain;
      setIsPlayingAudio(true);

      const totalDuration = 3.5 / audioSpeed; // Duration in seconds
      playbackStartRef.current = performance.now();

      // Find min and max y in the sample set to normalize pitch
      const validYs = samplePoints.map((p) => p.y).filter((y) => !isNaN(y) && isFinite(y));
      const minYVal = Math.min(...validYs, -5);
      const maxYVal = Math.max(...validYs, 5);

      const animateStep = (now: number) => {
        const elapsed = (now - playbackStartRef.current) / 1000;
        const progress = Math.min(1, elapsed / totalDuration);
        setTracerProgress(progress);

        if (progress < 1) {
          // Get current x and y
          const currentX = xMin + progress * (xMax - xMin);
          const currentY = parsedFunction.fn(currentX);

          // Map Y to Frequency: 180Hz (deep bass) to 880Hz (bright treble)
          const normY = Math.max(0, Math.min(1, (currentY - minYVal) / (maxYVal - minYVal || 1)));
          const freq = 180 + normY * 700;

          if (oscRef.current && gainRef.current && audioCtxRef.current) {
            const audioNow = audioCtxRef.current.currentTime;
            oscRef.current.frequency.setTargetAtTime(freq, audioNow, 0.02);

            // If close to root (y approx 0), make a slight audible harmonic pulse
            if (Math.abs(currentY) < 0.25) {
              gainRef.current.gain.setTargetAtTime(isMuted ? 0 : 0.28, audioNow, 0.01);
            } else {
              gainRef.current.gain.setTargetAtTime(isMuted ? 0 : 0.18, audioNow, 0.03);
            }
          }

          animFrameRef.current = requestAnimationFrame(animateStep);
        } else {
          // Completed
          stopAudioSonification();
        }
      };

      animFrameRef.current = requestAnimationFrame(animateStep);
    } catch (err) {
      console.warn('Audio graph sonification error:', err);
      setIsPlayingAudio(false);
    }
  };

  const stopAudioSonification = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (gainRef.current && audioCtxRef.current) {
      try {
        gainRef.current.gain.linearRampToValueAtTime(0.0001, audioCtxRef.current.currentTime + 0.08);
      } catch {}
    }

    setTimeout(() => {
      try {
        oscRef.current?.stop();
        oscRef.current?.disconnect();
        gainRef.current?.disconnect();
      } catch {}
      oscRef.current = null;
      gainRef.current = null;
    }, 100);

    setIsPlayingAudio(false);
    setTracerProgress(null);
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      try {
        oscRef.current?.stop();
        audioCtxRef.current?.close();
      } catch {}
    };
  }, []);

  // Tracer coordinates on SVG
  const tracerPoint = useMemo(() => {
    if (tracerProgress === null) return null;
    const currentX = xMin + tracerProgress * (xMax - xMin);
    const currentY = parsedFunction.fn(currentX);
    return {
      svgX: toSvgX(currentX),
      svgY: toSvgY(currentY),
      x: currentX,
      y: currentY,
    };
  }, [tracerProgress, xMin, xMax, parsedFunction, toSvgX, toSvgY]);

  // Handle Zoom
  const handleZoom = (direction: 'in' | 'out') => {
    const factor = direction === 'in' ? 0.7 : 1.4;
    setXMin((x) => Math.round(x * factor));
    setXMax((x) => Math.round(x * factor));
    setYMin((y) => Math.round(y * factor));
    setYMax((y) => Math.round(y * factor));
  };

  const handleResetZoom = () => {
    setXMin(-10);
    setXMax(10);
    setYMin(-10);
    setYMax(10);
  };

  return (
    <div className="math-graph-card">
      {/* Top Header Row */}
      <div className="math-graph-header">
        <div className="math-graph-title-group">
          <div className="math-graph-badge">
            <TrendingUp size={15} color="#4f46e5" />
            <span>
              {language === 'Odia'
                ? 'ଗାଣିତିକ ଗ୍ରାଫ୍ ଓ ଧ୍ୱନି ତରଙ୍ଗ (FUNCTION GRAPH & SOUND)'
                : language === 'Hindi'
                ? 'गणितीय आलेख एवं ध्वनि (FUNCTION GRAPH & SOUND)'
                : 'INTERACTIVE FUNCTION GRAPH & AUDIO SONIFICATION'}
            </span>
          </div>
          <h3 className="math-graph-title">{parsedFunction.displayStr}</h3>
          <p className="math-graph-subtitle">
            {language === 'Odia'
              ? 'ସମୀକରଣର ସଠିକ୍ ବକ୍ରରେଖା ଏବଂ ଶ୍ରାବ୍ୟ ଧ୍ୱନି (y ବଢିଲେ ସ୍ୱର ଉଚ୍ଚ ହୁଏ, କମିଲେ ଗଭୀର ହୁଏ)'
              : language === 'Hindi'
              ? 'समीकरण का वास्तविक समय ग्राफ़ एवं ध्वनि तरंग (y बढ़ने पर स्वर उच्च, घटने पर मंद)'
              : 'Visual algebraic curve with auditory sonification (pitch rises as y increases, dips as y decreases).'}
          </p>
        </div>

        {/* Header Actions */}
        <div className="math-graph-top-actions">
          <button
            type="button"
            className="btn-graph-action secondary"
            onClick={() => setShowFormulaEditor(!showFormulaEditor)}
            title="Edit function or enter custom equation"
          >
            <Sliders size={14} />
            <span>{showFormulaEditor ? 'Hide Formula' : 'Edit Equation'}</span>
          </button>
          <button
            type="button"
            className="btn-graph-action secondary"
            onClick={handleResetZoom}
            title="Reset Cartesian plane to [-10, 10]"
          >
            <RotateCcw size={14} />
            <span>Reset Grid</span>
          </button>
        </div>
      </div>

      {/* Formula Editor Bar */}
      {showFormulaEditor && (
        <div className="math-graph-formula-bar">
          <span className="formula-input-prefix">y =</span>
          <input
            type="text"
            className="formula-input-box"
            placeholder="e.g. 2x - 4, x^2 - 5x + 6, sin(x), 3*cos(2*x)"
            value={customFormula}
            onChange={(e) => setCustomFormula(e.target.value)}
          />
          <button
            type="button"
            className="btn-apply-formula"
            onClick={() => {
              // triggers re-evaluation
            }}
          >
            Plot Function
          </button>
        </div>
      )}

      {/* Sonification Sound Controller Bar */}
      <div className="math-graph-sound-bar">
        <div className="sound-bar-left">
          <button
            type="button"
            className={`btn-play-graph-sound ${isPlayingAudio ? 'playing' : ''}`}
            onClick={isPlayingAudio ? stopAudioSonification : startAudioSonification}
          >
            {isPlayingAudio ? (
              <>
                <Pause size={16} />
                <span>Pause Graph Sound</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>▶ Play Graph Sound</span>
              </>
            )}
          </button>

          {/* Speed Selector */}
          <div className="audio-speed-pills">
            {[0.5, 1.0, 2.0].map((spd) => (
              <button
                key={spd}
                type="button"
                className={`speed-pill ${audioSpeed === spd ? 'active' : ''}`}
                onClick={() => setAudioSpeed(spd)}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Wave Selector */}
          <div className="audio-wave-pills">
            {(['sine', 'triangle'] as OscillatorType[]).map((w) => (
              <button
                key={w}
                type="button"
                className={`wave-pill ${waveType === w ? 'active' : ''}`}
                onClick={() => setWaveType(w)}
              >
                {w === 'sine' ? 'Pure Tone' : 'Acoustic'}
              </button>
            ))}
          </div>
        </div>

        {/* Right side sound indicators */}
        <div className="sound-bar-right">
          {isPlayingAudio && (
            <div className="graph-sound-indicator">
              <Radio size={14} className="pulse-icon text-indigo" />
              <span>Sweeping Curve...</span>
              <div className="audio-live-bars">
                <span className="bar b1" />
                <span className="bar b2" />
                <span className="bar b3" />
                <span className="bar b4" />
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn-sound-mute"
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute graph sound' : 'Mute graph sound'}
          >
            {isMuted ? <VolumeX size={16} color="#ef4444" /> : <Volume2 size={16} color="#4f46e5" />}
          </button>
        </div>
      </div>

      {/* SVG Coordinate Graph Canvas */}
      <div className="math-graph-canvas-wrapper">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="math-graph-svg"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const svgX = ((e.clientX - rect.left) / rect.width) * svgWidth;
            if (svgX >= padding && svgX <= svgWidth - padding) {
              const xVal = parseFloat(fromSvgX(svgX).toFixed(2));
              const yVal = parseFloat(parsedFunction.fn(xVal).toFixed(2));
              setHoverCoord({ x: xVal, y: yVal });
            }
          }}
          onMouseLeave={() => setHoverCoord(null)}
        >
          <defs>
            {/* Shaded Area Gradient */}
            <linearGradient id="mathAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
            </linearGradient>

            {/* Curve Stroke Gradient */}
            <linearGradient id="mathLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            {/* Glowing filter */}
            <filter id="mathGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#4f46e5" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Background Grid Lines */}
          {Array.from({ length: 21 }).map((_, i) => {
            const xVal = xMin + (i * (xMax - xMin)) / 20;
            const yVal = yMin + (i * (yMax - yMin)) / 20;
            const sx = toSvgX(xVal);
            const sy = toSvgY(yVal);

            return (
              <g key={i}>
                {/* Vertical Grid Line */}
                <line
                  x1={sx}
                  y1={padding}
                  x2={sx}
                  y2={svgHeight - padding}
                  stroke={xVal === 0 ? '#64748b' : '#f1f5f9'}
                  strokeWidth={xVal === 0 ? 1.5 : 1}
                  strokeDasharray={xVal === 0 ? undefined : '2 2'}
                />
                {/* Horizontal Grid Line */}
                <line
                  x1={padding}
                  y1={sy}
                  x2={svgWidth - padding}
                  y2={sy}
                  stroke={yVal === 0 ? '#64748b' : '#f1f5f9'}
                  strokeWidth={yVal === 0 ? 1.5 : 1}
                  strokeDasharray={yVal === 0 ? undefined : '2 2'}
                />
              </g>
            );
          })}

          {/* Main X-Axis */}
          <line
            x1={padding}
            y1={toSvgY(0)}
            x2={svgWidth - padding}
            y2={toSvgY(0)}
            stroke="#475569"
            strokeWidth="2"
          />

          {/* Main Y-Axis */}
          <line
            x1={toSvgX(0)}
            y1={padding}
            x2={toSvgX(0)}
            y2={svgHeight - padding}
            stroke="#475569"
            strokeWidth="2"
          />

          {/* X-Axis Tick Labels */}
          {[-8, -4, 0, 4, 8].map((val) => {
            if (val < xMin || val > xMax) return null;
            return (
              <text
                key={`xtick-${val}`}
                x={toSvgX(val)}
                y={toSvgY(0) + 14}
                fontSize="10"
                fontWeight="700"
                fill="#64748b"
                textAnchor="middle"
              >
                {val}
              </text>
            );
          })}

          {/* Y-Axis Tick Labels */}
          {[-8, -4, 4, 8].map((val) => {
            if (val < yMin || val > yMax) return null;
            return (
              <text
                key={`ytick-${val}`}
                x={toSvgX(0) - 8}
                y={toSvgY(val) + 3}
                fontSize="10"
                fontWeight="700"
                fill="#64748b"
                textAnchor="end"
              >
                {val}
              </text>
            );
          })}

          {/* Shaded Area Under Curve */}
          <path d={svgAreaPathData} fill="url(#mathAreaGrad)" />

          {/* Main Curve Function Line */}
          <path
            d={svgPathData}
            fill="none"
            stroke="url(#mathLineGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#mathGlow)"
          />

          {/* Key Marked Points: Roots (X-Intercepts) */}
          {keyPoints.roots.map((root, idx) => (
            <g key={`root-${idx}`}>
              <circle
                cx={toSvgX(root.x)}
                cy={toSvgY(root.y)}
                r="6"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <rect
                x={toSvgX(root.x) - 24}
                y={toSvgY(root.y) - 22}
                width="48"
                height="16"
                rx="4"
                fill="#065f46"
                opacity="0.85"
              />
              <text
                x={toSvgX(root.x)}
                y={toSvgY(root.y) - 11}
                fontSize="9"
                fontWeight="800"
                fill="#ffffff"
                textAnchor="middle"
              >
                ({root.x}, 0)
              </text>
            </g>
          ))}

          {/* Y-Intercept Point */}
          {keyPoints.yIntercept.y >= yMin && keyPoints.yIntercept.y <= yMax && (
            <g>
              <circle
                cx={toSvgX(0)}
                cy={toSvgY(keyPoints.yIntercept.y)}
                r="5.5"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Interactive Cursor Hover Point */}
          {hoverCoord && (
            <g>
              <line
                x1={toSvgX(hoverCoord.x)}
                y1={padding}
                x2={toSvgX(hoverCoord.x)}
                y2={svgHeight - padding}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx={toSvgX(hoverCoord.x)}
                cy={toSvgY(hoverCoord.y)}
                r="6"
                fill="#4f46e5"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Animated Audio Tracer Bead */}
          {tracerPoint && (
            <g>
              {/* Outer Pulsing Ring */}
              <circle
                cx={tracerPoint.svgX}
                cy={tracerPoint.svgY}
                r="12"
                fill="#4f46e5"
                opacity="0.3"
                className="animate-ping"
              />
              {/* Inner Core Bead */}
              <circle
                cx={tracerPoint.svgX}
                cy={tracerPoint.svgY}
                r="7"
                fill="#4f46e5"
                stroke="#ffffff"
                strokeWidth="2.5"
                filter="url(#mathGlow)"
              />
            </g>
          )}
        </svg>

        {/* Hover Coordinate Float Badge */}
        {hoverCoord && (
          <div
            className="graph-hover-badge"
            style={{
              left: `${toSvgX(hoverCoord.x)}px`,
              top: `${Math.max(12, toSvgY(hoverCoord.y) - 34)}px`,
            }}
          >
            x = {hoverCoord.x}, y = {hoverCoord.y}
          </div>
        )}

        {/* Zoom Controls Overlay */}
        <div className="graph-zoom-controls">
          <button
            type="button"
            className="btn-zoom-icon"
            onClick={() => handleZoom('in')}
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button
            type="button"
            className="btn-zoom-icon"
            onClick={() => handleZoom('out')}
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <button
            type="button"
            className="btn-zoom-icon"
            onClick={handleResetZoom}
            title="Reset View"
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>

      {/* Mathematical Breakdown Footer */}
      <div className="math-graph-footer-stats">
        <div className="graph-stat-pill">
          <span className="pill-label">Detected Equation:</span>
          <span className="pill-val">{problem}</span>
        </div>

        {keyPoints.roots.length > 0 && (
          <div className="graph-stat-pill success">
            <CheckCircle2 size={14} color="#059669" />
            <span className="pill-label">Calculated Roots (x):</span>
            <span className="pill-val">
              {keyPoints.roots.map((r) => r.x).join(', ')}
            </span>
          </div>
        )}

        {solutionResult && (
          <div className="graph-stat-pill indigo">
            <Sparkles size={14} color="#4f46e5" />
            <span className="pill-label">Algebraic Solution:</span>
            <span className="pill-val">{solutionResult}</span>
          </div>
        )}

        <div className="graph-stat-pill">
          <span className="pill-label">Y-Intercept:</span>
          <span className="pill-val">
            (0, {keyPoints.yIntercept.y})
          </span>
        </div>
      </div>
    </div>
  );
};
