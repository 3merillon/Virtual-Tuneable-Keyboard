/*
Copyright 2024, Cyril Monkewitz
This file is part of "Virtual Tuneable Keyboard (VTK)".
VTK is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
VTK is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
You should have received a copy of the GNU General Public License along with Foobar. If not, see <https://www.gnu.org/licenses/>.
*/
class KeyboardApp {
    constructor() {
        this.canvas = document.getElementById('keyboard');
        this.clean = document.getElementById('clean');
        this.canvas_mask = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx_mask = this.canvas_mask.getContext('2d', { willReadFrequently: true });
        this.currentTouches = [];
        this.currentClicks = [];
        this.bF = 442;
        this.keyFunctions = this.generateKeyFunctionsEqualTemperament();
		
		this.equalTemperament = document.getElementById('equalTemperament');this.equalTemperament.style.backgroundColor = '#788594';
		this.PythagoreanTemperament = document.getElementById('PythagoreanTemperament');
		this.ChopinTemperament = document.getElementById('ChopinTemperament');
		
        this.BaseVolume = 0.025;
        this.keyboard_img = new Image();
        this.keyboard_mask = new Image();
        this.imgFlag1 = false;
        this.imgFlag2 = false;
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.audio_flag = false;
		this.oscillatorType = 'sine';
        this.init();
    }
	
	generateKeyFunctionsEqualTemperament() {
        return Array.from({ length: 16 }, (_, i) => Math.pow(2, i / 12));
    }

    generateKeyFunctionsPythagoreanTemperament() {
        const ratios = [1, 256/243, 9/8, 32/27, 81/64, 4/3, Math.sqrt(2), 3/2, 128/81, 27/16, 16/9, 243/128];
        return [...ratios, ...ratios.map(ratio => ratio * 2)];
    }

    generateKeyFunctionsChopinTemperament() {
		const ratios = [1, 16/15, 9/8, 6/5, 81/64, 4/3, 64/45, 3/2, 8/5, 27/16, 9/5, Math.sqrt(2)*3/Math.sqrt(5)]; //a minor centered //const ratios = [1, 135/128, 10/9, 32/27, 5/4, 4/3, 45/32, 3/2, Math.sqrt(5)/Math.sqrt(2), 5/3, 16/9, 15/8]; // A major centered
        return [...ratios, ...ratios.map(ratio => ratio * 2)];
    }

    randomColor() {
        return "#" + Math.floor(Math.random() * 16777215).toString(16);
    }

    findCurrentTouchIndex(id) {
        return this.currentTouches.findIndex(touch => touch.id === id);
    }

    findCurrentClickIndex(id) {
        return this.currentClicks.findIndex(click => click.id === id);
    }

    startKey(arrayKey) {
        let pageX = arrayKey.pageX;
        let pageY = arrayKey.pageY;
        let pixel = this.ctx_mask.getImageData(pageX, pageY, 1, 1).data;
        let keyIndex = pixel[0] > 0 ? (pixel[0] - 100) / 10 : -1;
        let Frequency = keyIndex >= 0 ? this.bF * this.keyFunctions[keyIndex] : 0;
        arrayKey.A_A_oscillator = this.audioCtx.createOscillator();
        arrayKey.gainNode = this.audioCtx.createGain();
        arrayKey.A_A_oscillator.type = this.oscillatorType;
        arrayKey.A_A_oscillator.frequency.value = Frequency;
        arrayKey.gainNode.gain.value = 0;
        arrayKey.A_A_oscillator.connect(arrayKey.gainNode);
        arrayKey.gainNode.connect(this.audioCtx.destination);
        arrayKey.gainNode.gain.setValueAtTime(0.00001, this.audioCtx.currentTime);
        arrayKey.gainNode.gain.linearRampToValueAtTime(this.BaseVolume, this.audioCtx.currentTime + 0.01);
        arrayKey.A_A_oscillator.start(this.audioCtx.currentTime);
    }

