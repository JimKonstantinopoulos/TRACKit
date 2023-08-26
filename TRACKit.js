'use strict';

const form = document.querySelector('.form');
const workoutsContainer = document.querySelector('.workouts');
const inputType = document.querySelector('#form-input--type');
const inputDistance = document.querySelector('#form-input--distance');
const inputDuration = document.querySelector('#form-input--duration');
const inputCadence = document.querySelector('#form-input--cadence');
const inputElevation = document.querySelector('#form-input--elevation');

class Workout{
    #id;
    #date;
    #coords;
    #distance;
    #duration;
    #description;

    constructor(coords, distance, duration){
        this.#date = new Date();
        this.#id = Date.now() + ''.slice(-10);
        this.#coords = coords;
        this.#distance = distance;
        this.#duration = duration;
    }

    get getId(){
        return this.#id;
    }

    get getCoords(){
        return this.#coords;
    }

    get getDistance(){
        return this.#distance;
    }

    get getDuration(){
        return this.#duration;
    }

    get getDate(){
        return this.#date;
    }

    get getType(){
        return this._type;
    }

    _setDescription(){
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.#description = `${this.getType[0].toUpperCase() + this.getType.slice(1)} on ${months[this.#date.getMonth()]} ${this.#date.getDate()}`;
    }

    get getDescription(){
        return this.#description;
    }
};

class Running extends Workout{
    _type = 'running';
    #cadence;
    #pace;

    constructor(coords, distance, duration, cadence){
        super(coords, distance, duration);
        this.#cadence = cadence;
        this.#calcPace();
        this._setDescription();
    }
    
    get getCadence(){
        return this.#cadence;
    }

    get getPace(){
        return this.#pace;
    }

    #calcPace(){
        this.#pace = this.getDuration / this.getDistance;
    }
};

class Cycling extends Workout{
    _type = 'cycling';
    #elevation;
    #speed;

    constructor(coords, distance, duration, elevation){
        super(coords, distance, duration);
        this.#elevation = elevation;
        this.#calcSpeed();
        this._setDescription();
    }

    get getElevation(){
        return this.#elevation;
    }

    get getSpeed(){
        return this.#speed;
    }

    #calcSpeed(){
        this.#speed = this.getDistance / (this.getDuration / 60);
    }
};

class App{
    #map;
    #currentCoords;
    #drawnItems;
    #startingMarker;
    #workouts = [];

    constructor(){
        this.#getCoords();
        form.addEventListener('submit', this.#newWorkout.bind(this));
        inputType.addEventListener('change', this.#toggleElevationField);
        workoutsContainer.addEventListener('click', this.#goToLocation.bind(this));
    }

    #getCoords(){
        if(navigator.geolocation)
            navigator.geolocation.getCurrentPosition(this.#loadMap.bind(this), this.#coordProblem);
    }

    #loadMap(position){
        const {latitude, longitude} = position.coords;
        const coords = [latitude, longitude];
        this.#map = L.map('map').setView(coords, 13);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        this.#initializeDraw();

        // this.#map.on('click', this.#showForm.bind(this));
    }

    #coordProblem(){
        alert('Could not get your position... 😥');
    }
    
    // Initialize the draw control and pass it the FeatureGroup of editable layers
    #initializeDraw(){
        this.#drawnItems = new L.FeatureGroup();
        this.#map.addLayer(this.#drawnItems);
        
        const drawControl = new L.Control.Draw({
          draw: {
            polygon: false,
            marker: true,
            circle: false,
            circlemarker: false,
            rectangle: false
          },
          edit: {
            featureGroup: this.#drawnItems
          }
        });
        this.#map.addControl(drawControl);

        this.#map.on('draw:created', this.#displayPath.bind(this));
    }

    #displayPath(e){
        const layer = e.layer;
        let lat, lng;
        
