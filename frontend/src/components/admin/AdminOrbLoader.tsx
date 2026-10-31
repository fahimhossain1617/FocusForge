"use client";

import React, { useEffect, useRef } from "react";

/**
 * Focentia Admin Panel — Animated 3D Morphing Orb Loader with Smooth Color Cycling
 *
 * Renders a real-time 60fps 3D volumetric/glossy morphing 4-lobed orb using a
 * per-pixel WebGL fragment shader (with automatic 2D Canvas fallback) synchronized
 * to Focentia's UI design color palette.
 *
 * Strictly scoped to the Admin Panel. Displays ONLY the 3D morphing orb and
 * "Loading..." underneath — no progress bars, lines, or extra subtitles.
 */

interface RGB {
  r: number;
  g: number;
  b: number;
}

// Curated palette harmonized with Focentia's UI design tokens (globals.css)
const FOCENTIA_ORB_PALETTE: {
  primary: RGB;
  rimBright: RGB;
  secondary: RGB;
}[] = [
  // 1. Focentia Electric Blue (#3B82F6 -> #93C5FD)
  {
    primary: { r: 0.231, g: 0.510, b: 0.965 },
    rimBright: { r: 0.650, g: 0.840, b: 1.000 },
    secondary: { r: 0.024, g: 0.714, b: 0.831 },
  },
  // 2. Focentia Sky Cyan (#06B6D4 -> #A5F3FC)
  {
    primary: { r: 0.024, g: 0.714, b: 0.831 },
    rimBright: { r: 0.647, g: 0.953, b: 0.988 },
    secondary: { r: 0.063, g: 0.725, b: 0.506 },
  },
  // 3. Focentia Emerald Teal (#10B981 -> #6EE7B7)
  {
    primary: { r: 0.063, g: 0.725, b: 0.506 },
    rimBright: { r: 0.525, g: 0.937, b: 0.780 },
    secondary: { r: 0.357, g: 0.553, b: 0.937 },
  },
  // 4. Focentia Indigo Violet (#6366F1 -> #C4B5FD)
  {
    primary: { r: 0.388, g: 0.400, b: 0.945 },
    rimBright: { r: 0.780, g: 0.745, b: 1.000 },
    secondary: { r: 0.231, g: 0.510, b: 0.965 },
  },
  // 5. Focentia Royal Sapphire (#2563EB -> #7DD3FC)
  {
    primary: { r: 0.145, g: 0.388, b: 0.922 },
    rimBright: { r: 0.580, g: 0.855, b: 0.992 },
    secondary: { r: 0.388, g: 0.400, b: 0.945 },
  },
];

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function samplePalette(timeSec: number) {
  // Balanced color cycle: ~2.6 seconds per transition (~13s full cycle)
  const cyclePos = (timeSec * 0.38) % FOCENTIA_ORB_PALETTE.length;
  const idxA = Math.floor(cyclePos);
  const idxB = (idxA + 1) % FOCENTIA_ORB_PALETTE.length;
  const frac = smoothstep(cyclePos - idxA);

  const stopA = FOCENTIA_ORB_PALETTE[idxA];
  const stopB = FOCENTIA_ORB_PALETTE[idxB];

  return {
    primary: lerpRGB(stopA.primary, stopB.primary, frac),
    rimBright: lerpRGB(stopA.rimBright, stopB.rimBright, frac),
    secondary: lerpRGB(stopA.secondary, stopB.secondary, frac),
  };
}

