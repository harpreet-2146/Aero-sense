// server.js
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());

// Delhi → Bangalore coordinates
const pathCoords = [
  [28.6139, 77.2090], // Delhi
  [13.0827, 80.2707]  // Bangalore
];

// Helper to generate path with deviation
function generatePathWithDeviation(coords, maxDev, steps = 200){
  const [start, end] = coords;
  const path = [];
  for(let i=0;i<=steps;i++){
    const t = i/steps;
    const lat = start[0]*(1-t) + end[0]*t + (Math.random()*2-1)*maxDev;
    const lng = start[1]*(1-t) + end[1]*t + (Math.random()*2-1)*maxDev;
    path.push([lat,lng]);
  }
  return path;
}

app.get('/api/paths', (req,res)=>{
  const gpsPath = generatePathWithDeviation(pathCoords, 0.5);
  const quantumPath = generatePathWithDeviation(pathCoords, 0.05);
  res.json({
    plannedPath: pathCoords,
    gpsPath,
    quantumPath
  });
});

app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));


// // backend/server.js
// const express = require("express");
// const cors = require("cors");

// const app = express();
// app.use(cors());

// // Delhi -> Mumbai base coordinates (rough)
// const DELHI = { lat: 28.6139, lng: 77.2090 };
// const MUMBAI = { lat: 19.0760, lng: 72.8777 };

// const NUM_DRONES = 5;
// const TOTAL_STEPS = 120; // how many steps from origin -> destination

// // Linear interpolate between two points
// function lerp(a, b, t) {
//   return a + (b - a) * t;
// }

// function interpolatePoint(t) {
//   return {
//     lat: lerp(DELHI.lat, MUMBAI.lat, t),
//     lng: lerp(DELHI.lng, MUMBAI.lng, t),
//   };
// }

// // distance approx (deg to km not required, keep numeric measure)
// function pairDistance(a, b) {
//   const dx = a.lat - b.lat;
//   const dy = a.lng - b.lng;
//   return Math.sqrt(dx * dx + dy * dy);
// }

// // Generate deterministic per-drone offset seed so simulation is repeatable per step
// function droneSeed(id) {
//   return (id * 9301 + 49297) % 233280;
// }
// function randFromSeed(seed) {
//   // simple linear congruential generator
//   return (seed * 9301 + 49297) % 233280 / 233280;
// }

// // Main endpoint: returns swarm positions for a given step, mode, weather
// // Query params: t (0..TOTAL_STEPS), mode = gps|quantum, weather = clear|rain
// app.get("/swarm", (req, res) => {
//   const t = Math.max(0, Math.min(TOTAL_STEPS, Number(req.query.t || 0)));
//   const mode = (req.query.mode || "gps").toLowerCase(); // gps | quantum
//   const weather = (req.query.weather || "clear").toLowerCase(); // clear | rain

//   // base true position along route
//   const progress = t / TOTAL_STEPS;
//   const truePos = interpolatePoint(progress);

//   // weather factor increases error in gps
//   const weatherFactor = weather === "rain" ? 1.8 : 1.0;
//   // base error ranges (degrees)
//   const GPS_ERROR_BASE = 0.03 * weatherFactor;    // larger drift (visible)
//   const QUANTUM_ERROR_BASE = 0.003;               // tiny drift for quantum

//   // We'll maintain some per-drone identity so they don't all overlap
//   const drones = [];

//   // Generate positions for NUM_DRONES
//   for (let i = 0; i < NUM_DRONES; i++) {
//     // seed-based pseudorandom for repeatability
//     const seed = droneSeed(i + 1) + t * (i + 7);
//     const r1 = randFromSeed(seed);
//     const r2 = randFromSeed(seed + 1);

//     // Each drone tries to follow the route but has an independent lateral offset baseline
//     const lateralBaseline = (r1 - 0.5) * 0.02 * (1 + i * 0.02); // small spread among drones

//     // If mode is gps and weather is rain, error grows with progress (simulate cumulative drift / spoofing)
//     let errorRange = mode === "gps" ? GPS_ERROR_BASE : QUANTUM_ERROR_BASE;

//     // Add intermittent spoof event: during middle of flight, gps gets an extra spike
//     const spoofSpike = (t > TOTAL_STEPS * 0.35 && t < TOTAL_STEPS * 0.6 && mode === "gps") ? 0.05 : 0;

