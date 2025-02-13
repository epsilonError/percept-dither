import {
  inPerceptual,
  registerColorSpaces,
  sRGBgrayscale,
} from './perceptualSpace.ts';

self.onmessage = (
  event: MessageEvent<{
    img: ImageData['data'];
    width: number;
    height: number;
    canvas: OffscreenCanvas;
  }>,
) => {
  const canvas = event.data.canvas;
  const contextWorker = canvas.getContext('2d');

  const img = event.data.img;
  const { bitmap } = makeGray(img, event.data.width, event.data.height);
  bitmap
    .then((bitmap) => {
      contextWorker?.drawImage(bitmap, 0, 0);
      bitmap.close();
    })
    .catch((e: unknown) => {
      console.error(e);
    });
};

function makeGray(imgArray: Uint8ClampedArray, width: number, height: number) {
  registerColorSpaces();
  const imgPerceptGray = new Float64Array(width * height);
  for (let i = 0; i < imgArray.length; i += 4) {
    const r = imgArray[i] ?? NaN,
      g = imgArray[i + 1] ?? NaN,
      b = imgArray[1 + 2] ?? NaN,
      inPercept = inPerceptual(r / 255, g / 255, b / 255);

    imgPerceptGray[Math.trunc(i / 4)] = inPercept.coords[0] ?? NaN;

    const gray = sRGBgrayscale(inPercept, null, null);
    imgArray.set(gray, i);
  }
  return {
    bitmap: createImageBitmap(new ImageData(imgArray, width, height)),
    imgPerceptGray,
    width,
    height,
  };
}
