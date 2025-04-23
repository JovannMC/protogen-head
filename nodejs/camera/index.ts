import CameraRecorder from './recorder';
import ProximityDetector from './proximity';

console.log("Raspberry Pi Camera Module Starting...");

// Create instances
const recorder = new CameraRecorder('recordings');
const proximityDetector = new ProximityDetector(30); // 30% threshold

// Flag to track recording state
let isRecording = false;

// Set up proximity detection events
proximityDetector.on('proximity', (isClose, motionPercentage) => {
  if (isClose) {
    console.log(`Proximity detected! Someone is close to the camera (${motionPercentage.toFixed(2)}%)`);
    
    // Example: Start recording when someone is detected
    if (!isRecording) {
      //startRecording();
    }
  }
});

startRecording();

// Start proximity detection
proximityDetector.start();
console.log("Proximity detector started");

// Function to start recording
function startRecording() {
  const outputFile = recorder.startRecording(30); // 30-second recording
  if (outputFile) {
    isRecording = true;
    console.log(`Started recording to ${outputFile}`);
    
    // Stop recording after set timeout
    setTimeout(() => {
      recorder.stopRecording();
      isRecording = false;
      console.log("Recording stopped");
    }, 30000); // 30 seconds
  }
}

// Handle app shutdown
process.on('SIGINT', () => {
  console.log("Shutting down...");
  proximityDetector.stop();
  if (isRecording) {
    recorder.stopRecording();
  }
  process.exit(0);
});