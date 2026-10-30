import React, { useState, useEffect, useRef, useCallback } from 'react';

interface FloatingVoiceOrbProps {
  isOnVoiceSection: boolean;
  isVoiceSessionActive: boolean;
  onActivateVoiceAssistant: () => void;
}

interface OrbPosition {
  x: number;
  y: number;
}

const ORB_STORAGE_KEY = 'decision_arena_floating_orb_pos_v1';
const EDGE_MARGIN = 16;

function getOrbSize(): number {
  if (typeof window === 'undefined') return 60;
  return window.innerWidth < 640 ? 52 : 60;
}

function clampPosition(x: number, y: number, size: number): OrbPosition {
  if (typeof window === 'undefined') return { x, y };
  const maxX = Math.max(EDGE_MARGIN, window.innerWidth - size - EDGE_MARGIN);
  const maxY = Math.max(EDGE_MARGIN, window.innerHeight - size - EDGE_MARGIN);
  return {
    x: Math.min(maxX, Math.max(EDGE_MARGIN, Math.round(x))),
    y: Math.min(maxY, Math.max(EDGE_MARGIN, Math.round(y))),
  };
}

function getDefaultPosition(): OrbPosition {
  if (typeof window === 'undefined') return { x: 300, y: 500 };
  const size = getOrbSize();
  return clampPosition(
    window.innerWidth - size - 24,
    window.innerHeight - size - 24,
    size
  );
}

