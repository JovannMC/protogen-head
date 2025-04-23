import { spawn } from "child_process";
import fs from "fs";
import path from "path";

/**
 * Records video from the Raspberry Pi camera module
 */
class CameraRecorder {
  private isRecording = false;
  private recordProcess: ReturnType<typeof spawn> | null = null;
  private outputDir: string;

  /**
   * Initialize the camera recorder
   * @param outputDir Directory to save recordings
   */
  constructor(outputDir = "recordings") {
    this.outputDir = outputDir;

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Created output directory: ${outputDir}`);
    }
  }

  /**
   * Start recording video
   * @param duration Recording duration in seconds (0 = until stop is called)
   * @param quality Video quality (0-100)
   * @param width Video width in pixels
   * @param height Video height in pixels
   * @returns Path to the output file or null if failed
   */
  startRecording(
    duration = 0,
    quality = 75,
    width = 1280,
    height = 720
  ): string | null {
    if (this.isRecording) {
      console.log("Already recording!");
      return null;
    }

    try {
      const timestamp = new Date().toISOString().replace(/:/g, "-");
      const outputFile = path.join(
        this.outputDir,
        `recording_${timestamp}.h264`
      );

      const args = [
        "-n", // No preview
        "-t",
        duration > 0 ? (duration * 1000).toString() : "0", // Duration in ms (0 = unlimited)
        "-q",
        quality.toString(),
        "--width",
        width.toString(),
        "--height",
        height.toString(),
        "-o",
        outputFile,
      ];

      console.log(`Starting recording with libcamera-vid ${args.join(" ")}`);

      this.recordProcess = spawn("libcamera-vid", args);
      this.isRecording = true;

      this.recordProcess.stdout.on("data", (data) => {
        console.log(`Camera stdout: ${data}`);
      });

      this.recordProcess.stderr.on("data", (data) => {
        console.log(`Camera stderr: ${data}`);
      });

      this.recordProcess.on("close", (code) => {
        console.log(`Recording process exited with code ${code}`);
        this.isRecording = false;
        this.recordProcess = null;
      });

      return outputFile;
    } catch (error) {
      console.log(`Error starting recording: ${error}`);
      this.isRecording = false;
      return null;
    }
  }

  /**
   * Stop the current recording
   */
  stopRecording(): void {
    if (!this.isRecording || !this.recordProcess) {
      console.log("Not currently recording");
      return;
    }

    try {
      // Send SIGTERM to gracefully stop recording
      this.recordProcess.kill("SIGTERM");
      console.log("Stopped recording");
    } catch (error) {
      console.log(`Error stopping recording: ${error}`);
    }
  }
}

export default CameraRecorder;
