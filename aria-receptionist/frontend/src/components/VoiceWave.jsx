import { useEffect, useRef, useState } from 'react';

export default function VoiceWave({ active, color = '#6366f1', bars = 24, height = 40 }) {
  const [barHeights, setBarHeights] = useState(Array(bars).fill(4));
  const rafRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // Animate down to rest
      setBarHeights(prev => prev.map(() => 4));
      return;
    }

    startTimeRef.current = Date.now();

    const animate = () => {
      const t = (Date.now() - startTimeRef.current) / 1000;
      setBarHeights(
        Array.from({ length: bars }, (_, i) => {
          const wave1 = Math.sin(t * 3.5 + i * 0.5) * 0.5 + 0.5;
          const wave2 = Math.sin(t * 5.2 + i * 0.8 + 1) * 0.3 + 0.3;
          const wave3 = Math.sin(t * 2.1 + i * 1.2 + 2) * 0.2 + 0.2;
          const combined = (wave1 + wave2 + wave3) / 1.4;
          return Math.max(4, combined * (height - 4) + 4);
        })
      );
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active, bars, height]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        height: height,
      }}
    >
      {barHeights.map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: h,
            borderRadius: 3,
            background: color,
            transition: active ? 'height 0.06s ease' : 'height 0.5s ease',
            opacity: active ? 0.6 + (Math.sin(i * 0.5) * 0.2 + 0.2) : 0.25,
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}
