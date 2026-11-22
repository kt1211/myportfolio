"use client";

import { useEffect, useRef } from "react";

type Particle = {
  lane: number;
  point: number;
  phase: number;
  speed: number;
  radius: number;
};

/** A lightweight, pointer-reactive generative field for the expertise section. */
export function InteractiveCanvasAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;

    const particles: Particle[] = [];
    const laneCount = 4;
    const pointsPerLane = 17;
    for (let lane = 0; lane < laneCount; lane += 1) {
      for (let point = 0; point < pointsPerLane; point += 1) {
        particles.push({
          lane,
          point,
          phase: lane * 1.71 + point * 0.37,
          speed: 0.018 + lane * 0.002,
          radius: point % 4 === 0 ? 1.7 : 1.05,
        });
      }
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = { x: -1000, y: -1000, active: false };
    const size = { width: 0, height: 0, ratio: 1 };
    let frame = 0;
    let elapsed = 0;
    let lastTime = 0;
    let visible = false;
    let pageVisible = !document.hidden;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      size.width = rect.width;
      size.height = rect.height;
      size.ratio = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.round(rect.width * size.ratio);
      canvas.height = Math.round(rect.height * size.ratio);
      context.setTransform(size.ratio, 0, 0, size.ratio, 0, 0);
      if (reducedMotion.matches) draw(elapsed);
    };

    const draw = (time: number) => {
      const { width, height } = size;
      if (!width || !height) return;
      context.clearRect(0, 0, width, height);

      const amplitude = Math.min(height * 0.23, 26);
      const laneSpacing = height * 0.135;
      const centers = Array.from({ length: laneCount }, (_, lane) =>
        height * 0.5 + (lane - (laneCount - 1) / 2) * laneSpacing,
      );
      const positions = particles.map((particle) => {
        const offset = ((time * particle.speed + particle.lane * 0.19) % 1 + 1) % 1;
        const baseX = (particle.point / pointsPerLane + offset) % 1;
        const x = width * (0.025 + baseX * 0.95);
        const wave = Math.sin(baseX * Math.PI * 2.1 + particle.phase + time * 0.62);
        const secondWave = Math.cos(baseX * Math.PI * 3.2 - particle.phase + time * 0.34);
        let y = centers[particle.lane] + wave * amplitude * 0.52 + secondWave * amplitude * 0.2;

        if (pointer.active) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const influence = Math.max(0, 1 - distance / 112);
          y += (dy / (distance + 1)) * influence * 13;
        }
        return { x, y, particle };
      });

      context.lineWidth = 0.8;
      for (let lane = 0; lane < laneCount; lane += 1) {
        const line = positions.filter((position) => position.particle.lane === lane)
          .sort((a, b) => a.x - b.x);
        for (let index = 0; index < line.length - 1; index += 1) {
          const from = line[index];
          const to = line[index + 1];
          if (to.x - from.x > width * 0.12) continue;
          const hue = lane === 1 || lane === 2 ? "234, 0, 90" : "183, 157, 255";
          context.strokeStyle = `rgba(${hue}, ${lane === 1 || lane === 2 ? 0.23 : 0.15})`;
          context.beginPath();
          context.moveTo(from.x, from.y);
          context.quadraticCurveTo((from.x + to.x) / 2, (from.y + to.y) / 2 - 2, to.x, to.y);
          context.stroke();
        }
      }

      for (const { x, y, particle } of positions) {
        const color = particle.lane === 1 || particle.lane === 2 ? "234, 0, 90" : "224, 218, 255";
        context.fillStyle = `rgba(${color}, ${particle.point % 4 === 0 ? 0.72 : 0.42})`;
        context.beginPath();
        context.arc(x, y, particle.radius, 0, Math.PI * 2);
        context.fill();
      }

      if (pointer.active) {
        const glow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 90);
        glow.addColorStop(0, "rgba(234, 0, 90, 0.09)");
        glow.addColorStop(1, "rgba(234, 0, 90, 0)");
        context.fillStyle = glow;
        context.fillRect(pointer.x - 90, pointer.y - 90, 180, 180);
      }
    };

    const animate = (timestamp: number) => {
      if (!visible || !pageVisible || reducedMotion.matches) {
        frame = 0;
        return;
      }
      if (lastTime) elapsed += Math.min(timestamp - lastTime, 40) / 1000;
      lastTime = timestamp;
      draw(elapsed);
      frame = window.requestAnimationFrame(animate);
    };

    const start = () => {
      if (!frame && visible && pageVisible && !reducedMotion.matches) {
        lastTime = 0;
        frame = window.requestAnimationFrame(animate);
      }
    };
    const stop = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
    };
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
      if (reducedMotion.matches) draw(elapsed);
    };
    const onPointerLeave = () => {
      pointer.active = false;
      if (reducedMotion.matches) draw(elapsed);
    };
    const onVisibilityChange = () => {
      pageVisible = !document.hidden;
      if (pageVisible) start();
      else stop();
    };
    const onMotionPreferenceChange = () => {
      if (reducedMotion.matches) {
        stop();
        draw(elapsed);
      } else start();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    }, { threshold: 0.01 });
    const resizeObserver = new ResizeObserver(resize);

    resizeObserver.observe(canvas);
    observer.observe(canvas);
    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerleave", onPointerLeave, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", onMotionPreferenceChange);
    resize();

    return () => {
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener("change", onMotionPreferenceChange);
    };
  }, []);

  return (
    <div className="interactive-canvas-shell" role="img" aria-label="Interactive generative field with flowing pink and violet light particles">
      <canvas className="interactive-canvas" ref={canvasRef} />
      <span className="canvas-caption" aria-hidden="true">INTERACTIVE FIELD <i /> MOVE TO EXPLORE</span>
    </div>
  );
}
