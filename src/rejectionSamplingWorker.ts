self.onmessage = (
  event: MessageEvent<{
    densities: Float64Array;
    numSamples: number;
    width: number;
    height: number;
  }>,
) => {
  const { densities, numSamples, width, height } = event.data;
  const samples = new Float64Array(numSamples * 2);

  console.log('Rejection Sampling Sample Points');

  const maxDensity = densities.reduce((m, cur) => Math.max(m, cur), 0);
  /** Scale the comparison since the range of the random numbers is [0,1) */
  const scale = maxDensity < 1 ? 1 : maxDensity + 0.001;

  /**
   * Initialize Sample Points
   * - find through rejection sampling
   */
  for (let i = 0; i < numSamples; ++i) {
    const x = (samples[i * 2] = Math.floor(Math.random() * width));
    const y = (samples[1 + i * 2] = Math.floor(Math.random() * height));
    const u = Math.random();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const comp = densities[x + y * width]! / scale;
    if (u < comp) {
      /* Accepted */
    } else {
      --i;
    }
  }

  postMessage(samples);

  close();
};
