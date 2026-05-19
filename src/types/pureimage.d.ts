declare module "pureimage" {
  export interface Bitmap {
    width: number;
    height: number;
    getContext(type: "2d"): Context;
  }

  export interface Context {
    fillStyle: string;
    font: string;
    fillRect(x: number, y: number, w: number, h: number): void;
    fillText(text: string, x: number, y: number): void;
  }

  export function make(width: number, height: number): Bitmap;
  export function encodePNGToStream(
    bitmap: Bitmap
  ): NodeJS.ReadableStream;
}