        if(e.layerType === 'polyline'){
            const latlngs = layer.getLatLngs();
            ({lat, lng} = latlngs[0]);
            this.#currentCoords = [lat, lng];
            var length = 0;
            for (var i = 0; i < latlngs.length - 1; i++) {
                length += latlngs[i].distanceTo(latlngs[i + 1]);
            }
            inputDistance.value = ((Math.ceil(length))/1000).toFixed(2);
            const answer = confirm('Wanna close up your path?');
            if(answer){
                // Close the path by adding the first point at the end
                if (latlngs.length > 0) {
                    latlngs.push(latlngs[0]);
                    layer.setLatLngs(latlngs);
                    this.#startingMarker = this.#createmarker(lat, lng);
                }
            }
            else{
                this.#startingMarker = this.#createmarker(lat, lng);
                ({lat, lng} = latlngs[latlngs.length-1]);
                this.#createmarker(lat, lng);
            }
        }

        else if(e.layerType === 'marker'){
            ({lat, lng} = layer.getLatLng());
            this.#currentCoords = [lat, lng];
            inputDistance.value = '';
            this.#startingMarker = this.#createmarker(lat, lng);
        }

        this.#drawnItems.addLayer(layer);
        this.#showForm();
    }

    #createmarker(lat, lng){
        return L.marker([lat, lng]).addTo(this.#map).bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false
        }));
    }

    #showForm(){
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    #toggleElevationField(){
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    #hideForm(){
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        form.classList.add('hidden');
        form.style.display = 'none';
        setTimeout(() => form.style.display = 'grid', 1000);
    }

    #newWorkout(e){
        e.preventDefault();

        const validInputs = (...inputs) => inputs.every(input => Number.isFinite(input) > 0);
        const positiveInputs = (...inputs) => inputs.every(input => input > 0);

        const type = inputType.value;
        const distance = Number(inputDistance.value);
        const duration = Number(inputDuration.value);
        let workout;
        let typeEmoji;

        if(type === 'running'){
            typeEmoji = '🏃';
            const cadence = Number(inputCadence.value);
            if(!validInputs(distance, duration, cadence) || !positiveInputs(distance, duration, cadence))
                return alert('all should be correct on running');

            workout = new Running(this.#currentCoords, distance, duration, cadence);
        }
    
        if(type === 'cycling'){
            typeEmoji = '🚴';
            const elevation = Number(inputElevation.value);
            if(!validInputs(distance, duration, elevation) || !positiveInputs(distance, duration))
                return alert('all should be correct on cycling');

            workout = new Cycling(this.#currentCoords, distance, duration, elevation);
        }

        this.#workouts.push(workout);
        this.#startingMarker.getPopup().options.className = `${type}-popup`;
        this.#startingMarker.setPopupContent(`${typeEmoji} ${workout.getDescription}`).openPopup();
        console.log(workout.getType);
        this.#renderWorkout(workout);
        this.#hideForm();
    }

    #renderWorkout(workout){
        let html = `
            <li class="list-item workout workout--${workout.getType}" data-id="${workout.getId}">
                <h2 class="workout__title">${workout.getDescription}</h2>
                <div class="workout__details">
                    <span class="workout__icon">${workout.getType === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                    <span class="workout__value">${workout.getDistance}</span>
                    <span class="workout__unit">km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.getDuration}</span>
                    <span class="workout__unit">min</span>
                </div>`;

        if(workout.getType === 'running')
        {
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.getPace.toFixed(1)}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.getCadence}</span>
                    <span class="workout__unit">spm</span>
                </div>
            </li>`;
        }

        else if(workout.getType === 'cycling')
        {
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.getSpeed.toFixed(1)}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.getElevation}</span>
                    <span class="workout__unit">m</span>
                </div>
            </li>`;
        }

        form.insertAdjacentHTML('afterend', html);
    }

    #goToLocation(e){
        const workoutEl = e.target.closest('.workout');
        
        if(!workoutEl) return;

        const currentWorkout = this.#workouts.find(work => work.getId === workoutEl.dataset.id);
        console.log(currentWorkout);

        this.#map.setView(currentWorkout.getCoords, 13, {
            animate: true,
            pan: {
                duration: 0.7
            }
        });
    }
};

const app = new App();