export const FloatingVoiceOrb: React.FC<FloatingVoiceOrbProps> = ({
  isOnVoiceSection,
  isVoiceSessionActive,
  onActivateVoiceAssistant,
}) => {
  const [orbSize, setOrbSize] = useState<number>(() => getOrbSize());
  const [position, setPosition] = useState<OrbPosition>(() => {
    try {
      const saved = localStorage.getItem(ORB_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          return clampPosition(parsed.x, parsed.y, getOrbSize());
        }
      }
    } catch {
      // ignore storage errors
    }
    return getDefaultPosition();
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const dragStartPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartOrbRef = useRef<OrbPosition>(position);
  const currentPosRef = useRef<OrbPosition>(position);
  const maxDragDistanceRef = useRef<number>(0);
  const isPointerDownRef = useRef<boolean>(false);

  useEffect(() => {
    currentPosRef.current = position;
  }, [position]);

  const savePosition = useCallback((pos: OrbPosition) => {
    try {
      localStorage.setItem(ORB_STORAGE_KEY, JSON.stringify(pos));
    } catch {
      // ignore storage errors
    }
  }, []);

  // Keep button inside visible viewport boundaries on window resize
  useEffect(() => {
    const handleResize = () => {
      const newSize = getOrbSize();
      setOrbSize(newSize);
      setPosition((prev) => {
        const clamped = clampPosition(prev.x, prev.y, newSize);
        savePosition(clamped);
        return clamped;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [savePosition]);

  // Unified drag move handler
  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isPointerDownRef.current) return;
      const dx = clientX - dragStartPointerRef.current.x;
      const dy = clientY - dragStartPointerRef.current.y;
      const dist = Math.hypot(dx, dy);

      if (dist > maxDragDistanceRef.current) {
        maxDragDistanceRef.current = dist;
      }

      if (maxDragDistanceRef.current >= 6) {
        setIsDragging(true);
      }

      const size = getOrbSize();
      const nextPos = clampPosition(
        dragStartOrbRef.current.x + dx,
        dragStartOrbRef.current.y + dy,
        size
      );
      currentPosRef.current = nextPos;
      setPosition(nextPos);
    },
    []
  );

  // Unified drag end handler
  const handleEnd = useCallback(() => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    const wasDragged = maxDragDistanceRef.current >= 6;
    setIsDragging(false);

    if (wasDragged) {
      savePosition(currentPosRef.current);
    } else {
      onActivateVoiceAssistant();
    }
  }, [onActivateVoiceAssistant, savePosition]);

  // Attach global mouse / touch listeners while pointer is down
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isPointerDownRef.current) return;
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      if (!isPointerDownRef.current) return;
      handleEnd();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPointerDownRef.current || e.touches.length === 0) return;
      if (maxDragDistanceRef.current >= 6) {
        e.preventDefault();
      }
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const onTouchEnd = () => {
      if (!isPointerDownRef.current) return;
      handleEnd();
    };

    window.addEventListener('mousemove', onMouseMove, { passive: false });
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [handleMove, handleEnd]);

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return; // left click only
    isPointerDownRef.current = true;
    maxDragDistanceRef.current = 0;
    dragStartPointerRef.current = { x: e.clientX, y: e.clientY };
    dragStartOrbRef.current = currentPosRef.current;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    isPointerDownRef.current = true;
    maxDragDistanceRef.current = 0;
    dragStartPointerRef.current = { x: touch.clientX, y: touch.clientY };
    dragStartOrbRef.current = currentPosRef.current;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivateVoiceAssistant();
    }
  };

  // Determine whether tooltip should appear on the left or right of the orb
  const showTooltipOnLeft =
    typeof window !== 'undefined' ? position.x > window.innerWidth / 2 : true;

  const isVisualActive = isVoiceSessionActive || isOnVoiceSection;

  return (
    <div
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        width: `${orbSize}px`,
        height: `${orbSize}px`,
      }}
      className="fixed top-0 left-0 z-50 select-none touch-none"
    >
      {/* Hover Tooltip: "Talk to AI Assistant" */}
      {isHovered && !isDragging && (
        <div
          role="tooltip"
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0F172A] text-white border border-cyan-400/50 shadow-[0_4px_20px_rgba(6,182,212,0.35)] transition-opacity duration-150 ${
            showTooltipOnLeft ? 'right-full mr-3' : 'left-full ml-3'
          }`}
        >
          Talk to AI Assistant
        </div>
      )}

      {/* Concentric Sound-Wave Rings when Voice Assistant is Active */}
      {isVisualActive && (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-cyan-400/70 orb-ring-active"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full border border-indigo-400/60 orb-ring-active-delayed"
          />
        </>
      )}

      {/* Subtle Ambient Breathing Halo */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -inset-1.5 rounded-full bg-gradient-to-tr from-cyan-400/35 via-sky-500/25 to-indigo-500/35 blur-md ${
          isDragging ? 'opacity-100 scale-110' : 'orb-breathe'
        }`}
      />

      {/* Main Draggable Circular AI Orb Button */}
      <button
        type="button"
        aria-label="Talk to AI Assistant"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        className={`relative w-full h-full rounded-full flex items-center justify-center bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 text-white border border-white/30 transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
          isDragging
            ? 'scale-110 brightness-115 cursor-grabbing shadow-[0_0_32px_rgba(6,182,212,0.9)]'
            : isHovered
            ? 'scale-105 cursor-grab shadow-[0_0_26px_rgba(6,182,212,0.75)]'
            : 'scale-100 cursor-grab shadow-[0_0_20px_rgba(6,182,212,0.5)]'
        }`}
      >
        {/* Inner Glossy Core Highlight */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-1 rounded-full bg-gradient-to-b from-white/25 to-transparent"
        />

        {/* Sound-Wave / AI Voice Icon */}
        <div className="relative z-10 flex items-center justify-center gap-[3px] h-6">
          <span
            className={`w-[3px] rounded-full bg-white transition-all duration-150 ${
              isVisualActive || isHovered ? 'h-3.5 orb-wave-1' : 'h-2.5'
            }`}
          />
          <span
            className={`w-[3px] rounded-full bg-white transition-all duration-150 ${
              isVisualActive || isHovered ? 'h-5 orb-wave-2' : 'h-4'
            }`}
          />
          <span
            className={`w-[3px] rounded-full bg-white transition-all duration-150 ${
              isVisualActive || isHovered ? 'h-6 orb-wave-3' : 'h-5'
            }`}
          />
          <span
            className={`w-[3px] rounded-full bg-white transition-all duration-150 ${
              isVisualActive || isHovered ? 'h-5 orb-wave-4' : 'h-4'
            }`}
          />
          <span
            className={`w-[3px] rounded-full bg-white transition-all duration-150 ${
              isVisualActive || isHovered ? 'h-3.5 orb-wave-1' : 'h-2.5'
            }`}
          />
        </div>
      </button>
    </div>
  );
};

export default FloatingVoiceOrb;
