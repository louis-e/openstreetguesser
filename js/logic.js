let map;
let panorama;
let guessMarker;
let targetMarker;
let allowMarkerSet = true;
let dottedLine;
let sv;
let pointOfOrigin = { lat: 48.137154, lng: 11.576124 };

const winPhrases = [
    "You nailed it!",
    "Perfection!",
    "Spot on!",
    "You're a OpenStreetGuesser pro!",
    "Absolutely accurate!",
    "Expert guesswork!",
    "You're on fire!",
    "Flawless victory!"
];

const closePhrases = [
    "Not bad!",
    "Close call!",
    "Almost there!",
    "Impressively close!",
    "Nearly pinpointed it!",
    "You're getting warmer!"
];

const farAwayPhrases = [
    "Room for improvement",
    "Distant guess!",
    "Keep exploring!",
    "Next time, maybe!",
    "Exploring new horizons!",
    "Try a different approach next time "
];

const veryFarAwayPhrases = [
    "You're exploring a different dimension!",
    "Did you guess from outer space?",
    "Way off the mark!",
    "The world's a big place, keep searching!",
    "Let's call this one a wild exploration!",
    "Woah, what are you searching for?",
];



function adjustLayout() { // Adjust layout on resize
    var map = document.getElementById("map");
    var pano = document.getElementById("pano");

    if (window.innerWidth - (window.innerWidth * 22 / 100) < window.innerHeight) {
        map.style.width = "100%";
        map.style.float = "none";
        pano.style.width = "100%";
        pano.style.float = "none";
        map.style.height = "50%";
        pano.style.height = "50%";
    } else {
        map.style.width = "50%";
        map.style.float = "left";
        pano.style.width = "50%";
        pano.style.float = "left";
        map.style.height = "100%";
        pano.style.height = "100%";
    }
}

function haversineDistance(lat1, lon1, lat2, lon2) { // Calculate kilometer distance between two coordinates
    const R = 6371;
    const dLat = degToRad(lat2 - lat1);
    const dLon = degToRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(degToRad(lat1)) * Math.cos(degToRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in kilometers
    return distance;
}

function degToRad(deg) {
    return deg * (Math.PI / 180);
}

function generateRandomCoordMap() { // Generate random coordinates within map bounds
    const bounds = map.getBounds();
    const northEast = bounds.getNorthEast();
    const southWest = bounds.getSouthWest();

    // Calculate the center of the map bounds
    const centerLat = (northEast.lat() + southWest.lat()) / 2;
    const centerLng = (northEast.lng() + southWest.lng()) / 2;

    // Generate random offsets using a normal distribution
    const latOffset = generateRandomOffset();
    const lngOffset = generateRandomOffset();

    // Apply the offsets to the center coordinates
    const lat = centerLat + latOffset * (northEast.lat() - southWest.lat());
    const lng = centerLng + lngOffset * (northEast.lng() - southWest.lng());

    return { lat: lat, lng: lng };
}

function generateRandomOffset() { // Generate random offset using a normal distribution
    const stdDev = 0.2;
    let offset = 0;

    for (let i = 0; i < 6; i++) {
        offset += Math.random();
    }

    offset -= 3;
    offset *= stdDev;
    return offset;
}

function getCityNameByLatLng(latitude, longitude, callback) { // Get city name by coordinates
    var latlng = new google.maps.LatLng(latitude, longitude);
    var geocoder = new google.maps.Geocoder();

    geocoder.geocode({ location: latlng }, function (results, status) {
        if (status === "OK") {
            if (results[0]) {
                for (var i = 0; i < results[0].address_components.length; i++) {
                    var types = results[0].address_components[i].types;
                    if (types.includes("locality")) {
                        var city = results[0].address_components[i].long_name;
                        callback(city);
                        return;
                    }
                }
                callback(null); // City not found
            } else {
                callback(null); // No results found
            }
        } else {
            callback(null); // Geocoder failed
        }
    });
}

function getCityCornerCoordinates(centerPoint) { // Get city corner coordinates by city center coordinates
    const distanceToFarthestPoint = google.maps.geometry.spherical.computeDistanceBetween(centerPoint, map.getBounds().getNorthEast());
    const cityRadius = Math.round(distanceToFarthestPoint);

    const cityNorthEast = google.maps.geometry.spherical.computeOffset(centerPoint, cityRadius, 45);
    const citySouthWest = google.maps.geometry.spherical.computeOffset(centerPoint, cityRadius, 225);

    return { northEast: cityNorthEast, southWest: citySouthWest };
}

function getCurrentLocation() { // Get current device location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            getCityNameByLatLng(lat, lng, function (city) {
                if (city) {
                    document.getElementById('cityInput').value = city;
                    document.getElementById('validityMarkCheck').style.visibility = 'visible';
                    pointOfOrigin = { lat: lat, lng: lng };
                    resetGame();
                    console.log("Detected City: " + city);
                } else {
                    console.log("City not found");
                }
            });
        });
    } else {
        console.log("Geolocation is not supported by this browser.");
    }
}

