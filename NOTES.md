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
- Hilbert curves can be implemented as a closed loop. Looping could be a good way to make sure errors are better diffused. (Implementing a closed loop gilbert curve would be especially useful)
- Set of all 2D Hilbert Curves gives the search space of Hilbert Curves: [Paper](https://www.researchgate.net/publication/318662438_Hilbert_curves_in_two_dimensions). Mapping a loop requires picking from these. And possibly tiling/overlapping these could improve on the 2d gilbert curve.

# Implementation Ideas

## 2 tracks for color data manipulation

1. Minimal Data Structures
2. In-place Image Edit

### In-place Image Edit

Current demo focuses on the 2nd especially for the image mutation as animation it provides.  
Each step is reified as mutated sRGB values. 256 grays + 16 palette colors are preset as Image data and used.

### Minimal Data Structure

This is less amenable to animation, each animation step would require expanding out to the expected [R G B Alpha] for each pixel. This approach could use less space if processed in the background. The needed data would be:

- Uint8Clamped Array for each pixel (all 8-bits used for grayscale, and only a subset 1 or 3 bits needed to index black/white or the 16 color palette)
- Float64 Array for grayscale OkLrab position (256 values, matching grayscale index)
- Float64 Array for 16 color palette OkLrab position (16×3 = length of 48)
- Float64 Array for the error diffusion kernel/queue
  - The color queue would have 3 times the length, since the error in each dimension needs to be maintained
  - The kernel is only a sliding window if the error is actually applied (i.e. need Float64 Array for each pixel or an appropriately sized error diffusion buffer)

There is another interesting aspect in the errors from Float64 Perceptual Space to Uint8 sRGB space that may be worth tracking. But it also can be included in the existing error diffusion process.

### Current Plan

Since the non-riemersma dither requires application and error buffer I'll probably stick with the Canvas ImageData and ImageBitmap framework I've started as a proof of concept. But still use all the minimal data structures (using the Uint8Clamped Array will bypass reading from the image data and calling Color.js extraneously). If more browsers support Atomics on TypedArrays that could be useful as a HTML Canvas implementation (for now I'm not going to bother with making sure I can host a secure SharedArray capable demo of this).

## Animated Drawing

The animated drawing substrate only needs to know the position, palette reference, and palette reference index to correctly draw the right color on the image. This would show the change for each pixel as the curve is travelled along.

Aside: An interesting future visualization could possibly show the error diffusion across kernels as well. And the linear error queue for Riemersma could be shown on the side. It could also be nice to see the dropped error amounts as an overlay. But I don't know how to visualize the overlay: alpha? color? svg mask? Visualizing the error diffusion is also capped at the color gamut so it can only hint at, not literally show, the diffused result.

The next question is if the animation steps should be synchronized or asynchronous. It could be cool to watch multiple dithers in lock step. That will probably be what I focus on implementing first. Then 1 coordinating traversal generator can spit out to all the aligned color selectors. Though telling the Image Data manipulators multiple number of steps is probably best for throughput. I'm not sure though.

## Selection Criteria

Selecting the new color to draw relies on specific criteron. Currently the demo uses how far along the curve is travelled.

- For Color, splits the 16 colors evenly across the total number of pixels to traverse.
- For Grayscale, splits the 256 achromatics evenly across the total number of pixels to traverse.
- For Black & White, alternates between black and white as it traverses the curve.
- Future Selections will use the same ordered references, but will choose based on diffusion algorithm.

So selection can be based on position along curve, current color, future colors, previous colors, and the build-up of diffused errors.

Aside: I guess future colors isn't generally used, diffusion pushes out into the future not the other way around. But what/how could diffusion based on future colors mean/work?

## Traversal Pattern

Possible Traversal Patterns:

- Line Order
- Serpentine (line order but turns upon reaching edges)
- 2D Curve
- Random
- Other

## Diffusion Troubles

A mix of cases at the intersection of Traversal Patterns and Selection Criteria

- Wrap on edges?
- Drop on edges?
- How to Orient during traversal?
