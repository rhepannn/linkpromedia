"use client";

import { useEffect, useState } from "react";

interface Props {
  targetId: string;
}

export default function ReadingProgress({ targetId }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    let ticking = false;

    function update() {
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const totalScrollable = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      const pct = totalScrollable > 0 ? Math.min(100, Math.max(0, (scrolled / totalScrollable) * 100)) : 0;
      setProgress(pct);
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetId]);

  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-[60] bg-transparent" aria-hidden="true">
      <div
        className="h-full bg-primary-600 transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
