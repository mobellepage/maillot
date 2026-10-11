// Catalogue photos in MAILLOT's studio look, made on a Mac (macOS 14+):
// Apple's Vision subject lifting cuts the shirt out, then it is placed in a
// square like members' photos (src/features/vault/addshirt/studio.ts: 78 %
// box, a little above centre). Nothing leaves the machine.
//
//   swift scripts/catalog-studio.swift <photo> <out.png> [size=1000]
//
// A .png keeps the background transparent (the app draws the tile and the
// shadow, public/catalog/ — convert to .webp with scripts/catalog-webp.py);
// a .jpg gets the dark studio background with spotlight and shadow.
import AppKit
import Vision

let args = CommandLine.arguments
guard args.count >= 3 else {
  FileHandle.standardError.write("usage: catalog-studio <photo> <out.jpg> [size]\n".data(using: .utf8)!)
  exit(2)
}
let size = args.count > 3 ? Int(args[3]) ?? 1000 : 1000

func fail(_ msg: String) -> Never {
  FileHandle.standardError.write((msg + "\n").data(using: .utf8)!)
  exit(1)
}

guard let src = NSImage(contentsOfFile: args[1]),
      let photo = src.cgImage(forProposedRect: nil, context: nil, hints: nil) else { fail("cannot read \(args[1])") }

// 1. Cut out the shirt: of everything Vision lifts (shirt, hanger, rack…)
//    keep the largest object, and fill holes enclosed by it — white prints on
//    a white background otherwise come out as holes.
let handler = VNImageRequestHandler(cgImage: photo)
let request = VNGenerateForegroundInstanceMaskRequest()
do { try handler.perform([request]) } catch { fail("subject lifting failed: \(error)") }
guard let result = request.results?.first, !result.allInstances.isEmpty else { fail("no subject found in \(args[1])") }

func maskValues(_ instances: IndexSet) -> [Float] {
  guard let buf = try? result.generateScaledMaskForImage(forInstances: instances, from: handler) else { fail("masking failed") }
  CVPixelBufferLockBaseAddress(buf, .readOnly)
  defer { CVPixelBufferUnlockBaseAddress(buf, .readOnly) }
  let w = CVPixelBufferGetWidth(buf), h = CVPixelBufferGetHeight(buf), row = CVPixelBufferGetBytesPerRow(buf)
  let base = CVPixelBufferGetBaseAddress(buf)!
  var out = [Float](repeating: 0, count: w * h)
  for y in 0..<h {
    let line = (base + y * row).assumingMemoryBound(to: Float32.self)
    for x in 0..<w { out[y * w + x] = line[x] }
  }
  return out
}

let W = photo.width, H = photo.height
var best: [Float] = [], bestArea: Float = -1
for i in result.allInstances {
  let m = maskValues(IndexSet(integer: i))
  let area = m.reduce(0, +)
  if area > bestArea { bestArea = area; best = m }
}
guard best.count == W * H else { fail("mask size mismatch") }

// Background = what is reachable from the border through low mask values.
var outside = [Bool](repeating: false, count: W * H)
var stack: [Int] = []
for x in 0..<W { stack.append(x); stack.append((H - 1) * W + x) }
for y in 0..<H { stack.append(y * W); stack.append(y * W + W - 1) }
while let p = stack.popLast() {
  if outside[p] || best[p] >= 0.5 { continue }
  outside[p] = true
  let x = p % W, y = p / W
  if x > 0 { stack.append(p - 1) }
  if x < W - 1 { stack.append(p + 1) }
  if y > 0 { stack.append(p - W) }
  if y < H - 1 { stack.append(p + W) }
}
let alpha = (0..<(W * H)).map { outside[$0] ? best[$0] : 1 }

// Photo × alpha → premultiplied RGBA, cropped to the shirt.
var px = [UInt8](repeating: 0, count: W * H * 4)
let rgb = CGColorSpace(name: CGColorSpace.sRGB)!
px.withUnsafeMutableBytes { raw in
  let c = CGContext(data: raw.baseAddress, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W * 4, space: rgb,
                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  c.draw(photo, in: CGRect(x: 0, y: 0, width: W, height: H))
}
var minX = W, minY = H, maxX = 0, maxY = 0
for y in 0..<H {
  for x in 0..<W {
    // CGContext rows run top-down in memory; the Vision mask does too.
    let a = alpha[y * W + x], o = (y * W + x) * 4
    for k in 0..<4 { px[o + k] = UInt8(Float(px[o + k]) * a) }
    if a > 0.05 { minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y) }
  }
}
guard maxX > minX, maxY > minY else { fail("empty cut-out") }
let full: CGImage = px.withUnsafeMutableBytes { raw in
  CGContext(data: raw.baseAddress, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W * 4, space: rgb,
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!.makeImage()!
}
guard let cutout = full.cropping(to: CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)) else { fail("crop failed") }

// 2. Compose the studio square (CoreGraphics: origin bottom-left).
let s = CGFloat(size)
let space = CGColorSpace(name: CGColorSpace.sRGB)!
guard let ctx = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0, space: space,
                          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { fail("no canvas") }
let transparent = args[2].lowercased().hasSuffix(".png")
if !transparent {
  ctx.setFillColor(CGColor(srgbRed: 10 / 255, green: 12 / 255, blue: 11 / 255, alpha: 1))
  ctx.fill(CGRect(x: 0, y: 0, width: s, height: s))
  let spot = CGGradient(colorsSpace: space, colors: [CGColor(gray: 1, alpha: 0.09), CGColor(gray: 1, alpha: 0)] as CFArray, locations: [0, 1])!
  let centre = CGPoint(x: s / 2, y: s - s * 0.44)
  ctx.drawRadialGradient(spot, startCenter: centre, startRadius: 0, endCenter: centre, endRadius: s * 0.62, options: [])
}

let w = CGFloat(cutout.width), h = CGFloat(cutout.height)
let scale = min(s * 0.78 / w, s * 0.78 / h)
let dw = w * scale, dh = h * scale
let x = (s - dw) / 2
let yTop = (s - dh) / 2 - s * 0.02
ctx.saveGState()
if !transparent { ctx.setShadow(offset: CGSize(width: 0, height: -28 * s / 1200), blur: 60 * s / 1200, color: CGColor(gray: 0, alpha: 0.6)) }
ctx.interpolationQuality = .high
ctx.draw(cutout, in: CGRect(x: x, y: s - yTop - dh, width: dw, height: dh))
ctx.restoreGState()

// 3. PNG or JPEG out.
guard let out = ctx.makeImage() else { fail("cannot finish image") }
let rep = NSBitmapImageRep(cgImage: out)
guard let encoded = transparent ? rep.representation(using: .png, properties: [:]) : rep.representation(using: .jpeg, properties: [.compressionFactor: 0.84]) else { fail("cannot encode") }
do { try encoded.write(to: URL(fileURLWithPath: args[2])) } catch { fail("cannot write \(args[2]): \(error)") }
print("\(args[2])  \(size)x\(size)  \(encoded.count / 1024) KB")
