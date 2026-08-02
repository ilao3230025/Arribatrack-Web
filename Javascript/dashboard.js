import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";

  const firebaseConfig = {
    apiKey: "AIzaSyAeYi2ykobg43kBlqTTdO6-yathwPSy-H4",
    authDomain: "arribatrack-46da4.firebaseapp.com",
    databaseURL: "https://arribatrack-46da4-default-rtdb.firebaseio.com",
    projectId: "arribatrack-46da4",
    storageBucket: "arribatrack-46da4.firebasestorage.app",
    messagingSenderId: "269383688596",
    appId: "1:269383688596:web:845c0dc9a4ad80ed7eaf81",
    measurementId: "G-DYG3X35B7B"
  };
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const rtdb = getDatabase(app);

  //Mapbox
  const mapboxToken = "pk.eyJ1IjoiY29sYWRldyIsImEiOiJjbXM3OTN0MHYwMTB4MnlwdXZ5aGZ6NmlrIn0.Lape2nmP_Si00A8EjCFwYA";

  //School Coordinates (destination)
  const SCHOOL_LAT = 14.188953;
  const SCHOOL_LNG = 121.164623;

  //Logout Functionality
  const logoutButton=document.getElementById('logout');

  logoutButton.addEventListener('click', ()=>{
    localStorage.removeItem('loggedInUserId');
    signOut(auth)
    .then(()=>{
        window.location.href='index.html';
    })
    .catch((error)=>{
        console.error('Error signing out: ', error);
    })
  })


// Center on school on load
const map = L.map("map").setView([SCHOOL_LAT, SCHOOL_LNG], 15);

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: "© OpenStreetMap & CartoDB contributors",
}).addTo(map);

//School Marker
const schoolMarker = L.marker([SCHOOL_LAT, SCHOOL_LNG])
  .addTo(map)
  .bindTooltip("Colegio de San Juan de Letran Calamba", { permanent: true });

//Driver Marker
var myIcon = L.icon({
    iconUrl: 'Icons_and_Backgrounds/service_icon.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
});

// Hide marker until real driver location loads
const marker = L.marker([SCHOOL_LAT, SCHOOL_LNG], { 
  icon: myIcon,
  opacity: 0
}).addTo(map).bindTooltip("Driver 1");

// When location updates arrive, show marker at real position
function updateDriverLocation(lat, lng, recenter = true) {
  marker.setLatLng([lat, lng]);
  marker.setOpacity(1);
  if (recenter) map.setView([lat, lng], 15);
}

// Routing
let routingControl = null;

function updateRoute(driverLat, driverLng) {
  if (routingControl) {
    // Update waypoints on existing control
    routingControl.setWaypoints([
      L.latLng(driverLat, driverLng),
      L.latLng(SCHOOL_LAT, SCHOOL_LNG)
    ]);
    // routesfound listener is already attached — no need to reattach
  } else {
    // Create routing control for the first time
    routingControl = L.Routing.control({
      waypoints: [
        L.latLng(driverLat, driverLng),
        L.latLng(SCHOOL_LAT, SCHOOL_LNG)
      ],
      router: L.Routing.mapbox(mapboxToken, {
        profile: 'mapbox/driving'
      }),
      routeWhileDragging: false,
      addWaypoints: false,
      show: false,
      fitSelectedRoutes: false // prevents map from jumping around
    }).addTo(map);

    // Attach listener once on creation
    routingControl.on('routesfound', (e) => {
      const route = e.routes[0];
      const totalSeconds = route.summary.totalTime;
      document.getElementById('eta-display').textContent = `ETA: ${formatETA(totalSeconds)}`;
    });

    // Error listener to catch silent Mapbox failures
    routingControl.on('routingerror', (e) => {
      console.error('Routing error:', e.error);
      document.getElementById('eta-display').textContent = 'ETA unavailable';
    });
  }
}

// ETA Formatter
function formatETA(seconds) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return 'Arriving now';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}min`;
}

// Driver Mode: Push location to Firebase
let firstUpdate = true;
function startDriverTracking(driverId) {
  if (!navigator.geolocation) {
    console.error("Geolocation is not supported by this browser.");
    return;
  }
  navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, speed } = position.coords;
      set(ref(rtdb, `vehicles/${driverId}`), {
        lat: latitude,
        lng: longitude,
        speed: speed,
        timestamp: Date.now()
      });
      updateDriverLocation(latitude, longitude, firstUpdate);
      updateRoute(latitude, longitude);
      firstUpdate = false;
    },
    (error) => { console.error(`Geolocation error: ${error.message}`); },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
  );
}

// Parent Mode: Read location from Firebase
function watchDriverLocation(driverId) {
  const driverRef = ref(rtdb, `vehicles/${driverId}`);
  onValue(driverRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    updateDriverLocation(data.lat, data.lng);
    updateRoute(data.lat, data.lng);
  });
}

// ── Initialize based on role ──────────────────────────────────────────────────
// Temporary: hardcoded as driver for testing
// Later this should check user role from Firestore
const DRIVER_ID = "driver123"; // replace with actual driver ID from Firestore
const USER_ROLE = "driver"; // replace with actual role from Firestore

if (USER_ROLE === "driver") {
  startDriverTracking(DRIVER_ID);
} else {
  watchDriverLocation(DRIVER_ID);
}