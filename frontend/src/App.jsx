// App.jsx
import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Line } from "react-chartjs-2";
import ChartJS from "chart.js/auto";

// Icons
const gpsIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [35, 35],
});
const quantumIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [35, 35],
  className: "blue-icon",
});

export default function App() {
  const [paths, setPaths] = useState(null);
  const [step, setStep] = useState(0);
  const [deviationData, setDeviationData] = useState({ gps: [], quantum: [] });
  const [weather, setWeather] = useState("clear");
  const intervalRef = useRef(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/paths")
      .then((res) => res.json())
      .then((data) => setPaths(data));
  }, []);

  const startSimulation = () => {
    if (!paths) return;
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setStep((prev) => {
        if (prev < paths.gpsPath.length - 1) {
          const t = prev / paths.gpsPath.length;
          const plannedLat =
            paths.plannedPath[0][0] * (1 - t) + paths.plannedPath[1][0] * t;
          const plannedLng =
            paths.plannedPath[0][1] * (1 - t) + paths.plannedPath[1][1] * t;

          const gpsDev = Math.sqrt(
            (paths.gpsPath[prev][0] - plannedLat) ** 2 +
              (paths.gpsPath[prev][1] - plannedLng) ** 2
          );
          const quantumDev = Math.sqrt(
            (paths.quantumPath[prev][0] - plannedLat) ** 2 +
              (paths.quantumPath[prev][1] - plannedLng) ** 2
          );

          setDeviationData((prevData) => ({
            gps: [...prevData.gps, gpsDev],
            quantum: [...prevData.quantum, quantumDev],
          }));
          return prev + 1;
        } else {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          return prev;
        }
      });
    }, 150);
  };

  const stopSimulation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resetSimulation = () => {
    stopSimulation();
    setStep(0);
    setDeviationData({ gps: [], quantum: [] });
  };

  if (!paths) return <div>Loading...</div>;

  const chartData = {
    labels: Array.from({ length: deviationData.gps.length }, (_, i) => i),
    datasets: [
      { label: "GPS Deviation", data: deviationData.gps, borderColor: "red", fill: false },
      { label: "Quantum Deviation", data: deviationData.quantum, borderColor: "blue", fill: false },
    ],
  };

  // Weather overlay animation over map
  const WeatherOverlay = () => {
    if (weather === "rain") {
      return (
        <div className="weather-overlay">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="rain"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              /\
            </div>
          ))}
        </div>
      );
    }
    if (weather === "fog") {
      return (
        <div className="weather-overlay">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="fog"
              style={{ left: `${i * 20}%`, animationDelay: `${i}s` }}
            ></div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        backgroundColor: "#001f4d",
        color: "white",
        overflowY: "scroll",
        boxSizing: "border-box",
        padding: "0 20px",
      }}
    >
      {/* Title */}
      <h1 style={{ textAlign: "center", padding: "10px 0" }}>AeroSense Simulation</h1>

      {/* Controls */}
      <div
        style={{
          padding: "10px",
          position: "sticky",
          top: 0,
          backgroundColor: "#001f4d",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: "15px",
        }}
      >
        <button
          style={{ backgroundColor: "green", color: "white", padding: "8px 16px", borderRadius: "5px" }}
          onClick={startSimulation}
        >
          Start
        </button>
        <button
          style={{ backgroundColor: "orange", color: "white", padding: "8px 16px", borderRadius: "5px" }}
          onClick={stopSimulation}
        >
          Stop
        </button>
        <button
          style={{ backgroundColor: "red", color: "white", padding: "8px 16px", borderRadius: "5px" }}
          onClick={resetSimulation}
        >
          Reset
        </button>
        <div style={{ marginLeft: "20px" }}>
          Weather:
          <select
            value={weather}
            onChange={(e) => setWeather(e.target.value)}
            style={{ marginLeft: "5px", padding: "5px", borderRadius: "5px" }}
          >
            <option value="clear">Clear</option>
            <option value="rain">Rain</option>
            <option value="fog">Fog</option>
          </select>
        </div>
      </div>

      {/* Maps side by side */}
      <div style={{ display: "flex", gap: "20px", width: "100%", height: "70vh", marginTop: "20px" }}>
        {/* GPS Map */}
        <div style={{ flex: 1, position: "relative", borderRadius: "10px", overflow: "hidden" }}>
          <h3 style={{ textAlign: "center", margin: "5px 0" }}>GPS Simulation</h3>
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            style={{ height: "calc(100% - 30px)", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Polyline positions={paths.plannedPath} color="black" weight={3} />
            <Polyline positions={paths.gpsPath} color="red" dashArray="5,10" weight={2} />
            <Marker
              position={paths.gpsPath[Math.min(step, paths.gpsPath.length - 1)]}
              icon={gpsIcon}
            />
          </MapContainer>
          <WeatherOverlay />
        </div>

        {/* Quantum Map */}
        <div style={{ flex: 1, position: "relative", borderRadius: "10px", overflow: "hidden" }}>
          <h3 style={{ textAlign: "center", margin: "5px 0" }}>Quantum Simulation</h3>
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            style={{ height: "calc(100% - 30px)", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Polyline positions={paths.plannedPath} color="black" weight={3} />
            <Polyline positions={paths.quantumPath} color="blue" dashArray="5,10" weight={2} />
            <Marker
              position={paths.quantumPath[Math.min(step, paths.quantumPath.length - 1)]}
              icon={quantumIcon}
            />
          </MapContainer>
          <WeatherOverlay />
        </div>
      </div>

      {/* Deviation Graph (second scroll page, lower now) */}
      <div
        style={{
          height: "80vh",
          width: "100%",
          padding: "20px",
          marginTop: "50px",
          backgroundColor: "#001f4d",
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Deviation Graph</h2>
        <Line data={chartData} />
      </div>

      {/* Styles for rain/fog */}
      <style>{`
        .weather-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
        }
        .rain {
          position: absolute;
          top: -10px;
          color: #00f;
          font-weight: bold;
          font-size: 20px;
          animation: fall 1.5s linear infinite;
        }
        .fog {
          position: absolute;
          top: 0;
          width: 25%;
          height: 100%;
          background: rgba(200,200,200,0.2);
          animation: drift 10s linear infinite;
        }
        @keyframes fall {
          0% { transform: translateY(0); opacity: 0.6; }
          100% { transform: translateY(100%); opacity: 0.2; }
        }
        @keyframes drift {
          0% { transform: translateX(-25%); }
          100% { transform: translateX(125%); }
        }
      `}</style>
    </div>
  );
}


// // App.jsx
// import React, { useEffect, useState, useRef } from "react";
// import { MapContainer, TileLayer, Polyline, Marker, LayerGroup, Rectangle } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import { Line } from "react-chartjs-2";
// import ChartJS from "chart.js/auto";

// // Icons
// const gpsIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
//   iconSize: [35, 35],
// });
// const quantumIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
//   iconSize: [35, 35],
//   className: "blue-icon",
// });

// export default function App() {
//   const [paths, setPaths] = useState(null);
//   const [step, setStep] = useState(0);
//   const [deviationData, setDeviationData] = useState({ gps: [], quantum: [] });
//   const [weather, setWeather] = useState("clear");
//   const intervalRef = useRef(null);

//   // Fetch paths
//   useEffect(() => {
//     fetch("http://localhost:5000/api/paths")
//       .then((res) => res.json())
//       .then((data) => setPaths(data));
//   }, []);

//   // Start simulation
//   const startSimulation = () => {
//     if (!paths) return;
//     if (intervalRef.current) return;
//     intervalRef.current = setInterval(() => {
//       setStep((prev) => {
//         if (prev < paths.gpsPath.length - 1) {
//           const t = prev / paths.gpsPath.length;
//           const plannedLat =
//             paths.plannedPath[0][0] * (1 - t) + paths.plannedPath[1][0] * t;
//           const plannedLng =
//             paths.plannedPath[0][1] * (1 - t) + paths.plannedPath[1][1] * t;

//           const gpsDev = Math.sqrt(
//             (paths.gpsPath[prev][0] - plannedLat) ** 2 +
//               (paths.gpsPath[prev][1] - plannedLng) ** 2
//           );
//           const quantumDev = Math.sqrt(
//             (paths.quantumPath[prev][0] - plannedLat) ** 2 +
//               (paths.quantumPath[prev][1] - plannedLng) ** 2
//           );

//           setDeviationData((prevData) => ({
//             gps: [...prevData.gps, gpsDev],
//             quantum: [...prevData.quantum, quantumDev],
//           }));
//           return prev + 1;
//         } else {
//           clearInterval(intervalRef.current);
//           intervalRef.current = null;
//           return prev;
//         }
//       });
//     }, 150); // slower animation
//   };

//   const stopSimulation = () => {
//     if (intervalRef.current) {
//       clearInterval(intervalRef.current);
//       intervalRef.current = null;
//     }
//   };

//   const resetSimulation = () => {
//     stopSimulation();
//     setStep(0);
//     setDeviationData({ gps: [], quantum: [] });
//   };

//   if (!paths) return <div>Loading...</div>;

//   const chartData = {
//     labels: Array.from({ length: deviationData.gps.length }, (_, i) => i),
//     datasets: [
//       { label: "GPS Deviation", data: deviationData.gps, borderColor: "red", fill: false },
//       { label: "Quantum Deviation", data: deviationData.quantum, borderColor: "blue", fill: false },
//     ],
//   };

//   // Weather overlay
//   const renderWeatherOverlay = () => {
//     if (weather === "rain") {
//       return <Rectangle bounds={[[0, 0], [90, 180]]} pathOptions={{ color: "blue", fillOpacity: 0.1 }} />;
//     }
//     if (weather === "fog") {
//       return <Rectangle bounds={[[0, 0], [90, 180]]} pathOptions={{ color: "gray", fillOpacity: 0.2 }} />;
//     }
//     return null;
//   };

//   return (
//     <div style={{ width: "100vw", height: "100vh", overflowY: "scroll" }}>
//       {/* Controls */}
//       <div style={{ padding: "10px", position: "sticky", top: 0, backgroundColor: "white", zIndex: 100, display: "flex", alignItems: "center", gap: "15px" }}>
//         <button style={{ backgroundColor: "green", color: "white", padding: "8px 16px", borderRadius: "5px" }} onClick={startSimulation}>Start</button>
//         <button style={{ backgroundColor: "orange", color: "white", padding: "8px 16px", borderRadius: "5px" }} onClick={stopSimulation}>Stop</button>
//         <button style={{ backgroundColor: "red", color: "white", padding: "8px 16px", borderRadius: "5px" }} onClick={resetSimulation}>Reset</button>
//         <div style={{ marginLeft: "20px" }}>
//           Weather:
//           <select value={weather} onChange={(e) => setWeather(e.target.value)} style={{ marginLeft: "5px", padding: "5px", borderRadius: "5px" }}>
//             <option value="clear">Clear</option>
//             <option value="rain">Rain</option>
//             <option value="fog">Fog</option>
//           </select>
//         </div>
//       </div>

//       {/* Maps side by side */}
//       <div style={{ display: "flex", width: "100%", height: "70vh" }}>
//         {/* GPS Map */}
//         <div style={{ flex: 1, height: "100%" }}>
//           <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: "100%", width: "100%" }}>
//             <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
//             <Polyline positions={paths.plannedPath} color="black" weight={3} />
//             <Polyline positions={paths.gpsPath} color="red" dashArray="5,10" weight={2} />
//             <Marker position={paths.gpsPath[Math.min(step, paths.gpsPath.length - 1)]} icon={gpsIcon} />
//             <LayerGroup>{renderWeatherOverlay()}</LayerGroup>
//           </MapContainer>
//         </div>

//         {/* Quantum Map */}
//         <div style={{ flex: 1, height: "100%" }}>
//           <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: "100%", width: "100%" }}>
//             <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
//             <Polyline positions={paths.plannedPath} color="black" weight={3} />
//             <Polyline positions={paths.quantumPath} color="blue" dashArray="5,10" weight={2} />
//             <Marker position={paths.quantumPath[Math.min(step, paths.quantumPath.length - 1)]} icon={quantumIcon} />
//             <LayerGroup>{renderWeatherOverlay()}</LayerGroup>
//           </MapContainer>
//         </div>
//       </div>

//       {/* Deviation Graph (second scrollable page) */}
//       <div style={{ height: "70vh", width: "100%", padding: "20px", backgroundColor: "#f0f0f0" }}>
//         <h2 style={{ textAlign: "center" }}>Deviation Graph</h2>
//         <Line data={chartData} />
//       </div>
//     </div>
//   );
// }


// // App.jsx
// import React, { useEffect, useState, useRef } from "react";
// import { MapContainer, TileLayer, Polyline, Marker } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import { Line } from "react-chartjs-2";
// import ChartJS from "chart.js/auto";

// const gpsIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
//   iconSize: [35, 35]
// });
// const quantumIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
//   iconSize: [35, 35],
//   className: "blue-icon"
// });

// export default function App() {
//   const [paths, setPaths] = useState(null);
//   const [step, setStep] = useState(0);
//   const [deviationData, setDeviationData] = useState({ gps: [], quantum: [] });
//   const [weather, setWeather] = useState("clear");
//   const intervalRef = useRef(null);

//   useEffect(() => {
//     fetch("http://localhost:5000/api/paths")
//       .then(res => res.json())
//       .then(data => setPaths(data));
//   }, []);

//   const startSimulation = () => {
//     if (!paths) return;
//     if (intervalRef.current) return;
//     intervalRef.current = setInterval(() => {
//       setStep(prev => {
//         if (prev < paths.gpsPath.length - 1) {
//           const t = prev / paths.gpsPath.length;
//           const plannedLat = paths.plannedPath[0][0]*(1-t) + paths.plannedPath[1][0]*t;
//           const plannedLng = paths.plannedPath[0][1]*(1-t) + paths.plannedPath[1][1]*t;

//           const gpsDev = Math.sqrt(
//             (paths.gpsPath[prev][0]-plannedLat)**2 +
//             (paths.gpsPath[prev][1]-plannedLng)**2
//           );
//           const quantumDev = Math.sqrt(
//             (paths.quantumPath[prev][0]-plannedLat)**2 +
//             (paths.quantumPath[prev][1]-plannedLng)**2
//           );

//           setDeviationData(prevData => ({
//             gps: [...prevData.gps, gpsDev],
//             quantum: [...prevData.quantum, quantumDev]
//           }));
//           return prev + 1;
//         } else {
//           clearInterval(intervalRef.current);
//           intervalRef.current = null;
//           return prev;
//         }
//       });
//     }, 150); // slow animation
//   };

//   const stopSimulation = () => {
//     if(intervalRef.current) {
//       clearInterval(intervalRef.current);
//       intervalRef.current = null;
//     }
//   };

//   const resetSimulation = () => {
//     stopSimulation();
//     setStep(0);
//     setDeviationData({ gps: [], quantum: [] });
//   };

//   if (!paths) return <div>Loading...</div>;

//   const chartData = {
//     labels: Array.from({length: deviationData.gps.length}, (_,i)=>i),
//     datasets: [
//       { label:"GPS Deviation", data: deviationData.gps, borderColor:"red", fill:false },
//       { label:"Quantum Deviation", data: deviationData.quantum, borderColor:"blue", fill:false }
//     ]
//   };

//   return (
//     <div style={{width:"100vw", height:"100vh", overflowY:"scroll"}}>
//       {/* Controls */}
//       <div style={{padding:"10px", position:"sticky", top:0, backgroundColor:"white", zIndex:100, display:"flex", alignItems:"center", gap:"15px"}}>
//         <button style={{backgroundColor:"green", color:"white", padding:"8px 16px", borderRadius:"5px"}} onClick={startSimulation}>Start</button>
//         <button style={{backgroundColor:"orange", color:"white", padding:"8px 16px", borderRadius:"5px"}} onClick={stopSimulation}>Stop</button>
//         <button style={{backgroundColor:"red", color:"white", padding:"8px 16px", borderRadius:"5px"}} onClick={resetSimulation}>Reset</button>
//         <div style={{marginLeft:"20px"}}>
//           Weather: 
//           <select value={weather} onChange={e=>setWeather(e.target.value)} style={{marginLeft:"5px", padding:"5px", borderRadius:"5px"}}>
//             <option value="clear">Clear</option>
//             <option value="rain">Rain</option>
//             <option value="fog">Fog</option>
//           </select>
//         </div>
//       </div>

//       {/* First Map: GPS */}
//       <div style={{height:"50vh", width:"100%"}}>
//         <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{height:"100%", width:"100%"}}>
//           <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
//           <Polyline positions={paths.plannedPath} color="black" weight={3}/>
//           <Polyline positions={paths.gpsPath} color="red" dashArray="5,10" weight={2}/>
//           <Marker position={paths.gpsPath[Math.min(step, paths.gpsPath.length-1)]} icon={gpsIcon}/>
//         </MapContainer>
//       </div>

//       {/* Second Map: Quantum */}
//       <div style={{height:"50vh", width:"100%"}}>
//         <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{height:"100%", width:"100%"}}>
//           <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
//           <Polyline positions={paths.plannedPath} color="black" weight={3}/>
//           <Polyline positions={paths.quantumPath} color="blue" dashArray="5,10" weight={2}/>
//           <Marker position={paths.quantumPath[Math.min(step, paths.quantumPath.length-1)]} icon={quantumIcon}/>
//         </MapContainer>
//       </div>

//       {/* Deviation Graph (second scroll page) */}
//       <div style={{height:"70vh", width:"100%", padding:"20px", backgroundColor:"#f0f0f0"}}>
//         <h2 style={{textAlign:"center"}}>Deviation Graph</h2>
//         <Line data={chartData}/>
//       </div>
//     </div>
//   );
// }




// import React, { useEffect, useState, useRef } from "react";
// import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import { Line } from "react-chartjs-2";
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
// } from "chart.js";

// ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// const BACKEND = "http://localhost:5000";
// const NUM_DRONES = 3;
// const TOTAL_STEPS = 60;
// const STEP_DELAY = 1500; // cinematic slow motion

// const defaultMarker = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
//   iconSize: [35, 35],
//   iconAnchor: [17, 35],
// });

// function FlyTo({ center }) {
//   const map = useMap();
//   useEffect(() => {
//     if (center) map.flyTo(center, 7, { animate: true, duration: 0.7 });
//   }, [center, map]);
//   return null;
// }

// // CSS-based rain using `/` symbols
// function RainOverlay({ density = 50 }) {
//   const drops = Array.from({ length: density }).map((_, i) => {
//     const left = Math.random() * 100;
//     const delay = Math.random() * 2;
//     const duration = 1 + Math.random();
//     return (
//       <div
//         key={i}
//         style={{
//           position: "absolute",
//           top: "-10px",
//           left: `${left}%`,
//           fontSize: "16px",
//           color: "white",
//           opacity: 0.5 + Math.random() * 0.5,
//           animation: `fall ${duration}s linear ${delay}s infinite`,
//           zIndex: 1000,
//         }}
//       >
//         /
//       </div>
//     );
//   });
//   return <>{drops}</>;
// }

// export default function App() {
//   const [route, setRoute] = useState([]);
//   const [gpsDrones, setGpsDrones] = useState([]);
//   const [quantDrones, setQuantDrones] = useState([]);
//   const [t, setT] = useState(0);
//   const [running, setRunning] = useState(false);
//   const [rain, setRain] = useState(false);
//   const [historyStats, setHistoryStats] = useState([]);
//   const timerRef = useRef(null);

//   useEffect(() => {
//     fetch(`${BACKEND}/route`)
//       .then((res) => res.json())
//       .then((data) => setRoute(data.waypoints));
//   }, []);

//   useEffect(() => {
//     if (!route.length) return;
//     const gpsInit = Array(NUM_DRONES)
//       .fill(0)
//       .map(() => ({
//         lat: route[0].lat,
//         lng: route[0].lng,
//         trail: [[route[0].lat, route[0].lng]],
//         deviation: 0,
//       }));
//     const quantInit = Array(NUM_DRONES)
//       .fill(0)
//       .map(() => ({
//         lat: route[0].lat,
//         lng: route[0].lng,
//         trail: [[route[0].lat, route[0].lng]],
//         deviation: 0,
//       }));
//     setGpsDrones(gpsInit);
//     setQuantDrones(quantInit);
//     setT(0);
//     setHistoryStats([]);
//   }, [route]);

//   useEffect(() => {
//     if (!running) return;
//     timerRef.current = setInterval(() => {
//       setT((prev) => {
//         if (prev >= TOTAL_STEPS) {
//           clearInterval(timerRef.current);
//           setRunning(false);
//           return prev;
//         }
//         const nextT = prev + 1;

//         // Update GPS drones with deviation
//         setGpsDrones((prevGps) =>
//           prevGps.map((d) => {
//             const index = Math.min(Math.floor((nextT / TOTAL_STEPS) * (route.length - 1)), route.length - 2);
//             const start = route[index];
//             const end = route[index + 1];
//             const ratio = ((nextT / TOTAL_STEPS) * (route.length - 1)) % 1;

//             const dev = rain ? 0.04 : 0.02;
//             const devLat = (Math.random() - 0.5) * dev;
//             const devLng = (Math.random() - 0.5) * dev;

//             const lat = start.lat + (end.lat - start.lat) * ratio + devLat;
//             const lng = start.lng + (end.lng - start.lng) * ratio + devLng;

//             return {
//               ...d,
//               lat,
//               lng,
//               deviation: Math.sqrt(devLat * devLat + devLng * devLng),
//               trail: [...d.trail, [lat, lng]].slice(-30),
//             };
//           })
//         );

//         // Update Quantum drones with small jitter
//         setQuantDrones((prevQuant) =>
//           prevQuant.map((d) => {
//             const index = Math.min(Math.floor((nextT / TOTAL_STEPS) * (route.length - 1)), route.length - 2);
//             const start = route[index];
//             const end = route[index + 1];
//             const ratio = ((nextT / TOTAL_STEPS) * (route.length - 1)) % 1;

//             const dev = 0.005; // small jitter for visibility
//             const devLat = (Math.random() - 0.5) * dev;
//             const devLng = (Math.random() - 0.5) * dev;

//             const lat = start.lat + (end.lat - start.lat) * ratio + devLat;
//             const lng = start.lng + (end.lng - start.lng) * ratio + devLng;

//             return {
//               ...d,
//               lat,
//               lng,
//               deviation: Math.sqrt(devLat * devLat + devLng * devLng),
//               trail: [...d.trail, [lat, lng]].slice(-30),
//             };
//           })
//         );

//         // Update history stats
//         const avgGPS = gpsDrones.length
//           ? gpsDrones.reduce((s, d) => s + d.deviation, 0) / gpsDrones.length
//           : 0;
//         const avgQuantum = quantDrones.length
//           ? quantDrones.reduce((s, d) => s + d.deviation, 0) / quantDrones.length
//           : 0;
//         setHistoryStats((prev) => [...prev, { gps: avgGPS, quantum: avgQuantum }]);

//         return nextT;
//       });
//     }, STEP_DELAY);

//     return () => clearInterval(timerRef.current);
//   }, [running, route, rain]);

//   // Collision detection
//   const collision = [];
//   for (let i = 0; i < gpsDrones.length; i++) {
//     for (let j = i + 1; j < gpsDrones.length; j++) {
//       const dx = gpsDrones[i].lat - gpsDrones[j].lat;
//       const dy = gpsDrones[i].lng - gpsDrones[j].lng;
//       if (Math.sqrt(dx * dx + dy * dy) < 0.01) collision.push([(gpsDrones[i].lat + gpsDrones[j].lat) / 2, (gpsDrones[i].lng + gpsDrones[j].lng) / 2]);
//     }
//   }

//   const avgDeviationGPS = gpsDrones.length ? gpsDrones.reduce((s, d) => s + d.deviation, 0) / gpsDrones.length : 0;
//   const avgDeviationQuantum = quantDrones.length ? quantDrones.reduce((s, d) => s + d.deviation, 0) / quantDrones.length : 0;
//   const trustScore = Math.max(0, Math.round((1 - Math.min(1, avgDeviationQuantum / 0.08)) * 100));

//   const chartData = {
//     labels: historyStats.map((_, i) => `t${i + 1}`),
//     datasets: [
//       { label: "GPS Avg Deviation", data: historyStats.map((h) => h.gps), borderColor: "red", borderWidth: 2, fill: false, borderDash: [5, 3] },
//       { label: "Quantum Avg Deviation", data: historyStats.map((h) => h.quantum), borderColor: "blue", borderWidth: 2, fill: false },
//     ],
//   };

//   const maxDeviation = Math.max(
//     ...historyStats.map((h) => Math.max(h.gps, h.quantum)),
//     0.05
//   );

//   return (
//     <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
//       <h1 style={{ textAlign: "center" }}>🛰️ AeroSense Simulator — Cinematic</h1>

//       <div style={{ display: "flex", flex: 1, justifyContent: "space-between", gap: 10, padding: "0 10px" }}>
//         {/* GPS Map */}
//         <div style={{ flex: 1, position: "relative" }}>
//           <h3 style={{ textAlign: "center" }}>GPS Mode {rain ? "(Rain)" : ""}</h3>
//           {rain && <RainOverlay density={60} />}
//           <MapContainer center={[28.6139, 77.209]} zoom={7} style={{ height: "90%", width: "100%" }}>
//             <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
//             {route.length > 0 && <Polyline positions={route.map((p) => [p.lat, p.lng])} color="blue" />}
//             {gpsDrones.map((d, i) => (
//               <React.Fragment key={i}>
//                 <Marker position={[d.lat, d.lng]} icon={defaultMarker} />
//                 <Polyline positions={d.trail} color="red" weight={3} dashArray="5,3" />
//               </React.Fragment>
//             ))}
//             {collision.map((c, i) => (
//               <Marker key={i} position={c}>
//                 <div style={{ color: "red" }}>⚠️</div>
//               </Marker>
//             ))}
//             {gpsDrones[0] && <FlyTo center={[gpsDrones[0].lat, gpsDrones[0].lng]} />}
//           </MapContainer>
//         </div>

//         {/* Quantum Map */}
//         <div style={{ flex: 1, position: "relative" }}>
//           <h3 style={{ textAlign: "center" }}>Quantum Swarm Mode</h3>
//           <MapContainer center={[28.6139, 77.209]} zoom={7} style={{ height: "90%", width: "100%" }}>
//             <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
//             {route.length > 0 && <Polyline positions={route.map((p) => [p.lat, p.lng])} color="blue" />}
//             {quantDrones.map((d, i) => (
//               <React.Fragment key={i}>
//                 <Marker position={[d.lat, d.lng]} icon={defaultMarker} />
//                 <Polyline positions={d.trail} color="blue" weight={3} />
//               </React.Fragment>
//             ))}
//             {quantDrones[0] && <FlyTo center={[quantDrones[0].lat, quantDrones[0].lng]} />}
//           </MapContainer>
//         </div>
//       </div>

//       {/* Dashboard + Chart */}
//       <div style={{ height: "30vh", display: "flex", padding: 12, gap: 12, alignItems: "flex-start" }}>
//         <div style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6, minWidth: 220 }}>
//           <h4>Metrics</h4>
//           <p>Step: {t}/{TOTAL_STEPS}</p>
//           <p>GPS Avg Deviation: {avgDeviationGPS.toFixed(5)}</p>
//           <p>Quantum Avg Deviation: {avgDeviationQuantum.toFixed(5)}</p>
//           <p>Trust Score: {trustScore}%</p>
//           <p>Collision Risk: {collision.length > 0 ? "⚠️ Yes" : "None"}</p>
//           <button onClick={() => { setT(0); setGpsDrones([]); setQuantDrones([]); setHistoryStats([]); }}>Reset</button>
//           <button onClick={() => setRunning((r) => !r)}>{running ? "Pause" : "Start"}</button>
//           <button onClick={() => setRain((r) => !r)}>Toggle Rain</button>
//         </div>
//         <div style={{ flex: 1 }}>
//           <Line data={chartData} options={{ scales: { y: { min: 0, max: maxDeviation } } }} />
//         </div>
//       </div>

//       <style>{`
//         @keyframes fall {
//           0% { transform: translateY(0);}
//           100% { transform: translateY(100vh);}
//         }
//       `}</style>
//     </div>
//   );
// }