    checkKey(arrayKey) {
        let pageX = arrayKey.pageX;
        let pageY = arrayKey.pageY;
        let pixel = this.ctx_mask.getImageData(pageX, pageY, 1, 1).data;
        let keyIndex = pixel[0] > 0 ? (pixel[0] - 100) / 10 : -1;
        let Frequency = keyIndex >= 0 ? this.bF * this.keyFunctions[keyIndex] : 0;
        if (Frequency !== arrayKey.A_A_oscillator.frequency.value && Frequency !== 0) {
            arrayKey.A_A_oscillator.frequency.setValueAtTime(arrayKey.A_A_oscillator.frequency.value, this.audioCtx.currentTime);
            arrayKey.A_A_oscillator.frequency.linearRampToValueAtTime(Frequency, this.audioCtx.currentTime + 0.01);
        }
    }

    endKey(arrayKey) {
        arrayKey.gainNode.gain.setValueAtTime(this.BaseVolume, this.audioCtx.currentTime);
        arrayKey.gainNode.gain.exponentialRampToValueAtTime(0.00001, this.audioCtx.currentTime + 0.5);
        arrayKey.A_A_oscillator.stop(this.audioCtx.currentTime + 0.5);
    }

    touchAction(event, action) {
        event.preventDefault();
        if (!this.audio_flag) this.unlock();
        let touches = Array.from(event.changedTouches) || [event];
        touches.forEach(touch => {
            let rect = this.canvas.getBoundingClientRect();
            let scaleX = this.canvas.width / rect.width;
            let scaleY = this.canvas.height / rect.height;
            let touchX = (touch.clientX - rect.left) * scaleX;
            let touchY = (touch.clientY - rect.top) * scaleY;
            let touchObj = {
                id: touch.identifier,
                pageX: touchX,
                pageY: touchY,
                color: this.randomColor(),
            };
            if (action === 'start') {
                this.currentTouches.push(touchObj);
                this.startKey(touchObj);
            } else if (action === 'move') {
                let index = this.findCurrentTouchIndex(touch.identifier);
                if (index !== -1) {
                    let currentTouch = this.currentTouches[index];
                    this.ctx.beginPath();
                    this.ctx.moveTo(currentTouch.pageX, currentTouch.pageY);
                    this.ctx.lineTo(touchX, touchY);
                    this.ctx.lineWidth = 4;
                    this.ctx.strokeStyle = currentTouch.color;
                    this.ctx.stroke();
                    currentTouch.pageX = touchX;
                    currentTouch.pageY = touchY;
                    this.checkKey(currentTouch);
                    this.currentTouches[index] = currentTouch;
                }
            } else if (action === 'end' || action === 'cancel') {
                let index = this.findCurrentTouchIndex(touch.identifier);
                if (index !== -1) {
                    this.endKey(this.currentTouches[index]);
                    this.currentTouches.splice(index, 1);
                }
            }
        });
    }

    mouseAction(event, action) {
        event.preventDefault();
        if (!this.audio_flag) this.unlock();
        let rect = this.canvas.getBoundingClientRect();
        let scaleX = this.canvas.width / rect.width;
        let scaleY = this.canvas.height / rect.height;
        let mouseX = (event.clientX - rect.left) * scaleX;
        let mouseY = (event.clientY - rect.top) * scaleY;
        let clickObj = {
            id: event.identifier,
            pageX: mouseX,
            pageY: mouseY,
            color: this.randomColor(),
        };
        if (action === 'down') {
            this.currentClicks.push(clickObj);
            this.startKey(clickObj);
        } else if (action === 'move') {
            let index = this.findCurrentClickIndex(event.identifier);
            if (index !== -1) {
                let currentClick = this.currentClicks[index];
                this.ctx.beginPath();
                this.ctx.moveTo(currentClick.pageX, currentClick.pageY);
                this.ctx.lineTo(mouseX, mouseY);
                this.ctx.lineWidth = 4;
                this.ctx.strokeStyle = currentClick.color;
                this.ctx.stroke();
                currentClick.pageX = mouseX;
                currentClick.pageY = mouseY;
                this.checkKey(currentClick);
                this.currentClicks[index] = currentClick;
            }
        } else if (action === 'up' || action === 'leave') {
            let index = this.findCurrentClickIndex(event.identifier);
            if (index !== -1) {
                this.endKey(this.currentClicks[index]);
                this.currentClicks.splice(index, 1);
            }
        }
    }

