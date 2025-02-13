import { SARGENT_LIBRARY_IN_VENICE } from './images.ts';

const canvas2 = document.getElementById('canvasColor') as HTMLCanvasElement;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const context2 = canvas2.getContext('2d')!;
const canvas2Width = 476;
const canvas2Height = 600;
const img = new Image(canvas2Width, canvas2Height);
img.src = SARGENT_LIBRARY_IN_VENICE;
const canvas3 = document.getElementById('canvasGrayscale') as HTMLCanvasElement;

const offscreen = canvas3.transferControlToOffscreen();
const worker = new Worker(new URL('./perceptGrayWorker.ts', import.meta.url), {
  type: 'module',
});

img.addEventListener('load', () => {
  context2.drawImage(img, 0, 0);
  const { data, width, height } = context2.getImageData(
    0,
    0,
    canvas2Width,
    canvas2Height,
  );
  worker.postMessage({ img: data, width, height, canvas: offscreen }, [
    offscreen,
  ]);
});
