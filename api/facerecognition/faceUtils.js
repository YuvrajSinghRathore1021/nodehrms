const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');
require('@tensorflow/tfjs'); // using JS backend

// Patch canvas for Node
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const MODELS_PATH = path.join(__dirname, '../models');

async function loadModels() {
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);
  console.log('✅ FaceAPI models loaded (JS backend)');
}

module.exports = { faceapi, canvas, loadModels };
