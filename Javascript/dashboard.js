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
      initParentDashboard(userId);
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

// Admin Tab Switcher
function switchAdminTab(tab) {
  const driversTab = document.getElementById('admin-drivers-tab');
  const reportsTab = document.getElementById('admin-reports-tab');
  const tabs = document.querySelectorAll('.admin-tab');

  if (tab === 'drivers') {
    driversTab.style.display = 'block';
    reportsTab.style.display = 'none';
    tabs[0].classList.add('active-tab');
    tabs[1].classList.remove('active-tab');
  } else {
    driversTab.style.display = 'none';
    reportsTab.style.display = 'block';
    tabs[0].classList.remove('active-tab');
    tabs[1].classList.add('active-tab');
  }
}

// Driver Dashboard
function initDriverDashboard(userId) {
  console.log('Loading driver dashboard');
  document.getElementById('driver-panel').style.display = 'block';
  document.getElementById('end-trip-button').addEventListener('click', endTrip);
  startDriverTracking(userId);
}

// End Trip (placeholder)
function endTrip() {
  alert('Trip ended!');
  // TODO: implement full Gemini AI trip summary
}
window.switchAdminTab = switchAdminTab;
window.closeTripSummary = function() {
  document.getElementById('trip-summary-modal').style.display = 'none';
};

// Parent Dashboard
async function initParentDashboard(userId) {
  console.log('Loading parent dashboard');
  document.getElementById('parent-panel').style.display = 'block';

  try {
    // Get parent's assigned driver from Firestore
    const parentDoc = await getDoc(doc(db, 'users', userId));
    const parentData = parentDoc.data();
    const assignedDriverId = parentData.assignedDriver; // set this in Firestore

    if (!assignedDriverId) {
      document.getElementById('driver-name').textContent = 'No driver assigned yet';
      return;
    }

    // Get driver info from Firestore
    const driverDoc = await getDoc(doc(db, 'users', assignedDriverId));
    const driverData = driverDoc.data();

    document.getElementById('driver-name').textContent = `Driver: ${driverData.firstName} ${driverData.lastName}`;
    document.getElementById('driver-plate').textContent = `Plate: ${driverData.plateNumber || '—'}`;

    // Watch driver location and update ETA display
    initParentRouting(assignedDriverId);

  } catch (error) {
    console.error('Error loading parent dashboard:', error);
    document.getElementById('driver-name').textContent = 'Error loading driver info';
  }
}

// Admin Dashboard
async function initAdminDashboard() {
  console.log('Loading admin dashboard');
  document.getElementById('admin-panel').style.display = 'block';

  // Load all drivers from Firestore
  loadAllDrivers();

  // Load trip reports
  loadTripReports();
}

// Load All Drivers for Admin
async function loadAllDrivers() {
  try {
    const { getDocs, collection, query, where } = await import(
      "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js"
    );

    const driversQuery = query(
      collection(db, 'users'),
      where('role', '==', 'driver')
    );

    const driversSnapshot = await getDocs(driversQuery);
    const driverList = document.getElementById('driver-list');
    driverList.innerHTML = '';

    driversSnapshot.forEach((driverDoc) => {
      const driver = driverDoc.data();
      const driverId = driverDoc.id;

      // Create list item
      const li = document.createElement('li');
      li.id = `driver-item-${driverId}`;
      li.innerHTML = `
        <span class="driver-status-offline" id="status-${driverId}"></span>
        <strong>${driver.firstName} ${driver.lastName}</strong><br>
        Plate: ${driver.plateNumber || '—'}<br>
        <span id="driver-eta-${driverId}">Status: Offline</span>
      `;
      driverList.appendChild(li);

      // Add driver marker to map
      const driverMarker = L.marker([SCHOOL_LAT, SCHOOL_LNG], {
        icon: myIcon,
        opacity: 0
      }).addTo(map).bindTooltip(`${driver.firstName} ${driver.lastName}`);

      // Listen to this driver's location
      const driverRef = ref(rtdb, `vehicles/${driverId}`);
      onValue(driverRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // Check if data is recent (within last 1 minutes)
        const isOnline = Date.now() - data.timestamp < 60000;
        const statusDot = document.getElementById(`status-${driverId}`);
        const etaSpan = document.getElementById(`driver-eta-${driverId}`);

        if (isOnline) {
          driverMarker.setLatLng([data.lat, data.lng]);
          driverMarker.setOpacity(1);
          statusDot.className = 'driver-status-online';
          etaSpan.textContent = `Status: Active`;
        } else {
          driverMarker.setOpacity(0);
          statusDot.className = 'driver-status-offline';
          etaSpan.textContent = `Status: Offline`;
        }
      });
    });

  } catch (error) {
    console.error('Error loading drivers:', error);
    document.getElementById('driver-list').innerHTML = '<li>Error loading drivers</li>';
  }
}

