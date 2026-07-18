const map = L.map("map");
map.setView([0,0], 15);

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: "© OpenStreetMap & CartoDB contributors",
}).addTo(map);

var myIcon = L.icon({
    iconUrl: 'Icons_and_Backgrounds/service_icon.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
});

const marker = L.marker([0,0], {icon: myIcon}).addTo(map);
marker.bindTooltip("Driver 1");

function findLocation(){
    if(navigator.geolocation){
        navigator.geolocation.watchPosition(
            (position) =>{
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;

                marker.setLatLng([userLat, userLng]);
                map.setView([userLat, userLng], 15);
        },
        (error) =>{
            console.error(`Geolocation error: ${error.message}`);
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000,
        }
        );
    } else{
        console.error("Geolocation is not supported by this browser.");
    }
}

findLocation();