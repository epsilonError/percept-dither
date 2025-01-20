# Constraints

Decker:

- 8-bit sRGB color space
- Computational use of 256 achromatic sRGB grays (including white and black)
- 16 color displayable palette
- Minimum screen size: 8 × 8
- Default screen size: 512 × 342
- Max screen size: 4096 × 4096 ([source](https://itch.io/post/8397942))

Color.js:

- JzCzHz handles HD colors but (jzczhz \* 0 0) doesn't map exactly back to an achromatic sRGB
- Oklab does roundtrip back to an achromatic sRGB for (oklab \* 0 0)
- OkLrAB uses a Lightness reference which better partitions the achromatic colors along the black to D65 White axis that sRGB shares
- deltaEOK2 doubles the non-lightness axes for a better deltaE comparison
- Using OkLrAB with a specialized deltaEOK method will reduce the number mathematical roundtrips
- I'd personally prefer to use JzCzHz, but Oklab with Lr and a deltaE with A×2 & B×2 is pretty similarly shaped and has better matching calculations for the achromatics

Riemersma Dither:

- Linear error diffusion along a single dimension
- Each color dimension dithered needs its own queue of quantized errors
- The error queue needs a specified length and a decaying weight for each element
- Follow a space-filling curve (Hilbert curve recommended)
- Hilbert curves generally fill square 2D spaces with sides that are a power of 2
- [gilbert curve](https://github.com/jakubcerveny/gilbert) generalizes Hilbert curves to arbitrarily sized 2D rectangles
- It's probably possible to just cut a Hilbert curve to size, but that's a lot of extraneous positions (always O(n²) for the larger side)
