import { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Volume2,
  X,
  CheckCircle2,
  Compass,
  ArrowRight,
  BookOpen,
  Mic,
  MapPin,
  Camera,
  Shield,
} from 'lucide-react';
import type { User } from '../types';
import type { AcademicActiveTab } from './AcademicSolverPage';
import { playWelcomeSound, speakWelcomeGreeting } from '../utils/soundEffects';

interface WelcomeCelebrationModalProps {
  user: User | null;
  onClose: () => void;
  onNavigateToFeature?: (featureTab: AcademicActiveTab) => void;
}

interface ConfettiParticle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  vx: number;
  vy: number;
  shape: 'rect' | 'circle' | 'strip';
  opacity: number;
}

export function WelcomeCelebrationModal({
  user,
  onClose,
  onNavigateToFeature,
}: WelcomeCelebrationModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(8);
  const [isHovered, setIsHovered] = useState(false);

  const displayName = user?.full_name?.trim() || user?.username || 'Scholar';
  const displayRole = user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Student';

  // Play welcome chime & optional speech on initial render
  useEffect(() => {
    // Give browser a 100ms micro-tick for smoother visual mounting
    const timer = setTimeout(() => {
      playWelcomeSound();
      if (displayName) {
        speakWelcomeGreeting(displayName);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [displayName]);

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Countdown timer (auto-dismiss after 8 seconds, pauses on hover)
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isHovered, onClose]);

  // Confetti Physics Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const colors = [
      '#38bdf8', // sky cyan
      '#6366f1', // indigo
      '#a855f7', // purple
      '#ec4899', // pink
      '#10b981', // emerald
      '#f59e0b', // amber gold
      '#06b6d4', // cyan
      '#f43f5e', // rose
      '#3b82f6', // blue
      '#eab308', // yellow
    ];

    const particles: ConfettiParticle[] = [];
    const particleCount = 130;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * -height * 0.8, // start above screen
        w: Math.random() * 8 + 6,
        h: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 3.5 + 2.5,
        shape: Math.random() > 0.4 ? 'rect' : Math.random() > 0.5 ? 'circle' : 'strip',
        opacity: Math.random() * 0.4 + 0.6,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx + Math.sin(p.y * 0.02) * 0.6;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Wrap around smoothly
        if (p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
        }
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Strip
          ctx.fillRect(-p.w / 2, -p.h * 1.5, p.w * 0.5, p.h * 3);
        }

        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleReplayChime = () => {
    playWelcomeSound();
    if (displayName) {
      speakWelcomeGreeting(displayName);
    }
  };

  const handleFeatureClick = (tab: AcademicActiveTab) => {
    onClose();
    if (onNavigateToFeature) {
      onNavigateToFeature(tab);
    }
  };

  return (
    <div className="welcome-celebration-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      {/* 60FPS Confetti Canvas */}
      <canvas ref={canvasRef} className="welcome-confetti-canvas" />

      {/* Radiant Glowing Ambient Lights */}
      <div className="welcome-ambient-glow welcome-glow-1" />
      <div className="welcome-ambient-glow welcome-glow-2" />

      {/* Main Celebration Modal Card */}
      <div
        className="welcome-celebration-card"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Top Dismiss Button */}
        <button
          className="welcome-close-btn"
          onClick={onClose}
          aria-label="Close welcome celebration"
          title="Close (Esc)"
        >
          <X size={18} />
        </button>

        {/* Header Ribbon / Trophy Icon */}
        <div className="welcome-hero-badge-wrap">
          <div className="welcome-avatar-ring">
            <div className="welcome-avatar-initial">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="welcome-status-dot" title="Active Session">
              <CheckCircle2 size={14} color="#10b981" />
            </div>
          </div>
          <div className="welcome-sparkle-pill">
            <Sparkles size={14} className="sparkle-spin-icon" />
            <span>SESSION INITIALIZED</span>
          </div>
        </div>

        {/* Greeting Title */}
        <div className="welcome-text-group">
          <h2 className="welcome-title">
            Welcome to <span className="brand-gradient-text">ATLAS 2.0</span>!
          </h2>
          <div className="welcome-user-headline">
            <span className="welcome-user-name">{displayName}</span>
            <span className="welcome-role-tag">
              <Shield size={12} />
              {displayRole}
            </span>
          </div>
          <p className="welcome-description">
            Your personalized learning and academic computing environment is ready.
            Explore interactive solvers, voice lessons, and geography studies below.
          </p>
        </div>

        {/* Quick Launchpad Grid */}
        <div className="welcome-launchpad-section">
          <div className="welcome-launchpad-title">
            <Compass size={14} />
            <span>QUICK LAUNCHPAD</span>
          </div>
          <div className="welcome-launchpad-grid">
            <button
              className="welcome-feature-card"
              onClick={() => handleFeatureClick('solve-math')}
              title="Open Math Problem Solver"
            >
              <div className="welcome-feat-icon feat-math">
                <BookOpen size={18} />
              </div>
              <div className="welcome-feat-info">
                <div className="welcome-feat-name">Math Solver</div>
                <div className="welcome-feat-hint">Step-by-step calculus & algebra</div>
              </div>
              <ArrowRight size={14} className="feat-arrow" />
            </button>

            <button
              className="welcome-feature-card"
              onClick={() => handleFeatureClick('voice-learning')}
              title="Open Voice Learning Studio"
            >
              <div className="welcome-feat-icon feat-voice">
                <Mic size={18} />
              </div>
              <div className="welcome-feat-info">
                <div className="welcome-feat-name">Voice Learning</div>
                <div className="welcome-feat-hint">Daily topics & speech narration</div>
              </div>
              <ArrowRight size={14} className="feat-arrow" />
            </button>

            <button
              className="welcome-feature-card"
              onClick={() => handleFeatureClick('geography-idea')}
              title="Open Geography & India Map"
            >
              <div className="welcome-feat-icon feat-geo">
                <MapPin size={18} />
              </div>
              <div className="welcome-feat-info">
                <div className="welcome-feat-name">India Map & Geography</div>
                <div className="welcome-feat-hint">Interactive 28 states & UTs</div>
              </div>
              <ArrowRight size={14} className="feat-arrow" />
            </button>

            <button
              className="welcome-feature-card"
              onClick={() => handleFeatureClick('image-scanner')}
              title="Open Problem Image Scanner"
            >
              <div className="welcome-feat-icon feat-scan">
                <Camera size={18} />
              </div>
              <div className="welcome-feat-info">
                <div className="welcome-feat-name">Image & PDF Scanner</div>
                <div className="welcome-feat-hint">OCR handwritten solver</div>
              </div>
              <ArrowRight size={14} className="feat-arrow" />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="welcome-footer-row">
          <button
            type="button"
            className="welcome-sound-toggle-btn"
            onClick={handleReplayChime}
            title="Replay ascending welcome chime"
          >
            <Volume2 size={15} />
            <span>Replay Chime</span>
          </button>

          <button
            type="button"
            className="welcome-explore-cta-btn"
            onClick={() => handleFeatureClick('home')}
          >
            <span>Enter Dashboard</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Countdown Progress Bar */}
        <div className="welcome-countdown-bar-wrap" title={`Auto-closing in ${secondsRemaining}s`}>
          <div
            className="welcome-countdown-bar-fill"
            style={{ width: `${(secondsRemaining / 8) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
