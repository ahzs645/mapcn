"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Wind } from "lucide-react";

import { cn } from "@/lib/utils";

type WindData = {
  date: string;
  width: number;
  height: number;
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
  image: HTMLImageElement;
};

type ProgramInfo = {
  program: WebGLProgram;
  [key: string]: number | WebGLUniformLocation | WebGLProgram | null;
};

const WIND_FILES: Record<number, string> = {
  0: "2016112000",
  6: "2016112006",
  12: "2016112012",
  18: "2016112018",
  24: "2016112100",
  30: "2016112106",
  36: "2016112112",
  42: "2016112118",
  48: "2016112200",
};

const DRAW_VERT = `
precision mediump float;

attribute float a_index;

uniform sampler2D u_particles;
uniform float u_particles_res;

varying vec2 v_particle_pos;

void main() {
  vec4 color = texture2D(u_particles, vec2(
    fract(a_index / u_particles_res),
    floor(a_index / u_particles_res) / u_particles_res));

  v_particle_pos = vec2(
    color.r / 255.0 + color.b,
    color.g / 255.0 + color.a);

  gl_PointSize = 1.0;
  gl_Position = vec4(2.0 * v_particle_pos.x - 1.0, 1.0 - 2.0 * v_particle_pos.y, 0, 1);
}
`;

const DRAW_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_wind;
uniform vec2 u_wind_min;
uniform vec2 u_wind_max;
uniform sampler2D u_color_ramp;

varying vec2 v_particle_pos;

void main() {
  vec2 velocity = mix(u_wind_min, u_wind_max, texture2D(u_wind, v_particle_pos).rg);
  float speed_t = length(velocity) / length(u_wind_max);

  vec2 ramp_pos = vec2(
    fract(16.0 * speed_t),
    floor(16.0 * speed_t) / 16.0);

  gl_FragColor = texture2D(u_color_ramp, ramp_pos);
}
`;

const QUAD_VERT = `
precision mediump float;

attribute vec2 a_pos;

varying vec2 v_tex_pos;

void main() {
  v_tex_pos = a_pos;
  gl_Position = vec4(1.0 - 2.0 * a_pos, 0, 1);
}
`;

const SCREEN_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_screen;
uniform float u_opacity;

varying vec2 v_tex_pos;

void main() {
  vec4 color = texture2D(u_screen, 1.0 - v_tex_pos);
  gl_FragColor = floor(color * (255.0 * u_opacity)) / 255.0;
}
`;

const UPDATE_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_particles;
uniform sampler2D u_wind;
uniform vec2 u_wind_res;
uniform vec2 u_wind_min;
uniform vec2 u_wind_max;
uniform float u_rand_seed;
uniform float u_speed_factor;
uniform float u_drop_rate;
uniform float u_drop_rate_bump;

varying vec2 v_tex_pos;

const vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);
float rand(const vec2 co) {
  float t = dot(rand_constants.xy, co);
  return fract(sin(t) * (rand_constants.z + t));
}

vec2 lookup_wind(const vec2 uv) {
  vec2 px = 1.0 / u_wind_res;
  vec2 vc = (floor(uv * u_wind_res)) * px;
  vec2 f = fract(uv * u_wind_res);
  vec2 tl = texture2D(u_wind, vc).rg;
  vec2 tr = texture2D(u_wind, vc + vec2(px.x, 0)).rg;
  vec2 bl = texture2D(u_wind, vc + vec2(0, px.y)).rg;
  vec2 br = texture2D(u_wind, vc + px).rg;
  return mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);
}

