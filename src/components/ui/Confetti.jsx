import { useEffect, useRef } from "react";

/**
 * Confetti — canvas burst animation on mount.
 * Auto-destroys after 3.5 seconds.
 * Only renders when `show` is true.
 */
export default function Confetti({ show }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLORS = [
      "#00C2FF",
      "#FFB800",
      "#00E676",
      "#FF4D6A",
      "#7B61FF",
      "#fff",
    ];
    const COUNT = 160;

    const pieces = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      tilt: Math.random() * 10 - 10,
      tiltAngle: 0,
      tiltSpeed: Math.random() * 0.07 + 0.05,
      speed: Math.random() * 3 + 2,
      opacity: 1,
    }));

    let frame = 0;
    const MAX = 200;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      pieces.forEach((p) => {
        p.tiltAngle += p.tiltSpeed;
        p.y += p.speed;
        p.tilt = Math.sin(p.tiltAngle) * 15;
        if (frame > MAX * 0.6) p.opacity = Math.max(0, p.opacity - 0.015);

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(
          p.x + p.tilt,
          p.y,
          p.r,
          p.r / 2,
          (p.tilt * Math.PI) / 180,
          0,
          2 * Math.PI,
        );
        ctx.fill();
        ctx.restore();
      });

      if (frame < MAX) rafRef.current = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [show]);

  if (!show) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[200] pointer-events-none"
    />
  );
}
