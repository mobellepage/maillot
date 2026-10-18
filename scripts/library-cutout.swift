// Library kit pictures, cut out on a Mac (macOS 14+) with Apple's Vision
// subject lifting: the largest object is kept (holes it encloses filled, so
// white prints stay), the edge is cleaned of the old background (no light
// halo on dark screens) and the picture is cropped to the shirt. Nothing
// leaves the machine.
//
//   swiftc -O scripts/library-cutout.swift -o /tmp/library-cutout
//   /tmp/library-cutout < jobs.tsv     (lines: source<TAB>out.png[<TAB>max width[<TAB>full]])
//
// "full" keeps the whole frame (transparent around the subject) instead of
// cropping to it — for portraits shown in a circle.
//
// Prints "ok <out>" or "skip <source> <reason>" per line; a .png keeps the
// transparency (scripts convert it to .webp).
import AppKit
import Vision

let rgb = CGColorSpace(name: CGColorSpace.sRGB)!

func cut(_ srcPath: String, _ outPath: String, _ maxWidth: Int, keepFrame: Bool = false) -> String? {
  guard let src = NSImage(contentsOfFile: srcPath),
        let photo = src.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return "unreadable" }
  let handler = VNImageRequestHandler(cgImage: photo)
  let request = VNGenerateForegroundInstanceMaskRequest()
  do { try handler.perform([request]) } catch { return "vision failed" }
  guard let result = request.results?.first, !result.allInstances.isEmpty else { return "no subject" }

  func maskValues(_ instances: IndexSet) -> [Float]? {
    guard let buf = try? result.generateScaledMaskForImage(forInstances: instances, from: handler) else { return nil }
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
    guard let m = maskValues(IndexSet(integer: i)) else { continue }
    let area = m.reduce(0, +)
    if area > bestArea { bestArea = area; best = m }
  }
  guard best.count == W * H else { return "mask size" }
  let coverage = bestArea / Float(W * H)
  if coverage < 0.08 { return "subject too small" }

  // Holes the shirt encloses (white prints on a white background) stay shirt.
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

  // Unpremultiplied pixels of the photo.
  var px = [UInt8](repeating: 0, count: W * H * 4)
  px.withUnsafeMutableBytes { raw in
    let c = CGContext(data: raw.baseAddress, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W * 4, space: rgb,
                      bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
    c.draw(photo, in: CGRect(x: 0, y: 0, width: W, height: H))
  }
  // The background colour, from the border where the mask is empty.
  var bg: (Float, Float, Float) = (0, 0, 0); var n: Float = 0
  for p in 0..<(W * H) where outside[p] && best[p] < 0.05 && (p % W < 3 || p % W > W - 4 || p / W < 3 || p / W > H - 4) {
    bg.0 += Float(px[p * 4]); bg.1 += Float(px[p * 4 + 1]); bg.2 += Float(px[p * 4 + 2]); n += 1
  }
  if n > 0 { bg = (bg.0 / n, bg.1 / n, bg.2 / n) } else { bg = (255, 255, 255) }

  var out = [UInt8](repeating: 0, count: W * H * 4)
  var minX = W, minY = H, maxX = 0, maxY = 0
  for p in 0..<(W * H) {
    // A slightly tighter, crisp edge: the outermost soft rim is the old background.
    var a = outside[p] ? best[p] : 1
    a = max(0, min(1, (a - 0.2) / 0.75))
    if a <= 0.004 { continue }
    let o = p * 4
    for k in 0..<3 {
      let c = Float(px[o + k]), b = k == 0 ? bg.0 : k == 1 ? bg.1 : bg.2
      // Take the background back out of edge pixels: c = a·fg + (1−a)·bg.
      let fg = a < 0.98 ? (c - (1 - a) * b) / a : c
      out[o + k] = UInt8(max(0, min(255, fg * a)))  // premultiplied
    }
    out[o + 3] = UInt8(a * 255)
    let x = p % W, y = p / W
    if a > 0.1 { minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y) }
  }
  guard maxX > minX, maxY > minY else { return "empty" }
  let full: CGImage = out.withUnsafeMutableBytes { raw in
    CGContext(data: raw.baseAddress, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W * 4, space: rgb,
              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!.makeImage()!
  }
  let pad = 2
  let crop = keepFrame ? CGRect(x: 0, y: 0, width: W, height: H) : CGRect(x: max(0, minX - pad), y: max(0, minY - pad), width: min(W, maxX + pad + 1) - max(0, minX - pad), height: min(H, maxY + pad + 1) - max(0, minY - pad))
  guard var img = full.cropping(to: crop) else { return "crop" }
  if img.width > maxWidth {
    let s = CGFloat(maxWidth) / CGFloat(img.width)
    let w = maxWidth, h = Int((CGFloat(img.height) * s).rounded())
    guard let c = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0, space: rgb, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return "scale" }
    c.interpolationQuality = .high
    c.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
    img = c.makeImage()!
  }
  guard let png = NSBitmapImageRep(cgImage: img).representation(using: .png, properties: [:]) else { return "encode" }
  do { try png.write(to: URL(fileURLWithPath: outPath)) } catch { return "write" }
  return nil
}

while let line = readLine() {
  let f = line.split(separator: "\t").map(String.init)
  guard f.count >= 2 else { continue }
  let maxWidth = f.count > 2 ? Int(f[2]) ?? 300 : 300
  autoreleasepool {
    if let why = cut(f[0], f[1], maxWidth, keepFrame: f.count > 3 && f[3] == "full") { print("skip \(f[0]) \(why)") } else { print("ok \(f[1])") }
  }
  fflush(stdout)
}
