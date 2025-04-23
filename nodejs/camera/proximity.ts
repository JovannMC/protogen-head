import { spawn } from "child_process";
import { EventEmitter } from "events";
import { Jimp } from "jimp";
import fs from "fs";

/**
 * Events emitted by the ProximityDetector
 */
export interface ProximityEvents {
  on(
    event: "proximity",
    listener: (isClose: boolean, motionPercentage: number) => void
  ): this;
  on(event: "error", listener: (error: Error) => void): this;
}

/**
 * Detects proximity (distance) using the camera by analyzing motion/pixel changes
 */
class ProximityDetector extends EventEmitter implements ProximityEvents {
  private isRunning = false;
  private processHandle: ReturnType<typeof spawn> | null = null;
  private sensitivityThreshold: number;
  private checkInterval: NodeJS.Timeout | null = null;
  private previousFrame: any = null; // Store Jimp object, not Buffer
  private frameWidth: number;
  private frameHeight: number;
  private pixelDiffThreshold: number = 30; // Adjust sensitivity for pixel difference

  /**
   * Initialize the proximity detector
   * @param sensitivityThreshold Threshold for detecting proximity (0-100, higher = more motion needed)
   * @param frameWidth Width of frames to analyze
   * @param frameHeight Height of frames to analyze
   * @param pixelDiffThreshold Threshold for considering a single pixel as changed (0-255 for grayscale)
   */
  constructor(
    sensitivityThreshold = 5,
    frameWidth = 320,
    frameHeight = 240,
    pixelDiffThreshold = 30
  ) {
    super();
    this.sensitivityThreshold = sensitivityThreshold; // Note: This is now % of changed pixels
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.pixelDiffThreshold = pixelDiffThreshold;
  }