// Load Trip Reports for Admin
function loadTripReports() {
  const reportsRef = ref(rtdb, 'trip_reports');
  onValue(reportsRef, (snapshot) => {
    const data = snapshot.val();
    const reportsList = document.getElementById('reports-list');
    reportsList.innerHTML = '';

    if (!data) {
      reportsList.innerHTML = '<li>No trip reports yet</li>';
      return;
    }

    // Flatten all reports from all drivers
    const allReports = [];
    Object.entries(data).forEach(([driverId, reports]) => {
      Object.entries(reports).forEach(([reportId, report]) => {
        allReports.push({ ...report, driverId });
      });
    });

    // Sort by most recent first
    allReports.sort((a, b) => b.timestamp - a.timestamp);

    // Display reports
    allReports.forEach((report) => {
      const li = document.createElement('li');
      const date = new Date(report.timestamp).toLocaleDateString();
      const time = new Date(report.startTime).toLocaleTimeString();
      li.innerHTML = `
        <strong>${date} — ${time}</strong><br>
        Duration: ${report.durationMinutes} min<br>
        Distance: ${report.distanceKm} km<br>
        Avg Speed: ${report.avgSpeedKmh} km/h<br>
        Violations: ${report.geofenceViolations}<br>
        <em>${report.aiSummary ? report.aiSummary.substring(0, 100) + '...' : 'No summary'}</em>
      `;
      reportsList.appendChild(li);
    });
  });
}

// Parent Routing with Online/Offline Detection
function initParentRouting(driverId) {
  const driverRef = ref(rtdb, `vehicles/${driverId}`);
  const OFFLINE_THRESHOLD = 60000;
  onValue(driverRef, (snapshot) => {
    const data = snapshot.val();
    const offlineOverlay = document.getElementById('driver-offline-overlay');
    const offlineLastSeen = document.getElementById('offline-last-seen');

    // No data at all — driver has never been online
    if (!data) {
      offlineOverlay.style.display = 'flex';
      offlineLastSeen.textContent = 'Driver has not started a trip yet.';
      document.getElementById('parent-eta-display').textContent = 'ETA: Unavailable';
      return;
    }

    // Check if driver data is recent
    const timeSinceUpdate = Date.now() - data.timestamp;
    const isOnline = timeSinceUpdate < OFFLINE_THRESHOLD;

    if (!isOnline) {
      // Driver is offline/show overlay
      offlineOverlay.style.display = 'flex';
      marker.setOpacity(0);

      // Show last seen time
      const lastSeen = new Date(data.timestamp);
      const minutesAgo = Math.round(timeSinceUpdate / 60000);
      offlineLastSeen.textContent = minutesAgo < 60
        ? `Last seen ${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`
        : `Last seen at ${lastSeen.toLocaleTimeString()}`;

      document.getElementById('parent-eta-display').textContent = 'ETA: Unavailable';

      // Remove route if exists
      if (routingControl) {
        routingControl.remove();
        routingControl = null;
      }

      return;
    }

    // Driver is online/hide overlay and show map
    offlineOverlay.style.display = 'none';
    updateDriverLocation(data.lat, data.lng);

    if (routingControl) {
      routingControl.setWaypoints([
        L.latLng(data.lat, data.lng),
        L.latLng(SCHOOL_LAT, SCHOOL_LNG)
      ]);
    } else {
      routingControl = L.Routing.control({
        waypoints: [
          L.latLng(data.lat, data.lng),
          L.latLng(SCHOOL_LAT, SCHOOL_LNG)
        ],
        router: L.Routing.mapbox(mapboxToken, {
          profile: 'mapbox/driving'
        }),
        routeWhileDragging: false,
        addWaypoints: false,
        show: false,
        fitSelectedRoutes: false
      }).addTo(map);

      routingControl.on('routesfound', (e) => {
        const totalSeconds = e.routes[0].summary.totalTime;
        document.getElementById('parent-eta-display').textContent = `ETA: ${formatETA(totalSeconds)}`;
      });

      routingControl.on('routingerror', () => {
        document.getElementById('parent-eta-display').textContent = 'ETA unavailable';
      });
    }
  });
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