void main() {
  vec4 color = texture2D(u_particles, v_tex_pos);
  vec2 pos = vec2(
    color.r / 255.0 + color.b,
    color.g / 255.0 + color.a);

  vec2 velocity = mix(u_wind_min, u_wind_max, lookup_wind(pos));
  float speed_t = length(velocity) / length(u_wind_max);
  float distortion = cos(radians(pos.y * 180.0 - 90.0));
  vec2 offset = vec2(velocity.x / distortion, -velocity.y) * 0.0001 * u_speed_factor;

  pos = fract(1.0 + pos + offset);

  vec2 seed = (pos + v_tex_pos) * u_rand_seed;
  float drop_rate = u_drop_rate + speed_t * u_drop_rate_bump;
  float drop = step(1.0 - drop_rate, rand(seed));
  vec2 random_pos = vec2(rand(seed + vec2(1.3)), rand(seed + vec2(2.1)));
  pos = mix(pos, random_pos, drop);

  gl_FragColor = vec4(fract(pos * 255.0), floor(pos * 255.0) / 255.0);
}
`;

function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create WebGL shader.");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "Shader compile failed.";
    gl.deleteShader(shader);
    throw new Error(log);
  }

  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
) {
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create WebGL program.");

  gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "Program link failed.");
  }

  const info: ProgramInfo = { program };

  const attributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < attributes; i++) {
    const attribute = gl.getActiveAttrib(program, i);
    if (attribute) info[attribute.name] = gl.getAttribLocation(program, attribute.name);
  }

  const uniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < uniforms; i++) {
    const uniform = gl.getActiveUniform(program, i);
    if (uniform) info[uniform.name] = gl.getUniformLocation(program, uniform.name);
  }

  return info;
}

function createTexture(
  gl: WebGLRenderingContext,
  filter: number,
  data: Uint8Array | HTMLImageElement,
  width?: number,
  height?: number,
) {
  const texture = gl.createTexture();
  if (!texture) throw new Error("Unable to create WebGL texture.");

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);

  if (data instanceof Uint8Array) {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width ?? 1,
      height ?? 1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      data,
    );
  } else {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      data,
    );
  }

  gl.bindTexture(gl.TEXTURE_2D, null);
  return texture;
}

function bindTexture(
  gl: WebGLRenderingContext,
  texture: WebGLTexture | null,
  unit: number,
) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
}

function createBuffer(gl: WebGLRenderingContext, data: Float32Array) {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("Unable to create WebGL buffer.");

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
}

function bindAttribute(
  gl: WebGLRenderingContext,
  buffer: WebGLBuffer,
  attribute: number | WebGLUniformLocation | WebGLProgram | null,
  numComponents: number,
) {
  if (typeof attribute !== "number") return;

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(attribute);
  gl.vertexAttribPointer(attribute, numComponents, gl.FLOAT, false, 0, 0);
}

function bindFramebuffer(
  gl: WebGLRenderingContext,
  framebuffer: WebGLFramebuffer | null,
  texture?: WebGLTexture | null,
) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  if (texture) {
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );
  }
}

function colorRamp(colors: Record<number, string>) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create color ramp.");

  canvas.width = 256;
  canvas.height = 1;

  const gradient = context.createLinearGradient(0, 0, 256, 0);
  for (const stop of Object.keys(colors)) {
    gradient.addColorStop(Number(stop), colors[Number(stop)]);
  }

  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 1);

  return new Uint8Array(context.getImageData(0, 0, 256, 1).data);
}

class WindGL {
  fadeOpacity = 0.996;
  speedFactor = 0.25;
  dropRate = 0.003;
  dropRateBump = 0.01;
  windData: WindData | null = null;

  private backgroundTexture: WebGLTexture | null = null;
  private colorRampTexture: WebGLTexture | null = null;
  private drawProgram: ProgramInfo;
  private framebuffer: WebGLFramebuffer | null;
  private particleIndexBuffer: WebGLBuffer | null = null;
  private particleStateResolution = 0;
  private particleStateTexture0: WebGLTexture | null = null;
  private particleStateTexture1: WebGLTexture | null = null;
  private quadBuffer: WebGLBuffer;
  private screenProgram: ProgramInfo;
  private screenTexture: WebGLTexture | null = null;
  private updateProgram: ProgramInfo;
  private windTexture: WebGLTexture | null = null;
  private _numParticles = 0;

  constructor(private gl: WebGLRenderingContext) {
    this.drawProgram = createProgram(gl, DRAW_VERT, DRAW_FRAG);
    this.screenProgram = createProgram(gl, QUAD_VERT, SCREEN_FRAG);
    this.updateProgram = createProgram(gl, QUAD_VERT, UPDATE_FRAG);
    this.quadBuffer = createBuffer(
      gl,
      new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
    );
    this.framebuffer = gl.createFramebuffer();
    this.setColorRamp({
      0: "#3288bd",
      0.1: "#66c2a5",
      0.2: "#abdda4",
      0.3: "#e6f598",
      0.4: "#fee08b",
      0.5: "#fdae61",
      0.6: "#f46d43",
      1: "#d53e4f",
    });
    this.resize();
  }

  set numParticles(numParticles: number) {
    const particleRes = Math.ceil(Math.sqrt(numParticles));
    this.particleStateResolution = particleRes;
    this._numParticles = particleRes * particleRes;

    const particleState = new Uint8Array(this._numParticles * 4);
    for (let i = 0; i < particleState.length; i++) {
      particleState[i] = Math.floor(Math.random() * 256);
    }

    this.particleStateTexture0 = createTexture(
      this.gl,
      this.gl.NEAREST,
      particleState,
      particleRes,
      particleRes,
    );
    this.particleStateTexture1 = createTexture(
      this.gl,
      this.gl.NEAREST,
      particleState,
      particleRes,
      particleRes,
    );

    const particleIndices = new Float32Array(this._numParticles);
    for (let i = 0; i < this._numParticles; i++) particleIndices[i] = i;
    this.particleIndexBuffer = createBuffer(this.gl, particleIndices);
  }

  resize() {
    const { gl } = this;
    const emptyPixels = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);
    this.backgroundTexture = createTexture(
      gl,
      gl.NEAREST,
      emptyPixels,
      gl.canvas.width,
      gl.canvas.height,
    );
    this.screenTexture = createTexture(
      gl,
      gl.NEAREST,
      emptyPixels,
      gl.canvas.width,
      gl.canvas.height,
    );
  }

  setColorRamp(colors: Record<number, string>) {
    this.colorRampTexture = createTexture(
      this.gl,
      this.gl.LINEAR,
      colorRamp(colors),
      16,
      16,
    );
  }

  setWind(windData: WindData) {
    this.windData = windData;
    this.windTexture = createTexture(this.gl, this.gl.LINEAR, windData.image);
  }

  draw() {
    if (
      !this.windData ||
      !this.windTexture ||
      !this.particleStateTexture0 ||
      !this.particleStateTexture1 ||
      !this.particleIndexBuffer ||
      !this.backgroundTexture ||
      !this.screenTexture
    ) {
      return;
    }

    const { gl } = this;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);

    bindTexture(gl, this.windTexture, 0);
    bindTexture(gl, this.particleStateTexture0, 1);

    this.drawScreen();
    this.updateParticles();
  }

  private drawScreen() {
    const { gl } = this;
    bindFramebuffer(gl, this.framebuffer, this.screenTexture);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    this.drawTexture(this.backgroundTexture, this.fadeOpacity);
    this.drawParticles();

    bindFramebuffer(gl, null);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.drawTexture(this.screenTexture, 1);
    gl.disable(gl.BLEND);

    const texture = this.backgroundTexture;
    this.backgroundTexture = this.screenTexture;
    this.screenTexture = texture;
  }

  private drawTexture(texture: WebGLTexture | null, opacity: number) {
    const { gl } = this;
    const program = this.screenProgram;
    gl.useProgram(program.program);

    bindAttribute(gl, this.quadBuffer, program.a_pos, 2);
    bindTexture(gl, texture, 2);
    gl.uniform1i(program.u_screen as WebGLUniformLocation, 2);
    gl.uniform1f(program.u_opacity as WebGLUniformLocation, opacity);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private drawParticles() {
    if (!this.windData || !this.particleIndexBuffer) return;

    const { gl } = this;
    const program = this.drawProgram;
    gl.useProgram(program.program);

    bindAttribute(gl, this.particleIndexBuffer, program.a_index, 1);
    bindTexture(gl, this.colorRampTexture, 2);

    gl.uniform1i(program.u_wind as WebGLUniformLocation, 0);
    gl.uniform1i(program.u_particles as WebGLUniformLocation, 1);
    gl.uniform1i(program.u_color_ramp as WebGLUniformLocation, 2);
    gl.uniform1f(
      program.u_particles_res as WebGLUniformLocation,
      this.particleStateResolution,
    );
    gl.uniform2f(
      program.u_wind_min as WebGLUniformLocation,
      this.windData.uMin,
      this.windData.vMin,
    );
    gl.uniform2f(
      program.u_wind_max as WebGLUniformLocation,
      this.windData.uMax,
      this.windData.vMax,
    );
    gl.drawArrays(gl.POINTS, 0, this._numParticles);
  }

  private updateParticles() {
    if (!this.windData) return;

    const { gl } = this;
    bindFramebuffer(gl, this.framebuffer, this.particleStateTexture1);
    gl.viewport(0, 0, this.particleStateResolution, this.particleStateResolution);

    const program = this.updateProgram;
    gl.useProgram(program.program);

    bindAttribute(gl, this.quadBuffer, program.a_pos, 2);

    gl.uniform1i(program.u_wind as WebGLUniformLocation, 0);
    gl.uniform1i(program.u_particles as WebGLUniformLocation, 1);
    gl.uniform1f(program.u_rand_seed as WebGLUniformLocation, Math.random());
    gl.uniform2f(
      program.u_wind_res as WebGLUniformLocation,
      this.windData.width,
      this.windData.height,
    );
    gl.uniform2f(
      program.u_wind_min as WebGLUniformLocation,
      this.windData.uMin,
      this.windData.vMin,
    );
    gl.uniform2f(
      program.u_wind_max as WebGLUniformLocation,
      this.windData.uMax,
      this.windData.vMax,
    );
    gl.uniform1f(program.u_speed_factor as WebGLUniformLocation, this.speedFactor);
    gl.uniform1f(program.u_drop_rate as WebGLUniformLocation, this.dropRate);
    gl.uniform1f(
      program.u_drop_rate_bump as WebGLUniformLocation,
      this.dropRateBump,
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const texture = this.particleStateTexture0;
    this.particleStateTexture0 = this.particleStateTexture1;
    this.particleStateTexture1 = texture;
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${src}`));
    image.src = src;
  });
}

