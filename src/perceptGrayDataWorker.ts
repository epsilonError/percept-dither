import { inPerceptual, registerColorSpaces } from './perceptualSpace.ts';

self.onmessage = (
  event: MessageEvent<{
    img: ImageData['data'];
    width: number;
    height: number;
  }>,
) => {
  const { img, width, height } = event.data;

  const { imgPerceptGray } = makeGray(img, width, height);
  postMessage(imgPerceptGray);
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
  }
  return {
    imgPerceptGray,
    width,
    height,
  };
}
