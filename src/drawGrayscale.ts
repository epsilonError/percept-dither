import { SARGENT_LIBRARY_IN_VENICE } from './images.ts';

const canvas2 = document.getElementById('canvasColor') as HTMLCanvasElement;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const context2 = canvas2.getContext('2d')!;
const canvas2Width = 476;
const canvas2Height = 600;
const img = new Image(canvas2Width, canvas2Height);
img.src = SARGENT_LIBRARY_IN_VENICE;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const canvas3Context = (
  document.getElementById('canvasGrayscale') as HTMLCanvasElement
).getContext('bitmaprenderer')!;

const offscreen = new OffscreenCanvas(canvas2Width, canvas2Height);
const worker = new Worker(
  new URL('./perceptGrayImgWorker.ts', import.meta.url),
  {
    type: 'module',
  },
);

img.addEventListener('load', () => {
  context2.drawImage(img, 0, 0);
  const { data, width, height } = context2.getImageData(
    0,
    0,
    canvas2Width,
    canvas2Height,
  );
  worker.onmessage = (ev: MessageEvent<ImageBitmap>) => {
    canvas3Context.transferFromImageBitmap(ev.data);
  };
  worker.postMessage({ img: data, width, height, canvas: offscreen }, [
    offscreen,
  ]);
});