    unlock() {
        let buffer = this.audioCtx.createBuffer(1, 1, 22050);
        let source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioCtx.destination);
        if (source.start) {
            source.start(0);
        } else {
            source.noteOn(0);
        }
        setTimeout(() => {
            if ((source.playbackState === source.PLAYING_STATE || source.playbackState === source.FINISHED_STATE)) {
                this.audio_flag = true;
            }
        }, 0);
    }

    resizeCanvas() {
        let rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.canvas_mask.width = rect.width;
        this.canvas_mask.height = rect.height;
        if (this.imgFlag1) {
            let heightRatio = this.canvas.width * 223 / 336;
            this.ctx.drawImage(this.keyboard_img, 0, this.canvas.height - heightRatio, this.canvas.width, heightRatio);
        }
        if (this.imgFlag2) {
            let heightRatio = this.canvas_mask.width * 223 / 336;
            this.ctx_mask.imageSmoothingEnabled = false;
            this.ctx_mask.drawImage(this.keyboard_mask, 0, this.canvas_mask.height - heightRatio, this.canvas_mask.width, heightRatio);
        }
    }
	
	changeTemperament(temperament,handle) {
		this.keyFunctions = temperament;
		if(handle==='Equal'){this.equalTemperament.style.backgroundColor = '#788594';}else{this.equalTemperament.style.backgroundColor = '#315e94';}
		if(handle==='Pythagorean'){this.PythagoreanTemperament.style.backgroundColor = '#788594';}else{this.PythagoreanTemperament.style.backgroundColor = '#315e94';}
		if(handle==='Chopin'){this.ChopinTemperament.style.backgroundColor = '#788594';}else{this.ChopinTemperament.style.backgroundColor = '#315e94';}
	}

    setupEventListeners() {
        this.canvas.addEventListener('touchstart', e => this.touchAction(e, 'start'));
        this.canvas.addEventListener('touchmove', e => this.touchAction(e, 'move'));
        this.canvas.addEventListener('touchend', e => this.touchAction(e, 'end'));
        this.canvas.addEventListener('touchleave', e => this.touchAction(e, 'leave'));
        this.canvas.addEventListener('touchcancel', e => this.touchAction(e, 'cancel'));
        this.canvas.addEventListener('mousedown', e => this.mouseAction(e, 'down'));
        this.canvas.addEventListener('mousemove', e => this.mouseAction(e, 'move'));
        this.canvas.addEventListener('mouseup', e => this.mouseAction(e, 'up'));
        this.canvas.addEventListener('mouseleave', e => this.mouseAction(e, 'leave'));
        this.clean.addEventListener('touch', e => this.resizeCanvas());
        this.clean.addEventListener('click', e => this.resizeCanvas());
		this.equalTemperament.addEventListener('touch', e => this.changeTemperament(this.generateKeyFunctionsEqualTemperament(),'Equal'));
        this.equalTemperament.addEventListener('click', e => this.changeTemperament(this.generateKeyFunctionsEqualTemperament(),'Equal'));
		this.PythagoreanTemperament.addEventListener('touch', e => this.changeTemperament(this.generateKeyFunctionsPythagoreanTemperament(),'Pythagorean'));
        this.PythagoreanTemperament.addEventListener('click', e => this.changeTemperament(this.generateKeyFunctionsPythagoreanTemperament(),'Pythagorean'));
		this.ChopinTemperament.addEventListener('touch', e => this.changeTemperament(this.generateKeyFunctionsChopinTemperament(),'Chopin'));
        this.ChopinTemperament.addEventListener('click', e => this.changeTemperament(this.generateKeyFunctionsChopinTemperament(),'Chopin'));
        window.onresize = () => this.resizeCanvas();
    }

    loadImage() {
        this.keyboard_img.onload = () => {
            this.imgFlag1 = true;
            this.resizeCanvas();
        };
        this.keyboard_mask.onload = () => {
            this.imgFlag2 = true;
            this.resizeCanvas();
        };
        this.keyboard_img.src = "KEYBOARD.png";
        this.keyboard_mask.src = "KEYBOARD-mask.png";
    }

    init() {
        this.canvas.width = window.outerWidth;
        this.canvas.height = window.outerHeight;
        this.canvas_mask.width = window.outerWidth;
        this.canvas_mask.height = window.outerHeight;
        this.setupEventListeners();
        this.loadImage();
    }
}

new KeyboardApp();