import * as turf from "@turf/turf"; // For calculating rotation/bearing
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import { Threebox } from "threebox-plugin"; // The bridge between Mapbox and Three.js

// Token setup
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const BusTracker = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const busModelRef = useRef(null); // To store the 3D bus instance

  // Example: Starting coordinates (Dhaka coordinates)
  const startCoords = [90.4125, 23.8103];

  useEffect(() => {
    // 1. Initialize Map
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12", // Lighter styles make 3D models pop
      center: startCoords,
      zoom: 18,
      pitch: 60, // Important: Tilt the map so you can see the 3D effect!
      bearing: 0,
      antialias: true, // Crucial for smooth 3D edges
    });

    mapRef.current = map;

    map.on("style.load", () => {
      // 2. Add the Custom Layer for the 3D Model
      map.addLayer({
        id: "3d-bus-layer",
        type: "custom",
        renderingMode: "3d",
        onAdd: function (map, mbxContext) {
          // Initialize Threebox
          window.tb = new Threebox(map, mbxContext, { defaultLights: true });

          // 3. Load the 3D Model
          const options = {
            obj: "/models/bus.glb", // Path to your file in public folder
            type: "gltf",
            scale: { x: 0.1, y: 0.1, z: 0.1 }, // Adjust scale if bus is too huge/tiny
            units: "meters", // Ensures it stays realistic size at all zoom levels
            rotation: { x: 90, y: 90, z: 0 }, // Adjust to fix initial model orientation
            anchor: "center",
          };

          window.tb.loadObj(options, (model) => {
            model.setCoords(startCoords);
            model.setRotation({ x: 0, y: 0, z: 0 }); // Initial rotation

            // Add tooltip (optional)
            model.addTooltip("Bus #123", true);

            window.tb.add(model);
            busModelRef.current = model; // Save reference to animate later
          });
        },

        render: function () {
          window.tb.update(); // Essential for Threebox to render every frame
        },
      });
    });

    return () => map.remove();
  }, []);

  // ---------------------------------------------------------
  // FUNCTION TO MOVE THE BUS SMOOTHLY
  // ---------------------------------------------------------
  const moveBusTo = (newCoords) => {
    if (!busModelRef.current || !mapRef.current) return;

    const bus = busModelRef.current;
    const previousCoords = bus.coordinates; // Get current [lng, lat]

    // 1. Calculate the rotation (Bearing) so bus faces the destination
    // Uses Turf.js to calculate angle between two points
    const from = turf.point(previousCoords);
    const to = turf.point(newCoords);
    const bearing = turf.bearing(from, to);

    // 2. Animate Position and Rotation
    // Threebox has built-in animation, but for full control we often set options
    // setCoords(lnglat) moves it instantly, so we need a loop or use Threebox's internal tools.
    // However, Threebox objects have a `.setCoords` that updates position.

    // Simplest Smooth Animation approach:
    // Update the bus properties. Threebox will render the change.
    // For true "Uber-like" gliding, you would typically interpolate this over time (e.g. 1000ms)

    bus.setCoords(newCoords);

    // Rotate the bus on the Z axis to face the road
    // Note: You might need to add/subtract 90 or 180 depending on your 3D model's native facing
    bus.setRotation({ x: 0, y: 0, z: bearing });
  };

  // Simulate incoming socket data for testing
  useEffect(() => {
    const interval = setInterval(() => {
      // Create a fake new coordinate slightly different from the last
      const time = Date.now() / 1000;
      const newLng = 90.4125 + Math.sin(time) * 0.001;
      const newLat = 23.8103 + Math.cos(time) * 0.001;

      moveBusTo([newLng, newLat]);
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={mapContainerRef}
      style={{ width: "500px", height: "500px", border: "1px solid black" }}
    />
  );
};

export default BusTracker;