const VERTEX_SHADER_SRC = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SRC = `
precision mediump float;
varying vec2 v_uv;

uniform float u_time;
uniform vec3 u_colorPrimary;
uniform vec3 u_colorRim;
uniform vec3 u_colorSecondary;

// Computes the organic 4-lobed morphing blob radius at angle theta and time t
float blobRadius(float theta, float t) {
  float rot = t * 0.54;
  float a = theta - rot;

  // Primary 4-lobe organic cushion contour (like the reference image)
  float lobe4 = 0.142 * cos(4.0 * a + 0.55 * sin(t * 0.92));
  // Secondary harmonic undulations for natural liquid morphing
  float lobe3 = 0.036 * sin(3.0 * (theta + t * 0.38) + 0.4 * cos(t * 0.75));
  float lobe2 = 0.032 * cos(2.0 * (theta - t * 0.68) - 0.35 * sin(t * 1.1));
  float lobe5 = 0.014 * sin(5.0 * a - t * 0.85);

  return 0.54 * (1.0 + lobe4 + lobe3 + lobe2 + lobe5);
}

// 3D height field of the glossy morphing orb for analytical surface normals
float orbHeight(vec2 p, float t) {
  float r = length(p);
  float theta = atan(p.y, p.x);
  float R = blobRadius(theta, t);
  float rho = r / max(R, 0.0001);

  if (rho >= 1.0) {
    return 0.0;
  }

  // Smooth 3D dome profile with steep glossy rim curvature
  float zSphere = sqrt(max(0.0, 1.0 - rho * rho));

  // Internal 3D sculptural lobe ridges that rotate and undulate with the orb
  float rot = t * 0.54;
  float ridgeWave = cos(4.0 * (theta - rot) + 0.55 * sin(t * 0.92) - rho * 1.35);
  float innerSwirl = sin(2.0 * (theta + rot * 0.7) + rho * 2.6 - t * 0.8);
  float sculpt = (0.11 * ridgeWave + 0.045 * innerSwirl) * pow(rho, 1.6) * (1.0 - rho);

  return zSphere * 0.88 + sculpt;
}

void main() {
  vec2 p = v_uv;
  float r = length(p);
  float theta = atan(p.y, p.x);
  float R = blobRadius(theta, u_time);
  float rho = r / max(R, 0.0001);

  // Spatial color blend across opposite lobes so colors flow smoothly as it rotates
  float colorMixFactor = 0.5 + 0.5 * sin(theta - u_time * 0.62 + 0.5 * cos(2.0 * theta + u_time * 0.4));
  vec3 activeColor = mix(u_colorPrimary, u_colorSecondary, colorMixFactor * 0.65);
  vec3 activeRim = mix(u_colorRim, u_colorSecondary * 0.55 + vec3(0.45), colorMixFactor * 0.45);

  // Directional rim modulation (stronger on upper-right & lower-left like reference)
  float diagAxis = dot(normalize(p + vec2(0.0001)), normalize(vec2(0.72, 0.69)));
  float diagHighlight = 0.55 + 0.45 * pow(abs(diagAxis), 1.4);

  // Diagonal anamorphic flare streaks tangent to the upper-right and lower-left rims
  vec2 rotP = vec2(p.x * 0.7071 + p.y * 0.7071, -p.x * 0.7071 + p.y * 0.7071);
  float streakUpper = exp(-pow((rotP.x - 0.37) * 18.0, 2.0)) * exp(-pow(rotP.y * 2.6, 2.0));
  float streakLower = exp(-pow((rotP.x + 0.37) * 18.0, 2.0)) * exp(-pow(rotP.y * 2.6, 2.0));
  float anamorphicStreak = (streakUpper + streakLower) * (0.65 + 0.35 * sin(u_time * 1.4));

  // Outside the orb: render soft atmospheric halo + anamorphic rim streak
  if (rho >= 1.0) {
    float distOut = (rho - 1.0) * R;
    float outerGlow = exp(-distOut * 11.5) * 0.62 * diagHighlight;
    float wideAura = exp(-distOut * 4.2) * 0.18;
    float rimEdge = exp(-distOut * 38.0) * 0.85 * diagHighlight;

    vec3 glowCol = activeColor * (outerGlow + wideAura) + activeRim * (rimEdge + anamorphicStreak * 0.55);
    float alpha = clamp(outerGlow + wideAura + rimEdge + anamorphicStreak * 0.45, 0.0, 1.0);
    gl_FragColor = vec4(glowCol, alpha);
    return;
  }

  // Inside the orb: compute analytical 3D normal via finite differences
  float eps = 0.004;
  float hC = orbHeight(p, u_time);
  float hX = orbHeight(p + vec2(eps, 0.0), u_time);
  float hY = orbHeight(p + vec2(0.0, eps), u_time);
  vec3 normal = normalize(vec3(-(hX - hC) / eps, -(hY - hC) / eps, 1.0));

  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  float NdotV = clamp(dot(normal, viewDir), 0.0, 1.0);

  // 1. Deep glossy obsidian 3D core with subtle subsurface color depth
  vec3 coreBase = vec3(0.018, 0.026, 0.048) + activeColor * 0.045 * pow(rho, 1.5);

  // 2. Studio curved softbox reflections on the morphing lobes (matching reference image)
  // Main upper-right curved liquid-glass reflection
  vec3 lightDir1 = normalize(vec3(0.46, 0.42, 0.78));
  vec3 halfVec1 = normalize(lightDir1 + viewDir);
  float specBroad1 = pow(clamp(dot(normal, halfVec1), 0.0, 1.0), 26.0);
  float specSharp1 = pow(clamp(dot(normal, halfVec1), 0.0, 1.0), 140.0);

  // Secondary lower-left curved crescent reflection
  vec3 lightDir2 = normalize(vec3(-0.38, -0.52, 0.76));
  vec3 halfVec2 = normalize(lightDir2 + viewDir);
  float specBroad2 = pow(clamp(dot(normal, halfVec2), 0.0, 1.0), 22.0);
  float specSharp2 = pow(clamp(dot(normal, halfVec2), 0.0, 1.0), 110.0);

  // Subtle side grazing reflection on left lobe
  vec3 lightDir3 = normalize(vec3(-0.68, 0.15, 0.71));
  vec3 halfVec3 = normalize(lightDir3 + viewDir);
  float specSide = pow(clamp(dot(normal, halfVec3), 0.0, 1.0), 32.0);

  // Mask internal reflections so they sit naturally inside the curved lobes (rho ~ 0.35..0.88)
  float lobeReflectMask = smoothstep(0.18, 0.58, rho) * smoothstep(0.96, 0.72, rho);
  vec3 innerReflections =
    (activeColor * 0.42 + vec3(0.22)) * (specBroad1 * 0.65 + specBroad2 * 0.52 + specSide * 0.25) * lobeReflectMask +
    (activeRim * 0.85 + vec3(0.35)) * (specSharp1 * 0.55 + specSharp2 * 0.35) * lobeReflectMask;

  // 3. Intense luminous 3D Fresnel Rim Light hugging the morphing contour
  float fresnel = pow(1.0 - NdotV, 3.2);
  float edgeBand = smoothstep(0.68, 0.995, rho);
  float razorRim = smoothstep(0.91, 1.0, rho);

  vec3 rimLighting =
    activeColor * (fresnel * 1.15 + edgeBand * 0.85) * (0.55 + 0.65 * diagHighlight) +
    activeRim * razorRim * (0.85 + 0.65 * diagHighlight) +
    activeRim * anamorphicStreak * 0.5;

  // 4. Inner dark depth vignette for maximum 3D contrast
  float innerDepth = smoothstep(0.0, 0.75, rho);
  vec3 finalColor = coreBase * (0.55 + 0.45 * innerDepth) + innerReflections + rimLighting;

  // Anti-aliased outer boundary transition
  float edgeAA = smoothstep(1.0, 0.975, rho);
  float finalAlpha = mix(0.85, 1.0, edgeAA);

  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

export function AdminOrbLoader({
  size = 140,
}: {
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrameId = 0;
    // Clamped to 1 DPR: eliminates 75% GPU fill-rate load on high-DPI/mobile screens while preserving pristine bloom
    const pixelSize = Math.round(size);
    canvas.width = pixelSize;
    canvas.height = pixelSize;

    // Try WebGL for true per-pixel 3D normal-mapped glossy rendering
    const gl =
      (canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: false }) as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl", { alpha: true, antialias: true, premultipliedAlpha: false }) as WebGLRenderingContext | null);

    const compileShader = (ctx: WebGLRenderingContext, type: number, source: string) => {
      const shader = ctx.createShader(type);
      if (!shader) return null;
      ctx.shaderSource(shader, source);
      ctx.compileShader(shader);
      if (!ctx.getShaderParameter(shader, ctx.COMPILE_STATUS)) {
        ctx.deleteShader(shader);
        return null;
      }
      return shader;
    };

    let glProgram: WebGLProgram | null = null;
    let glBuffer: WebGLBuffer | null = null;
    let uTimeLoc: WebGLUniformLocation | null = null;
    let uColorPrimaryLoc: WebGLUniformLocation | null = null;
    let uColorRimLoc: WebGLUniformLocation | null = null;
    let uColorSecondaryLoc: WebGLUniformLocation | null = null;

    if (gl) {
      const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
      if (vs && fs) {
        const prog = gl.createProgram();
        if (prog) {
          gl.attachShader(prog, vs);
          gl.attachShader(prog, fs);
          gl.linkProgram(prog);
          if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            glProgram = prog;
            gl.useProgram(prog);

            glBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
            gl.bufferData(
              gl.ARRAY_BUFFER,
              new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
              gl.STATIC_DRAW
            );

            const posLoc = gl.getAttribLocation(prog, "a_position");
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

            uTimeLoc = gl.getUniformLocation(prog, "u_time");
            uColorPrimaryLoc = gl.getUniformLocation(prog, "u_colorPrimary");
            uColorRimLoc = gl.getUniformLocation(prog, "u_colorRim");
            uColorSecondaryLoc = gl.getUniformLocation(prog, "u_colorSecondary");

            gl.viewport(0, 0, pixelSize, pixelSize);
          }
        }
      }
    }

    // 2D Canvas fallback renderer if WebGL is unavailable
    const render2DFallback = (ctx2d: CanvasRenderingContext2D, t: number, colors: ReturnType<typeof samplePalette>) => {
      ctx2d.clearRect(0, 0, pixelSize, pixelSize);
      const cx = pixelSize / 2;
      const cy = pixelSize / 2;
      const baseR = pixelSize * 0.27;
      const steps = 96;

      const rCol = Math.round(colors.primary.r * 255);
      const gCol = Math.round(colors.primary.g * 255);
      const bCol = Math.round(colors.primary.b * 255);

      const rimR = Math.round(colors.rimBright.r * 255);
      const rimG = Math.round(colors.rimBright.g * 255);
      const rimB = Math.round(colors.rimBright.b * 255);

      ctx2d.save();
      ctx2d.beginPath();
      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        const rot = t * 0.54;
        const a = theta - rot;
        const mod =
          1 +
          0.142 * Math.cos(4 * a + 0.55 * Math.sin(t * 0.92)) +
          0.036 * Math.sin(3 * (theta + t * 0.38)) +
          0.032 * Math.cos(2 * (theta - t * 0.68));
        const rad = baseR * mod;
        const x = cx + Math.cos(theta) * rad;
        const y = cy + Math.sin(theta) * rad;
        if (i === 0) ctx2d.moveTo(x, y);
        else ctx2d.lineTo(x, y);
      }
      ctx2d.closePath();

      ctx2d.shadowColor = `rgba(${rCol}, ${gCol}, ${bCol}, 0.75)`;
      ctx2d.shadowBlur = pixelSize * 0.11;

      const grad = ctx2d.createRadialGradient(
        cx - baseR * 0.15,
        cy - baseR * 0.15,
        baseR * 0.1,
        cx,
        cy,
        baseR * 1.18
      );
      grad.addColorStop(0, "#050811");
      grad.addColorStop(0.68, "#070c18");
      grad.addColorStop(0.9, `rgba(${rCol}, ${gCol}, ${bCol}, 0.65)`);
      grad.addColorStop(1, `rgba(${rimR}, ${rimG}, ${rimB}, 0.95)`);

      ctx2d.fillStyle = grad;
      ctx2d.fill();

      ctx2d.lineWidth = Math.max(2, pixelSize * 0.012);
      ctx2d.strokeStyle = `rgba(${rimR}, ${rimG}, ${rimB}, 0.85)`;
      ctx2d.stroke();
      ctx2d.restore();
    };

    const ctx2d = !glProgram ? canvas.getContext("2d") : null;

    const renderFrame = () => {
      // Pause drawing loop when browser tab is inactive to preserve phone resources
      if (typeof document !== "undefined" && document.hidden) {
        animationFrameId = window.requestAnimationFrame(renderFrame);
        return;
      }

      // Synchronized wall-clock time so transitions across route mounts never reset phase
      const nowSec = (Date.now() % 3600000) * 0.001;
      const colors = samplePalette(nowSec);

      if (gl && glProgram) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(glProgram);

        gl.uniform1f(uTimeLoc, nowSec);
        gl.uniform3f(uColorPrimaryLoc, colors.primary.r, colors.primary.g, colors.primary.b);
        gl.uniform3f(uColorRimLoc, colors.rimBright.r, colors.rimBright.g, colors.rimBright.b);
        gl.uniform3f(uColorSecondaryLoc, colors.secondary.r, colors.secondary.g, colors.secondary.b);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      } else if (ctx2d) {
        render2DFallback(ctx2d, nowSec, colors);
      }

      // Smoothly tint the "Loading..." label in subtle harmony with the active orb color
      if (textRef.current) {
        const tr = Math.round(145 + colors.primary.r * 75);
        const tg = Math.round(158 + colors.primary.g * 75);
        const tb = Math.round(175 + colors.primary.b * 75);
        textRef.current.style.color = `rgb(${tr}, ${tg}, ${tb})`;
      }

      animationFrameId = window.requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
      if (gl && glProgram) {
        if (glBuffer) gl.deleteBuffer(glBuffer);
        gl.deleteProgram(glProgram);
      }
    };
  }, [size]);

  return (
    <div
      className="flex flex-col items-center justify-center select-none"
      role="status"
      aria-live="polite"
      aria-label="Loading..."
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: `${size}px`, height: `${size}px` }}
          className="block pointer-events-none"
        />
      </div>
      <p
        ref={textRef}
        className="mt-1 text-[17px] sm:text-[18px] font-semibold tracking-[0.02em] transition-none"
        style={{ color: "rgb(168, 185, 210)" }}
      >
        Loading...
      </p>
    </div>
  );
}
export default AdminOrbLoader;

