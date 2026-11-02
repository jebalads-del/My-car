import { describe, expect, it } from "vitest";
import { decodeUploadedImage } from "../server/market-router";

const asBase64 = (bytes: number[]) => Buffer.from(bytes).toString("base64");

describe("market image upload validation", () => {
  it("accepts a PNG only when its declared MIME matches the actual signature", () => {
    const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00];
    const result = decodeUploadedImage(asBase64(pngHeader), "image/png");

    expect(result.detected.mime).toBe("image/png");
    expect(result.bytes).toHaveLength(pngHeader.length);
  });

  it("rejects MIME spoofing and arbitrary base64 payloads", () => {
    const pngHeader = asBase64([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(() => decodeUploadedImage(pngHeader, "image/jpeg")).toThrow();
    expect(() => decodeUploadedImage(asBase64([1, 2, 3, 4]), "image/png")).toThrow();
  });
});
