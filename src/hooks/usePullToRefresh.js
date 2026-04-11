import { useRef, useState, useEffect } from 'react';

const THRESHOLD = 70; // px of pull before release triggers refresh

export function usePullToRefresh(onRefresh) {
  const startY = useRef(0);
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (el.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e) => {
      if (!startY.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && el.scrollTop === 0) {
        setPulling(true);
        setPullDistance(Math.min(dy, THRESHOLD + 20));
        if (dy > 10) e.preventDefault(); // prevent native scroll
      }
    };

    const onTouchEnd = () => {
      if (pulling && pullDistance >= THRESHOLD) {
        onRefresh();
      }
      setPulling(false);
      setPullDistance(0);
      startY.current = 0;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [pulling, pullDistance, onRefresh]);

  return { containerRef, pulling, pullDistance, progress: Math.min(pullDistance / THRESHOLD, 1) };
}