//     // Random jitter
//     const jitterLat = (r1 - 0.5) * (errorRange + spoofSpike);
//     const jitterLng = (r2 - 0.5) * (errorRange + spoofSpike);

//     // For "quantum" mode we will apply a simple swarm-consensus correction:
//     // compute a 'localConsensus' that pulls drones toward the route center if mode==='quantum'
//     let proposed = {
//       lat: truePos.lat + lateralBaseline + jitterLat,
//       lng: truePos.lng + lateralBaseline + jitterLng,
//     };

//     drones.push({
//       id: i + 1,
//       proposed,            // before swarm-correction
//       jitter: Math.sqrt(jitterLat * jitterLat + jitterLng * jitterLng),
//     });
//   }

//   // If quantum mode: perform a simple consensus to reduce deviation among drones and pull them to true route
//   if (mode === "quantum") {
//     // compute centroid of proposed positions
//     const centroid = drones.reduce(
//       (acc, d) => {
//         acc.lat += d.proposed.lat;
//         acc.lng += d.proposed.lng;
//         return acc;
//       },
//       { lat: 0, lng: 0 }
//     );
//     centroid.lat /= drones.length;
//     centroid.lng /= drones.length;

//     // For each drone, pull it slightly toward centroid AND toward truePos (simulate cooperative correction)
//     const correctedDrones = drones.map((d) => {
//       // weights: consensus weight and route weight
//       const consensusPull = 0.35; // how much to move toward swarm centroid
//       const routePull = 0.6;      // how much to move toward true route
//       const correctedLat =
//         d.proposed.lat * (1 - consensusPull - routePull) +
//         centroid.lat * consensusPull +
//         truePos.lat * routePull;
//       const correctedLng =
//         d.proposed.lng * (1 - consensusPull - routePull) +
//         centroid.lng * consensusPull +
//         truePos.lng * routePull;
//       return {
//         id: d.id,
//         lat: correctedLat,
//         lng: correctedLng,
//         deviation: pairDistance({ lat: correctedLat, lng: correctedLng }, truePos),
//         status: "quantum-corrected",
//       };
//     });

//     // prepare response
//     const avgDeviation = correctedDrones.reduce((s, d) => s + d.deviation, 0) / correctedDrones.length;
//     return res.json({
//       t,
//       mode,
//       weather,
//       truePos,
//       drones: correctedDrones,
//       avgDeviation,
//       cohesion: correctedDrones.reduce((acc, d) => acc + pairDistance({lat:d.lat,lng:d.lng}, {lat: correctedDrones[0].lat, lng: correctedDrones[0].lng}), 0) / correctedDrones.length,
//     });
//   }

//   // For GPS mode: no consensus correction, each drone subject to jitter/spoof
//   const gpsDrones = drones.map((d) => {
//     // add some extra drift amplification for weather/spoof (already in jitter)
//     const lat = d.proposed.lat;
//     const lng = d.proposed.lng;
//     return {
//       id: d.id,
//       lat,
//       lng,
//       deviation: pairDistance({ lat, lng }, truePos),
//       status: "gps-raw",
//     };
//   });

//   const avgDeviation = gpsDrones.reduce((s, d) => s + d.deviation, 0) / gpsDrones.length;
//   const cohesion = gpsDrones.reduce((acc, d) => acc + pairDistance({lat:d.lat,lng:d.lng}, {lat: gpsDrones[0].lat, lng: gpsDrones[0].lng}), 0) / gpsDrones.length;

//   res.json({
//     t,
//     mode,
//     weather,
//     truePos,
//     drones: gpsDrones,
//     avgDeviation,
//     cohesion,
//   });
// });

// app.get("/route", (req, res) => {
//   // return a simple polyline route sampled at 50 points
//   const pts = [];
//   const steps = 50;
//   for (let i = 0; i <= steps; i++) {
//     const p = interpolatePoint(i / steps);
//     pts.push(p);
//   }
//   res.json({ start: DELHI, end: MUMBAI, waypoints: pts });
// });

// const PORT = 5000;
// app.listen(PORT, () => {
//   console.log(`✅ Backend running on http://localhost:${PORT}`);
// });
