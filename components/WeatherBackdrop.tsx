"use client";
import { useEffect, useRef } from "react";
import type { Condition } from "@/lib/types";

type Drawer = (t: number, dt: number) => void;

/**
 * Full-screen animated sky. Every weather condition has its own particle system:
 * rain streaks, thunder bolts, snow, heat shimmer, stars, drifting clouds and fog banks.
 */
export default function WeatherBackdrop({ condition }: { condition: Condition }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = performance.now();
    let draw: Drawer = () => {};

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const build = () => {
      const area = (w * h) / 1000;
      const scale = reduce ? 0.3 : 1;

      if (condition === "rain" || condition === "storm") {
        const storm = condition === "storm";
        const n = Math.floor(area * (storm ? 0.22 : 0.13) * scale);
        const drops = Array.from({ length: n }, () => ({
          x: rand(-100, w + 100),
          y: rand(0, h),
          l: rand(10, storm ? 34 : 24),
          v: rand(storm ? 900 : 600, storm ? 1500 : 980),
          a: rand(0.15, 0.55),
        }));
        const slant = storm ? 0.32 : 0.16;
        let flash = 0;
        let nextBolt = rand(1.5, 4);
        let bolt: { x: number; y: number }[] = [];
        const splashes: { x: number; y: number; r: number; a: number }[] = [];
        draw = (t, dt) => {
          ctx.lineWidth = 1.2;
          for (const d of drops) {
            d.y += d.v * dt;
            d.x -= d.v * dt * slant;
            if (d.y > h) {
              if (Math.random() < 0.05 && splashes.length < 40) splashes.push({ x: d.x, y: h - rand(0, 40), r: 1, a: 0.4 });
              d.y = -d.l;
              d.x = rand(-100, w + 200);
            }
            ctx.strokeStyle = `rgba(190,215,255,${d.a})`;
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x + d.l * slant, d.y - d.l);
            ctx.stroke();
          }
          for (let i = splashes.length - 1; i >= 0; i--) {
            const s = splashes[i];
            s.r += dt * 40;
            s.a -= dt * 1.2;
            if (s.a <= 0) {
              splashes.splice(i, 1);
              continue;
            }
            ctx.strokeStyle = `rgba(200,225,255,${s.a})`;
            ctx.beginPath();
            ctx.ellipse(s.x, s.y, s.r, s.r * 0.35, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          if (storm && !reduce) {
            nextBolt -= dt;
            if (nextBolt <= 0) {
              nextBolt = rand(2.5, 6.5);
              flash = 1;
              let x = rand(w * 0.15, w * 0.85);
              let y = 0;
              bolt = [{ x, y }];
              while (y < h * rand(0.45, 0.7)) {
                y += rand(18, 46);
                x += rand(-34, 34);
                bolt.push({ x, y });
              }
            }
            if (flash > 0) {
              ctx.fillStyle = `rgba(230,235,255,${flash * 0.35})`;
              ctx.fillRect(0, 0, w, h);
              if (bolt.length) {
                ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, flash * 1.4)})`;
                ctx.shadowColor = "#b7c8ff";
                ctx.shadowBlur = 24;
                ctx.lineWidth = 2.4;
                ctx.beginPath();
                bolt.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
                ctx.stroke();
                ctx.shadowBlur = 0;
              }
              flash -= dt * 2.4;
              if (flash <= 0) bolt = [];
            }
          }
          void t;
        };
      } else if (condition === "snow" || condition === "cold") {
        const heavy = condition === "snow";
        const n = Math.floor(area * (heavy ? 0.1 : 0.035) * scale);
        const flakes = Array.from({ length: n }, () => ({
          x: rand(0, w),
          y: rand(0, h),
          r: rand(1, heavy ? 4.2 : 3),
          v: rand(25, heavy ? 90 : 45),
          p: rand(0, Math.PI * 2),
          s: rand(0.5, 1.6),
        }));
        draw = (t, dt) => {
          for (const f of flakes) {
            f.y += f.v * dt;
            f.x += Math.sin(t / 1000 * f.s + f.p) * 18 * dt;
            if (f.y > h + 5) {
              f.y = -5;
              f.x = rand(0, w);
            }
            ctx.fillStyle = `rgba(255,255,255,${0.35 + f.r / 7})`;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            ctx.fill();
          }
          if (!heavy) {
            // icy sparkle
            for (let i = 0; i < 6; i++) {
              const sx = (Math.sin(t / 900 + i * 7.3) * 0.5 + 0.5) * w;
              const sy = (Math.cos(t / 1300 + i * 3.1) * 0.5 + 0.5) * h;
              const a = (Math.sin(t / 300 + i) + 1) / 2;
              ctx.strokeStyle = `rgba(200,235,255,${a * 0.7})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(sx - 6, sy);
              ctx.lineTo(sx + 6, sy);
              ctx.moveTo(sx, sy - 6);
              ctx.lineTo(sx, sy + 6);
              ctx.stroke();
            }
          }
        };
      } else if (condition === "heat") {
        const n = Math.floor(area * 0.03 * scale);
        const embers = Array.from({ length: n }, () => ({
          x: rand(0, w),
          y: rand(0, h),
          r: rand(1, 3),
          v: rand(15, 60),
          p: rand(0, 6),
        }));
        draw = (t, dt) => {
          // shimmering heat haze bands rising from the bottom
          for (let b = 0; b < 7; b++) {
            const y0 = h - ((t / 40 + b * (h / 7)) % h);
            ctx.beginPath();
            for (let x = 0; x <= w; x += 12) {
              const y = y0 + Math.sin(x / 90 + t / 500 + b) * 7;
              x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.strokeStyle = `rgba(255,220,160,${0.06 + (y0 / h) * 0.06})`;
            ctx.lineWidth = 12;
            ctx.stroke();
          }
          for (const e of embers) {
            e.y -= e.v * dt;
            e.x += Math.sin(t / 700 + e.p) * 10 * dt;
            if (e.y < -5) {
              e.y = h + 5;
              e.x = rand(0, w);
            }
            ctx.fillStyle = `rgba(255,${Math.floor(rand(150, 210))},90,${0.25 + e.r / 8})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
            ctx.fill();
          }
        };
      } else if (condition === "clear-night") {
        const n = Math.floor(area * 0.22 * scale);
        const stars = Array.from({ length: n }, () => ({
          x: rand(0, w),
          y: rand(0, h * 0.9),
          r: rand(0.4, 1.7),
          p: rand(0, 6.28),
          s: rand(0.6, 2.4),
        }));
        let shoot: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
        let nextShoot = rand(3, 7);
        draw = (t, dt) => {
          for (const s of stars) {
            const a = 0.35 + 0.65 * ((Math.sin(t / 1000 * s.s + s.p) + 1) / 2);
            ctx.fillStyle = `rgba(255,255,255,${a})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
          }
          nextShoot -= dt;
          if (nextShoot <= 0 && !reduce) {
            nextShoot = rand(5, 11);
            shoot = { x: rand(w * 0.2, w), y: rand(0, h * 0.3), vx: -rand(500, 800), vy: rand(220, 380), life: 1 };
          }
          if (shoot) {
            shoot.x += shoot.vx * dt;
            shoot.y += shoot.vy * dt;
            shoot.life -= dt * 1.4;
            const g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 0.12, shoot.y - shoot.vy * 0.12);
            g.addColorStop(0, `rgba(255,255,255,${Math.max(0, shoot.life)})`);
            g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.strokeStyle = g;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(shoot.x, shoot.y);
            ctx.lineTo(shoot.x - shoot.vx * 0.12, shoot.y - shoot.vy * 0.12);
            ctx.stroke();
            if (shoot.life <= 0) shoot = null;
          }
        };
      } else if (condition === "cloudy" || condition === "fog") {
        const fog = condition === "fog";
        const n = fog ? 9 : 10;
        const clouds = Array.from({ length: n }, (_, i) => ({
          x: rand(-200, w),
          y: fog ? rand(h * 0.3, h) : rand(0, h * 0.55),
          rx: fog ? rand(w * 0.35, w * 0.7) : rand(160, 340),
          ry: fog ? rand(60, 130) : rand(50, 110),
          v: rand(6, fog ? 22 : 16) * (i % 2 ? 1 : 0.6),
          a: fog ? rand(0.12, 0.26) : rand(0.1, 0.22),
        }));
        draw = (_t, dt) => {
          for (const c of clouds) {
            c.x += c.v * dt;
            if (c.x - c.rx > w) c.x = -c.rx;
            const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.rx);
            g.addColorStop(0, `rgba(255,255,255,${c.a})`);
            g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.scale(1, c.ry / c.rx);
            ctx.translate(-c.x, -c.y);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.rx, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        };
      } else {
        // clear-day: floating pollen / light motes
        const n = Math.floor(area * 0.02 * scale);
        const motes = Array.from({ length: n }, () => ({
          x: rand(0, w),
          y: rand(0, h),
          r: rand(1, 3.2),
          v: rand(5, 18),
          p: rand(0, 6.28),
        }));
        draw = (t, dt) => {
          for (const m of motes) {
            m.y -= m.v * dt;
            m.x += Math.sin(t / 1500 + m.p) * 12 * dt;
            if (m.y < -5) {
              m.y = h + 5;
              m.x = rand(0, w);
            }
            ctx.fillStyle = `rgba(255,248,210,${0.25 + (Math.sin(t / 700 + m.p) + 1) / 5})`;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
            ctx.fill();
          }
        };
      }
    };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      draw(now, dt);
      raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [condition]);

  return (
    <div className="sky" aria-hidden="true">
      <div className="sky-glow" />
      <div className="sky-orb" />
      <div className="sky-clouds" />
      <canvas ref={ref} className="sky-canvas" />
    </div>
  );
}
