import { CGFappearance, CGFcamera, CGFcameraOrtho } from "../lib/CGF.js";

/**
 * Converts degrees to radians
 * @param {float} degrees
 * @returns {float} radians
 */
export function degreeToRad(degrees) {
    return degrees * Math.PI / 180;
}

/**
 * Calculates the unit vector of the given vector
 * @param {list} vector to normalize
 * @returns {list} normalized vector
 */
export function normalizeVector(vector) {
    const norm = calculateNorm(vector);

    // Normalized is v divided by norm
    const normalized = [];
    for (const v of vector) {
        normalized.push(v / norm);
    }

    return normalized;
}

/**
 * Calculates the cross product between two vectors
 * @param {list} a
 * @param {list} b
 * @returns {list} cross product
 */
export function crossProduct([a1, a2, a3], [b1, b2, b3]) {
    return [a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1];
}

/**
 * Subtracts v2 to v1
 * @param {list} v1
 * @param {list} v2
 * @returns {list} v1-v2
 */
export function subtractVectors(v1, v2) {
    if (v1 == null || v2 == null || v1.length != v2.length) {
        console.log('Subtracting invalid vectors.');
        return null;
    }

    const res = [...v1]; // copy v1

    // subtract by v2 element wise
    for (let i = 0; i < v1.length; i++) {
        res[i] -= v2[i];
    }

    return res;
}

/**
 * Calculates the norm of a vector
 * @param {list} vector
 * @returns {float} norm
 */
export function calculateNorm(vector) {
    let sumSquared = 0;
    for (const v of vector) {
        sumSquared += v * v;
    }

    return Math.sqrt(sumSquared);
}

/**
 * Calculates the distance between two points
 * @param {list} v1
 * @param {list} v2
 * @returns {float} distance
 */
export function calculateDistance(v1, v2) {
    return calculateNorm(subtractVectors(v1, v2));
}

/**
 * Calculates texture coords from base coordinates according to length_s and length_t
 * @param {list} textureCoords
 * @param {float} lengthS
 * @param {float} lengthT
 * @returns {list} textureCoords
 */
export function applyLengthsToTextureCoords(textureCoords, lengthS, lengthT) {
    const textureCoordsCopy = [...textureCoords];

    // Divide by length_s and length_y accordingly
    for (let i = 0; i < textureCoords.length; i += 2) {
        textureCoordsCopy[i] /= lengthS;
        textureCoordsCopy[i + 1] /= lengthT;
    }

    return textureCoordsCopy;
}

/**
 * Gets an appearance from a material and a texture
 * @param {CGFscene} scene
 * @param {Object} material
 * @param {CGFtexture} texture
 * @returns {CGFappearance} appearance
 */
export function getAppearance(scene, material, texture=null) {
    const appearance = new CGFappearance(scene);
    appearance.setEmission(...material.emission);
    appearance.setAmbient(...material.ambient);
    appearance.setDiffuse(...material.diffuse);
    appearance.setSpecular(...material.specular);
    appearance.setShininess(material.shininess);
    if (texture != null) {
        appearance.setTexture(texture);
    }
    return appearance;
}

/**
 * Checks if 2 arrays are equal
 * @param {list} a
 * @param {list} b
 * @returns {boolean} true if equal, false otherwise
 */
export function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
  
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

/**
 * Checks if array includes an element
 * @param {list} a - array
 * @param {list} el - element
 * @returns {boolean} true if included, false otherwise
 */
export function arraysIncludes(a, el) {
    for (let i = 0; i < a.length; i++) {
        if (arraysEqual(a[i], el)) return true;
    }
    return false;
}

/**
 * Interpolates 2 camera objects. Works for both CGFcamera and CGFcameraOrtho.
 * @param {CGFcamera} o1 - camera 1
 * @param {CGFcamera} o2 - camera 2
 * @param {float} t - interpolation factor (0 <= t <= 1)
 * @returns {CGFcamera|CGFcameraOrtho} interpolated camera
 */
