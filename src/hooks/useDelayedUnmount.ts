import { useState, useEffect } from 'react';

export function useDelayedUnmount(open: boolean, delay = 200) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf1: number;
    let raf2: number;
    if (open) {
      setMounted(true);
      // Double-rAF: first frame mounts with data-state="closed",
      // second frame fires after the browser has painted, starting the transition.
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), delay);
      return () => clearTimeout(t);
    }
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [open, delay]);

  return { mounted, visible };
}
