import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";
import { getFirestore, getDoc, doc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

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
    const db = getFirestore(app);
  
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
  let lastUpdateTime = 0;
  const UPDATE_INTERVAL = 5000; // update every 5 seconds
  navigator.geolocation.watchPosition(
    (position) => {
      const now = Date.now();
      if (now - lastUpdateTime < UPDATE_INTERVAL) return;
      lastUpdateTime = now;
      const { latitude, longitude, speed } = position.coords;
      set(ref(rtdb, `vehicles/${driverId}`), {
        lat: latitude,
        lng: longitude,
        speed: speed,
        timestamp: now
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

// Role-Based Dashboard Initialization
async function initializeDashboard(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) {
      console.error('User document not found');
      window.location.href = 'index.html';
      return;
    }

    const userData = userDoc.data();
    const userRole = userData.role;

    // Update navbar with user name
    document.querySelector('.home_li a').textContent = `Welcome ${userData.firstName}`;

    if (userRole === 'driver') {
      initDriverDashboard(userId);
    } else if (userRole === 'parent') {
      initParentDashboard();
    } else if (userRole === 'admin') {
      initAdminDashboard();
    } else {
      console.error('Unknown role:', userRole);
      window.location.href = 'index.html';
    }

  } catch (error) {
    console.error('Error fetching user data:', error);
    window.location.href = 'index.html';
  }
}

function initDriverDashboard(userId) {
  console.log('Loading driver dashboard');
  //Placeholder code
  const endTripButton = document.getElementById('end-trip-button');
  if (endTripButton) endTripButton.style.display = 'block';
  startDriverTracking(userId);
}

function initParentDashboard() {
  console.log('Loading parent dashboard');
  // TODO: replace with parent's assigned driver ID from Firestore
  watchDriverLocation('driver123');
}

function initAdminDashboard() {
  console.log('Loading admin dashboard');
  // TODO: implement multi-driver tracking for admin view
  watchDriverLocation('driver123');
}

// Auth State
const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
  console.log('onAuthStateChanged fired');
  console.log('user:', user);
  console.log('auth.currentUser:', auth.currentUser);

  const loadingScreen = document.getElementById('auth-loading');
  if (loadingScreen) loadingScreen.style.display = 'none';

  if (user) {
    console.log('User confirmed, unsubscribing and initializing dashboard');
    unsubscribeAuth();
    initializeDashboard(user.uid);
  } else {
    console.log('No user found, redirecting to index');
    unsubscribeAuth();
    window.location.href = 'index.html';
  }
});