function initialize() { // Initialize
    document.getElementById("informationButton").onclick = function () {
        window.open("https://louisdev.de", "_blank");
    };


    const cityInput = document.getElementById('cityInput');
    const autocomplete = new google.maps.places.Autocomplete(cityInput);

    autocomplete.setTypes(['(cities)']);
    autocomplete.addListener('place_changed', () => {
        const selectedPlace = autocomplete.getPlace();
        document.getElementById('validityMarkCheck').style.visibility = selectedPlace ? 'visible' : 'hidden';
        if (selectedPlace) {
            cityInput.value = selectedPlace.name;
            const lat = selectedPlace.geometry.location.lat();
            const lng = selectedPlace.geometry.location.lng();

            console.log('Selected City:', selectedPlace.name);
            pointOfOrigin = { lat: lat, lng: lng };
            resetGame();
        }
    });

    cityInput.addEventListener('keydown', (e) => {
        document.getElementById('validityMarkCheck').style.visibility = 'hidden';
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });


    map = new google.maps.Map(document.getElementById("map"), { // Initialize map
        center: pointOfOrigin,
        zoom: 14,
        streetViewControl: false,
        mapId: 'd4fe02c4af5e4ff6',
        mapTypeId: google.maps.MapTypeId.SATELLITE,
        tilt: 0,
        disableDefaultUI: true
    });

    google.maps.event.addListenerOnce(map, 'idle', function () {
        const coordinates = generateRandomCoordMap();
        sv = new google.maps.StreetViewService();

        panorama = new google.maps.StreetViewPanorama(
            document.getElementById("pano")
        );

        sv.getPanorama({ location: coordinates, radius: 10000 }).then(processSVData);
        panorama.setOptions({
            showRoadLabels: false,
            addressControl: false,
            streetViewControl: false,
            source: google.maps.StreetViewSource.OUTDOOR,
            motionTracking: false,
            motionTrackingControl: false
        });
    });

    $('#introductionModal').modal('show');

    map.addListener("click", (event) => { // Add marker on click
        if (!allowMarkerSet) {
            return;
        }

        const playDropAnimation = !guessMarker;

        if (guessMarker !== null && guessMarker !== undefined) {
            guessMarker.setAnimation(null);
            guessMarker.setMap(null);
        }

        guessMarker = new google.maps.Marker({
            position: event.latLng,
            map,
            title: 'Guess',
            animation: playDropAnimation ? google.maps.Animation.DROP : null,
            draggable: true,
        });
        map.panTo(event.latLng);

        if (playDropAnimation) {
            google.maps.event.addListenerOnce(guessMarker, 'animation_changed', function () {
                guessMarker.setAnimation(google.maps.Animation.BOUNCE);
            });
        }
        if (guessMarker.getAnimation() == null) {
            guessMarker.setAnimation(google.maps.Animation.BOUNCE);
        }
    });
}


function processSVData({ data }) { // Process street view data
    const location = data.location;

    panorama.setPano(location.pano);
    panorama.setPov({
        heading: Math.floor(Math.random() * 360),
        pitch: 0,
    });
    panorama.setVisible(true);
}

