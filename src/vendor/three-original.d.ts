/* 原版 three.js chunk（NAS /music/static/assets/c3104c139fdb7188d58221877ccba7d3-onVqr-Rc.js）
 * 的最小类型声明。导出名与原 bundle 的 minified 别名一一对应。
 * 与 three-original.js 同名，TS 解析 "./three-original.js" 导入时自动应用本文件。 */

export declare class Scene {
  add(object: unknown): void;
  remove(object: unknown): void;
}
export declare class OrthographicCamera {
  constructor(
    left: number,
    right: number,
    top: number,
    bottom: number,
    near: number,
    far: number,
  );
  position: { z: number; set(x: number, y: number, z: number): void };
}
export declare class WebGLRenderer {
  constructor(parameters?: Record<string, unknown>);
  setPixelRatio(value: number): void;
  setSize(width: number, height: number, updateStyle?: boolean): void;
  domElement: HTMLCanvasElement;
  render(scene: unknown, camera: unknown): void;
  dispose(): void;
  forceContextLoss(): void;
}
export declare class PlaneGeometry {
  constructor(width?: number, height?: number);
  dispose(): void;
}
export declare class ShaderMaterial {
  constructor(parameters?: Record<string, unknown>);
  uniforms: Record<string, { value: unknown }>;
  dispose(): void;
}
export declare class Mesh {
  constructor(geometry?: unknown, material?: unknown);
}
export declare class Vector2 {
  constructor(x?: number, y?: number);
  x: number;
  y: number;
  set(x: number, y: number): this;
  copy(v: Vector2): this;
  lerp(v: Vector2, alpha: number): this;
}
export declare class Clock {
  getElapsedTime(): number;
}
export declare class Color {
  constructor(color?: string | number);
  copy(color: Color): this;
}
export declare const NormalBlending: number;