export function interpolateCameras(o1, o2, t) {
    if (o1 instanceof CGFcameraOrtho && o2 instanceof CGFcameraOrtho) {
        const left = interpolate(o1.left, o2.left, t);
        const right = interpolate(o1.right, o2.right, t);
        const bottom = interpolate(o1.bottom, o2.bottom, t);
        const top = interpolate(o1.top, o2.top, t);
        const near = interpolate(o1.near, o2.near, t);
        const far = interpolate(o1.far, o2.far, t);
        const position = interpolate(o1.position, o2.position, t);
        const target = interpolate(o1.target, o2.target, t);
        const up = interpolate(o1._up, o2._up, t);
        return new CGFcameraOrtho(left, right, bottom, top, near, far, position, target, up);

    } else if (o1 instanceof CGFcamera && o2 instanceof CGFcamera) {
        const fov = interpolate(o1.fov, o2.fov, t);
        const near = interpolate(o1.near, o2.near, t);
        const far = interpolate(o1.far, o2.far, t);
        const position = interpolate(o1.position, o2.position, t);
        const target = interpolate(o1.target, o2.target, t);
        const up = interpolate(o1._up, o2._up, t);
        const camera = new CGFcamera(fov, near, far, position, target);
        camera._up = up;
        return camera;

    } else {
        // This is needed to interpolate between perspective and ortho cameras

        function fovToLeftRightTopBottom(fov, distance, aspect=1) {
            const top = distance * Math.tan(fov / 2);
            const bottom = -top;
            const right = top * aspect;
            const left = -right;
            return [left, right, top, bottom];
        }

        function leftRightTopBottomToFov(left, right, top, bottom, distance) {
            const wider = Math.max(top-bottom, right-left) / 2;
            const fov = 2 * Math.atan(wider / distance);
            return fov
        }

        const perspectiveCamera = o1 instanceof CGFcamera ? o1 : o2;
        const orthoCamera = o1 instanceof CGFcameraOrtho ? o1 : o2;

        // Interpolate between perspective and ortho camera
        if (perspectiveCamera === o2) {
            t = 1 - t;
        }

        const near = interpolate(perspectiveCamera.near, orthoCamera.near, t);
        const far = interpolate(perspectiveCamera.far, orthoCamera.far, t);
        const position = interpolate(perspectiveCamera.position, orthoCamera.position, t);
        const target = interpolate(perspectiveCamera.target, orthoCamera.target, t);

        if (t < 0.5) { // result is perspective camera
            const distance = calculateDistance(orthoCamera.position, orthoCamera.target);
            const orthoFov = leftRightTopBottomToFov(orthoCamera.left, orthoCamera.right, orthoCamera.top, orthoCamera.bottom, distance);
            const fov = interpolate(perspectiveCamera.fov, orthoFov, t);
            const up = interpolate(perspectiveCamera._up, orthoCamera._up, t);
            const camera = new CGFcamera(fov, near, far, position, target);
            camera._up = up;

            return camera;

        } else { // result is ortho camera
            const distance = calculateDistance(perspectiveCamera.position, perspectiveCamera.target);
            const [perspectiveLeft, perspectiveRight, perspectiveTop, perspectiveBottom] = fovToLeftRightTopBottom(perspectiveCamera.fov, distance);
            const left = interpolate(perspectiveLeft, orthoCamera.left, t);
            const right = interpolate(perspectiveRight, orthoCamera.right, t);
            const bottom = interpolate(perspectiveBottom, orthoCamera.bottom, t);
            const top = interpolate(perspectiveTop, orthoCamera.top, t);
            return new CGFcameraOrtho(left, right, bottom, top, near, far, position, target, orthoCamera._up);
        }
    }
}

/**
 * Interpolates 2 objects. Works for numbers, arrays, CGFcamera, CGFcameraOrtho and objects.
 * @param {number|Array|CGFcamera|CGFcameraOrtho|Object} o1 - object 1
 * @param {number|Array|CGFcamera|CGFcameraOrtho|Object} o2 - object 2
 * @param {float} t - interpolation factor (0 <= t <= 1)
 * @returns {number|Array|CGFcamera|CGFcameraOrtho|Object} interpolated object
 */
export function interpolate(o1, o2, t) {
    if (typeof o1 === 'number') {
        return o1 + (o2 - o1) * t;
    } else if (Array.isArray(o1)) {
        const o = [];
        for (let i = 0; i < o1.length; i++) {
            o.push(interpolate(o1[i], o2[i], t));
        }
        return o;
    } else if ((o1 instanceof CGFcamera || o1 instanceof CGFcameraOrtho)
            && (o2 instanceof CGFcamera || o2 instanceof CGFcameraOrtho)) {
        return interpolateCameras(o1, o2, t);
    } else if (typeof o1 === 'object') {
        const o = {};
        for (const key in o1) {
            if (o1.hasOwnProperty(key)) {
                o[key] = interpolate(o1[key], o2[key], t);
            }
        }
        return o;
    }
}

/**
 * Formats a given number of seconds into a string of the form mm:ss
 * @param {number} seconds - number of seconds
 * @returns {string} formatted time
 */
export function secondsToFormattedTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secondsLeft = seconds % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${secondsLeft < 10 ? '0' : ''}${secondsLeft}`;
}

/**
 * Formats a given string to have at most maxChars characters, centered.
 * If the string is longer than maxChars, it is truncated and '..' is added at the end.
 * @param {string} text - text to format
 * @param {number} maxChars - maximum number of characters
 * @returns {string} formatted text
 */
export function textToLimitedCentered(text, maxChars) {
    if (text.length == maxChars) {
        return text;
    } else if (text.length < maxChars) {
        const spaces = ' '.repeat((maxChars - text.length) / 2);
        return spaces + text + spaces + ((maxChars - text.length) / 2 % 2 != 0 ? ' ' : '');
    } else {
        return text.substring(0, maxChars - 2) + '..';
    }
}

/**
 * Removes the file extension from a given filename
 * @param {string} filename - filename
 * @returns {string} filename without extension
 */
export function removeFileExtension(filename) {
    return filename.substring(0, filename.lastIndexOf('.'));
}

/**
 * Checks if a given string is empty or contains only white spaces
 * @param {string} text - text to check
 * @returns {boolean} true if the string is empty or contains only white spaces, false otherwise
 */
export function isOnlyWhiteSpaces(text) {
    return text.trim().length == 0;
}