  /**
   * Start proximity detection with continuous capture
   */
  start(): void {
    if (this.isRunning) {
      console.log("Proximity detector already running");
      return;
    }

    this.isRunning = true;
    console.log("Starting proximity detector with continuous capture mode");

    // Use timelapse mode to keep the camera running continuously
    const captureProcess = spawn("libcamera-still", [
      "--nopreview",
      "--width",
      this.frameWidth.toString(),
      "--height",
      this.frameHeight.toString(),
      "--timelapse",
      "500", // Capture every 500ms
      "--timeout",
      "0", // Run indefinitely
      "--output",
      "/tmp/prox_%04d.jpg", // Output files with sequential numbering
      "--quality",
      "50",
      "-v", // Verbose output to help with debugging
    ]);

    console.log(`Camera process started with PID: ${captureProcess.pid}`);
    this.processHandle = captureProcess;

    // Track the latest file number
    let fileCounter = 0;

    // Set up file watcher to process new images
    this.checkInterval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        const filename = `/tmp/prox_${String(fileCounter).padStart(
          4,
          "0"
        )}.jpg`;

        // Check if the file exists and is not empty
        if (fs.existsSync(filename) && fs.statSync(filename).size > 0) {
          console.log(`Processing file: ${filename}`);

          // Read the file
          const frameData = fs.readFileSync(filename);

          // Process the frame
          await this.analyzeFrame(frameData);

          // Delete the file after processing to keep disk usage low
          fs.unlinkSync(filename);

          // Increment the counter for the next file
          fileCounter++;
        }
      } catch (error) {
        console.log(`Error processing image: ${error}`);
      }
    }, 250); // Check for new files every 250ms (faster than capture rate)
  }

  /**
   * Stop proximity detection
   */
  stop(): void {
    console.log("Stopping proximity detector");
    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.processHandle) {
      this.processHandle.kill();
      this.processHandle = null;
    }

    // Clean up any remaining temporary files
    try {
      const tmpFiles = fs
        .readdirSync("/tmp")
        .filter((f) => f.startsWith("prox_"));
      for (const file of tmpFiles) {
        fs.unlinkSync(`/tmp/${file}`);
      }
    } catch (err) {
      console.log(`Error cleaning up temp files: ${err}`);
    }

    console.log("Proximity detector stopped");
  }
  /**
   * Set sensitivity threshold for proximity detection (percentage of pixels)
   * @param threshold New threshold value (0-100)
   */
  setSensitivity(threshold: number): void {
    if (threshold < 0 || threshold > 100)
      throw new Error("Threshold must be between 0 and 100");

    this.sensitivityThreshold = threshold;
    console.log(
      `Set proximity sensitivity threshold (pixel %) to ${threshold}`
    );
  }

  /**
   * Analyze a frame to detect proximity
   */
  private async analyzeFrame(frame: Buffer): Promise<void> {
    // Mark as async
    try {
      // Decode the current frame using Jimp
      const currentFrameImage = await Jimp.read(frame);

      // If this is the first frame, just store it as Jimp object
      if (!this.previousFrame) {
        this.previousFrame = currentFrameImage;
        console.log("Stored first frame for comparison.");
        return;
      }

      // Ensure frames are the same size before comparing
      if (
        this.previousFrame.width !== currentFrameImage.width ||
        this.previousFrame.height !== currentFrameImage.height
      ) {
        console.warn("Frame size mismatch. Skipping analysis.");
        this.previousFrame = currentFrameImage; // Store current for next round
        return;
      }

      // Calculate difference between frames using pixel data
      const diffPercentage = this.calculateFrameDifference(
        currentFrameImage,
        this.previousFrame
      );

      // Determine if something is close based on the difference percentage
      const isClose = diffPercentage > this.sensitivityThreshold;

      console.log(
        `Frame analyzed: ${diffPercentage.toFixed(2)}% motion detected`
      );

      // Emit proximity event with the result
      this.emit("proximity", isClose, diffPercentage);

      if (isClose) {
        console.log(
          `Proximity detected! Motion percentage: ${diffPercentage.toFixed(2)}%`
        );
      }

      // Store current frame Jimp object for next comparison
      this.previousFrame = currentFrameImage;
    } catch (error) {
      console.log(`Error analyzing frame: ${error}`);
    }
  }

  /**
   * Calculate the difference between current and previous frame Jimp objects
   * @returns Percentage of pixels that changed significantly
   */
  private calculateFrameDifference(
    currentFrameImage: any,
    previousFrameImage: any
  ): number {
    let diffCount = 0;
    const width = currentFrameImage.width;
    const height = currentFrameImage.height;
    const totalPixels = width * height;

    // Use a reduced sample size to save CPU on the Pi Zero W
    const sampleWidth = Math.max(1, Math.floor(width / 10)); // Sample every 10th pixel horizontally
    const sampleHeight = Math.max(1, Math.floor(height / 10)); // Sample every 10th pixel vertically

    for (let y = 0; y < height; y += sampleHeight) {
      for (let x = 0; x < width; x += sampleWidth) {
        const pixel1 = currentFrameImage.getPixelColor(x, y); // RGBA value
        const pixel2 = previousFrameImage.getPixelColor(x, y); // RGBA value

        // Get grayscale values (or luminance)
        // Get grayscale values (or luminance)
        const rgba1 = this.intToRGBA(pixel1);
        const rgba2 = this.intToRGBA(pixel2);
        const grey1 = rgba1.r * 0.299 + rgba1.g * 0.587 + rgba1.b * 0.114;
        const grey2 = rgba2.r * 0.299 + rgba2.g * 0.587 + rgba2.b * 0.114;

        // Calculate absolute difference and check against threshold
        if (Math.abs(grey1 - grey2) > this.pixelDiffThreshold) {
          diffCount++;
        }
      }
    }

    // Calculate percentage based on sampled pixels
    const totalSampledPixels =
      Math.ceil(width / sampleWidth) * Math.ceil(height / sampleHeight);

    return (diffCount / totalSampledPixels) * 100;
  }

  /**
   * Utility to convert an RGBA int to separate RGBA components
   * Replacement for Jimp.intToRGBA which doesn't seem to be accessible
   */
  private intToRGBA(intColor: number): {
    r: number;
    g: number;
    b: number;
    a: number;
  } {
    return {
      r: (intColor >> 24) & 0xff,
      g: (intColor >> 16) & 0xff,
      b: (intColor >> 8) & 0xff,
      a: intColor & 0xff,
    };
  }
}

export default ProximityDetector;