async function loadWindData(hour: number) {
  const file = WIND_FILES[hour];
  const basePath = `/examples/webgl-wind/wind/${file}`;
  const [meta, image] = await Promise.all([
    fetch(`${basePath}.json`).then((response) => {
      if (!response.ok) throw new Error(response.statusText);
      return response.json() as Promise<Omit<WindData, "image">>;
    }),
    loadImage(`${basePath}.png`),
  ]);

  return { ...meta, image };
}

function parseWindDate(date: string) {
  const normalizedDate = date.replace(/T(\d{2}):(\d{2})Z$/, "T$1:$2:00Z");
  return new Date(normalizedDate);
}

export function WebglWindCard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const windRef = useRef<WindGL | null>(null);
  const animationRef = useRef<number>(0);
  const [hour, setHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [timestamp, setTimestamp] = useState("2016-11-20 00:00 UTC");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: false });
    if (!gl) return;

    let wind: WindGL;
    try {
      wind = new WindGL(gl);
      wind.numParticles = 65536;
      windRef.current = wind;
    } catch (reason) {
      queueMicrotask(() => {
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to initialize WebGL wind renderer.",
        );
      });
      return;
    }

    function resize() {
      if (!canvas || !windRef.current) return;

      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      windRef.current.resize();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    return () => {
      cancelAnimationFrame(animationRef.current);
      observer.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      windRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadWindData(hour)
      .then((data) => {
        if (cancelled) return;
        windRef.current?.setWind(data);
        setTimestamp(
          new Intl.DateTimeFormat("en", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            timeZoneName: "short",
            timeZone: "UTC",
          }).format(parseWindDate(data.date)),
        );
      })
      .catch((reason) => {
        if (cancelled) return;
        setError(
          reason instanceof Error ? reason.message : "Unable to load wind data.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [hour]);

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animationRef.current);
      return;
    }

    function frame() {
      windRef.current?.draw();
      animationRef.current = requestAnimationFrame(frame);
    }

    animationRef.current = requestAnimationFrame(frame);

    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying]);

  return (
    <div className="relative h-full min-h-[18rem] w-full overflow-hidden bg-zinc-950 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:10%_20%]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {error ? (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-sm rounded-md border border-white/10 bg-black/70 p-4 text-sm text-white shadow-xl backdrop-blur">
            <p className="font-medium">WebGL wind renderer unavailable</p>
            <p className="mt-2 text-xs text-white/70">{error}</p>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
        <div className="min-w-0 rounded-md border border-white/10 bg-black/50 px-3 py-2 backdrop-blur">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Wind className="size-3.5" />
            WebGL Wind
          </div>
          <p className="mt-1 text-[11px] text-white/70">{timestamp}</p>
        </div>
      </div>

      <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-md border border-white/10 bg-black/55 px-2 py-2 text-white backdrop-blur">
        <button
          type="button"
          onClick={() => setIsPlaying((value) => !value)}
          className="flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-white/10"
          aria-label={isPlaying ? "Pause wind animation" : "Play wind animation"}
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <input
          aria-label="Forecast hour"
          className={cn("h-2 min-w-0 flex-1 accent-white")}
          max={48}
          min={0}
          onChange={(event) => setHour(Number(event.target.value))}
          step={6}
          type="range"
          value={hour}
        />
        <span className="w-10 text-right text-[11px] tabular-nums text-white/70">
          +{hour}h
        </span>
      </div>
    </div>
  );
}
