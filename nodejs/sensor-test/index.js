"use strict";

const i2c = require("i2c-bus");
const { promisify } = require("util");

// --- Configuration ---
const I2C_BUS_NUMBER = 1; // Usually 1 on modern Raspberry Pis

// VL53L0X (Laser Sensor) Config
const VL53L0X_ADDRESS = 0x29; // Default address
const VL53L0X_REG_SYSRANGE_START = 0x00;
const VL53L0X_REG_RESULT_RANGE_STATUS = 0x14;

const READ_INTERVAL_MS = 1000; // Increased interval slightly for reading 4 channels
// --- End Configuration ---

let i2cBus;

// Promisify i2c-bus methods
async function openBus(busNumber) {
  const bus = i2c.openSync(busNumber);
  // Add other promisified methods if needed later
  const readWord = promisify(bus.readWord).bind(bus);
  const writeWord = promisify(bus.writeWord).bind(bus);
  const readI2cBlock = promisify(bus.readI2cBlock).bind(bus);
  const writeByte = promisify(bus.writeByte).bind(bus);
  const close = promisify(bus.close).bind(bus);
  return { bus, readWord, writeWord, readI2cBlock, writeByte, close };
}

// --- VL53L0X Functions ---
async function readDistance(bus) {
  try {
    await bus.writeByte(VL53L0X_ADDRESS, VL53L0X_REG_SYSRANGE_START, 0x01);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const buffer = Buffer.alloc(12);
    await bus.readI2cBlock(
      VL53L0X_ADDRESS,
      VL53L0X_REG_RESULT_RANGE_STATUS,
      12,
      buffer
    );
    const distance = buffer.readUInt16BE(10);
    if (distance >= 20 && distance < 8190) {
      return distance;
    } else {
      return -1; // Indicate out of range / invalid
    }
  } catch (err) {
    // console.error(`Error reading VL53L0X: ${err.message}`); // Handle in main loop
    return null; // Indicate error
  }
}

// --- Main Execution ---
async function main() {
  try {
    i2cBus = await openBus(I2C_BUS_NUMBER);
    console.log("I2C Bus opened successfully.");

    const intervalId = setInterval(async () => {
      const distance = await readDistance(i2cBus);

      let output = `Timestamp: ${new Date().toLocaleTimeString()} | `;

      if (distance === null) {
        output += `Distance: ERROR`;
      } else {
        output += `Distance (mm): ${
          distance === -1 ? "Out of Range" : distance
        }`;
      }
      console.log(output);
    }, READ_INTERVAL_MS);

    process.on("SIGINT", async () => {
      console.log("\nCaught interrupt signal (Ctrl+C)");
      clearInterval(intervalId);
      if (i2cBus) {
        await i2cBus.close();
        console.log("I2C Bus closed.");
      }
      process.exit(0);
    });
  } catch (err) {
    console.error(`Failed to open I2C bus ${I2C_BUS_NUMBER}: ${err.message}`);
    console.error("Please ensure I2C is enabled ('sudo raspi-config')");
    process.exit(1);
  }
}

main();