function resetGame() { // Reset game
    allowMarkerSet = true;
    if (guessMarker !== null && guessMarker !== undefined) {
        guessMarker.setMap(null);
        guessMarker = null;
    }
    if (dottedLine !== null && dottedLine !== undefined) {
        dottedLine.setMap(null);
        dottedLine = null;
    }
    if (targetMarker !== null && targetMarker !== undefined) {
        targetMarker.setMap(null);
        targetMarker = null;
    }

    map.panTo(pointOfOrigin);
    map.setZoom(14);

    const cornerCoordinates = getCityCornerCoordinates(pointOfOrigin);
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(cornerCoordinates.northEast);
    bounds.extend(cornerCoordinates.southWest);
    map.fitBounds(bounds);
    
    const coordinates = generateRandomCoordMap();
    sv.getPanorama({ location: coordinates, radius: 10000 })
        .then(processSVData)
        .catch((e) =>
            resetGame()
        );;

    document.getElementById("guessBtn").innerHTML = "Guess!";
}

async function guessBtnClick() { // Guess button click
    let resultModalCenterTitle = document.getElementById("resultModalCenterTitle");
    let resultModalCenterText = document.getElementById("resultModalCenterText");

    if (!guessMarker) { // No marker set
        resultModalCenterTitle.innerHTML = "Oops!😮";
        resultModalCenterText.innerHTML = "Set a marker first!";
        $('#resultModalCenter').modal('show');
        return;
    }

    if (!allowMarkerSet) { // Reset game
        resetGame();
        return;
    }

    allowMarkerSet = false;
    guessMarker.setAnimation(null);
    guessMarker.setDraggable(false);
    document.getElementById("guessBtn").innerHTML = "New round";

    // Draw target marker
    if (targetMarker) {
        targetMarker.setMap(null);
    }
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");
    const pinBackground = new PinElement({
        background: "#06d102",
        borderColor: "#199140",
        glyphColor: "#199140",
    });
    targetMarker = new AdvancedMarkerElement({
        position: panorama.getPosition(),
        map,
        title: 'Target',
        content: pinBackground.element,
    });

    // Draw dotted line between markers
    const lineSymbol = {
        path: "M 0,-1 0,1",
        strokeOpacity: 1,
        scale: 4,
    };
    dottedLine = new google.maps.Polyline({
        path: [
            { lat: panorama.getPosition().lat(), lng: panorama.getPosition().lng() },
            { lat: guessMarker.getPosition().lat(), lng: guessMarker.getPosition().lng() },
        ],
        strokeColor: "#c0e2fc",
        strokeOpacity: 0,
        icons: [
            {
                icon: lineSymbol,
                offset: "0",
                repeat: "20px",
            },
        ],
        map: map,
    });

    // Zoom out to have both markers in view
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(panorama.getPosition());
    bounds.extend(guessMarker.getPosition());
    map.fitBounds(bounds);


    const distance = haversineDistance(
        panorama.getPosition().lat(),
        panorama.getPosition().lng(),
        guessMarker.getPosition().lat(),
        guessMarker.getPosition().lng()
    ).toFixed(2);

    resultModalCenterText.innerHTML = "Your guess is " + distance + " km away!";
    if (distance < 0.05) {
        resultModalCenterTitle.innerHTML = winPhrases[Math.floor(Math.random() * winPhrases.length)] + "🤯";
        resultModalCenterText.innerHTML = "Absolutely on point!";
        startConfetti();
        setTimeout(function () { stopConfetti(); }, 4000);
    } else if (distance < 0.12) {
        resultModalCenterTitle.innerHTML = winPhrases[Math.floor(Math.random() * winPhrases.length)] + "🥳";
        startConfetti();
        setTimeout(function () { stopConfetti(); }, 3000);
    } else if (distance < 0.75) {
        resultModalCenterTitle.innerHTML = closePhrases[Math.floor(Math.random() * closePhrases.length)] + "😎";
    } else if (distance > 3.0) {
        resultModalCenterTitle.innerHTML = veryFarAwayPhrases[Math.floor(Math.random() * veryFarAwayPhrases.length)] + "😞";
    } else {
        resultModalCenterTitle.innerHTML = farAwayPhrases[Math.floor(Math.random() * farAwayPhrases.length)] + "😱";
    }

    $('#resultModalCenter').modal('show');
}

function loadGoogleScript() {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${getGoogleMapsApiKey()}&libraries=places&callback=initialize&v=weekly`;
    script.defer = true;
    document.head.appendChild(script);
}

loadGoogleScript();

window.addEventListener("resize", adjustLayout);
window.addEventListener("load", adjustLayout);
window.initialize = initialize;