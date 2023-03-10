import { CGFscene, CGFshader, CGFaxis, CGFcamera, CGFappearance } from '../lib/CGF.js';
import { interpolate, subtractVectors } from './utils.js';
import { MyGame } from './game/MyGame.js';
import { MyMainMenu } from './game/menu/MyMainMenu.js';
import { EventAnimation } from './animations/EventAnimation.js';
import { CONFIG } from './game/config.js';

/**
 * XMLscene class, representing the scene that is to be rendered.
 */
export class XMLscene extends CGFscene {
    /**
     * @constructor
     * @param {MyInterface} myinterface
     * @param {string} sceneName
     */
    constructor(myinterface, sceneName) {
        super();

        this.interface = myinterface;
        this.sceneName = sceneName;
        this.selectedPickingId = null;
    }

    /**
     * Inits the game/main-menu objects
     * @param {function} playCallBack
     * @param {string} player1Name
     * @param {string} player2Name
     */
    initGame(playCallBack=(scenarioFileName, player1Name, player2Name) => {}, player1Name, player2Name) {
        this.mainMenu = null;
        this.game = null;
        if (this.sceneName == CONFIG.menu) {
            this.mainMenu = new MyMainMenu(this, this.selectTextBox.bind(this), playCallBack, this.interface);
        } else {
            this.game = new MyGame(this, playCallBack, player1Name, player2Name);
        }
    }

    /**
     * Selects a text box to write on
     * @param {function} writeCallBack - callback to be called when text is written
     * @param {number} pickId - picking id of the text box
     */
    selectTextBox(writeCallBack, pickId) {
        this.selectedPickingId = pickId;
        this.interface.onClickText(writeCallBack);
    }

    /**
     * Removes the selection of a text box, if any is selected
     */
    removeSelectedTextBox() {
        this.selectedPickingId = null;
        this.interface.removeOnClickTextIfAny();
    }

    /**
     * Initializes the scene, setting some WebGL defaults, initializing the camera and the axis.
     * @param {CGFApplication} application
     */
    init(application) {
        super.init(application);

        // interface variables
        this.selectedView = 0;
        this.light0 = false;
        this.light1 = false;
        this.light2 = false;
        this.light3 = false;
        this.light4 = false;
        this.light5 = false;
        this.light6 = false;
        this.lightsCount = 0;

        this.displayAxis = false;

        this.appearanceStack = [];
        this.fallbackMaterial = {
            shininess: 10,
            emission: [0.0, 0.0, 0.0, 1.0],
            ambient: [0.8, 0.8, 0.8, 1.0],
            diffuse: [1.0, 1.0, 1.0, 1.0],
            specular: [0.0, 0.0, 0.0, 1.0],
        };
        this.fallbackMaterialAppearance = new CGFappearance(this);
        this.fallbackMaterialAppearance.setEmission(...this.fallbackMaterial.emission);
        this.fallbackMaterialAppearance.setAmbient(...this.fallbackMaterial.ambient);
        this.fallbackMaterialAppearance.setDiffuse(...this.fallbackMaterial.diffuse);
        this.fallbackMaterialAppearance.setSpecular(...this.fallbackMaterial.specular);
        this.fallbackMaterialAppearance.setShininess(this.fallbackMaterial.shininess);

        this.highlightShader = new CGFshader(this.gl, "shaders/highlight.vert", "shaders/highlight.frag");
        this.isHighlightActive = false;
        this.highlightColor = [0.0, 0.0, 0.0, 1.0];
        this.highlightScale = 1.0;

        this.sceneInited = false;

        this.initCameras();

        this.enableTextures(true);

        this.gl.clearDepth(100.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.depthFunc(this.gl.LEQUAL);

        this.axis = new CGFaxis(this);

        // set the update call every 30ms
        this.setUpdatePeriod(30);
        this.startTime = null;

        this.eventAnimations = new Set();

        this.setPickEnabled(true);
    }

    /**
     * Initializes the fallback scene camera when scene file did not correctly declare any.
     */
    initCameras() {
        this.camera = new CGFcamera(
            0.4,
            0.1,
            500,
            vec3.fromValues(30, 30, 30),
            vec3.fromValues(0, 0, 0)
        );
    }

    /**
     * Changes the camera that is currently active.
     * @param {CGFcamera} cameraToSet
     */
    setCamera(cameraToSet) {
        const prevCamera = this.camera;
        const cameraAnimation = new EventAnimation(this, 1);

        cameraAnimation.onEnd(() => {
            this.camera = interpolate(prevCamera, cameraToSet, 1.0)
            if (this.interface) this.interface.setActiveCamera(this.camera);
        });

        cameraAnimation.onUpdate((t) => {
            const interpolatedCamera = interpolate(prevCamera, cameraToSet, t);
            this.camera = interpolatedCamera;
            if (this.interface) this.interface.setActiveCamera(this.camera);
        });

        cameraAnimation.start(this.currentTime ?? 0);
    }

    /**
     * Updates lights according to whether they should be enabled or disabled.
     */
    updateLights() {
        let i = 0;
        for (const _ in this.graph.lights) {
            if (i >= 8) {
                break;
            }

            if (this['light' + i]) {
                this.lights[i].enable();
            } else {
                this.lights[i].disable();
            }
            this.lights[i].update();
            i++;
        }
    }

    /**
     * Updates the spotlight position to the given coordinates.
     * @param {number} x the x coordinate
     * @param {number} z the z coordinate
     */
    setGameSpotlightPosition(x, z) {
        this.lights[7].setPosition(x, 3, z, 1);
    }

    /**
     * Updates the spotlight ON/OFF state.
     * @param {boolean} on whether the spotlight should be on or off
     */
    updateGameSpotlight(on) {
        if (on) {
            this.lights[7].enable();
        } else {
            this.lights[7].disable();
        }
        this.lights[7].update();
    }

    /**
     * Updates the highlighted state of the given component.
     * @param {MyComponent} component the component to update
     * @param {String} checkboxVariableName the name of the variable that controls the checkbox state
     */
    updateHighlights(highlightableComponent, checkboxVariableName) {
        if (this[checkboxVariableName]) {
            highlightableComponent.setHighlighted(true);
        } else {
            highlightableComponent.setHighlighted(false);
        }
    }

    /**
     * Initializes the scene lights with the values read from the XML file.
     */
    initLights() {
        // Reads the lights from the scene graph.
        for (const key in this.graph.lights) {
            if (this.lightsCount >= 7) {
                // Only eight lights allowed by WebGL. One is reserved for the game.
                console.warn(
                    'Warning: more than 7 lights defined in the scene. Only the first 7 will be used.'
                );
                break;
            }

            if (this.graph.lights.hasOwnProperty(key)) {
                const light = this.graph.lights[key];

                this.lights[this.lightsCount].setPosition(
                    light[2][0],
                    light[2][1],
                    light[2][2],
                    light[2][3]
                );
                this.lights[this.lightsCount].setAmbient(
                    light[3][0],
                    light[3][1],
                    light[3][2],
                    light[3][3]
                );
                this.lights[this.lightsCount].setDiffuse(
                    light[4][0],
                    light[4][1],
                    light[4][2],
                    light[4][3]
                );
                this.lights[this.lightsCount].setSpecular(
                    light[5][0],
                    light[5][1],
                    light[5][2],
                    light[5][3]
                );
                this.lights[this.lightsCount].setConstantAttenuation(light[6][0]);
                this.lights[this.lightsCount].setLinearAttenuation(light[6][1]);
                this.lights[this.lightsCount].setQuadraticAttenuation(light[6][2]);

                if (light[1] == 'spot') {
                    this.lights[this.lightsCount].setSpotCutOff(light[7]);
                    this.lights[this.lightsCount].setSpotExponent(light[8]);

                    const dir = subtractVectors(light[9], light[2].slice(0, 3));
                    this.lights[this.lightsCount].setSpotDirection(...dir);
                }

                if (light[0]) {
                    this.lights[this.lightsCount].enable();
                    this['light' + this.lightsCount] = true;
                } else {
                    this.lights[this.lightsCount].disable();
                }

                this.lights[this.lightsCount].update();

                this.lightsCount++;
            }
        }

        // Initialize game spotlight
        this.lights[7].setPosition(0, 3, 0, 1);
        this.lights[7].setAmbient(0, 0, 0, 1);
        this.lights[7].setDiffuse(1, 1, 1, 1);
        this.lights[7].setSpecular(1, 1, 1, 1);
        this.lights[7].setConstantAttenuation(1);
        this.lights[7].setLinearAttenuation(0);
        this.lights[7].setQuadraticAttenuation(0);

        this.lights[7].setSpotCutOff(0.5);
        this.lights[7].setSpotExponent(150);
        this.lights[7].setSpotDirection(0, -3, 0);

        this.lights[7].disable();
        this.lights[7].update();
    }

    /**
     * Sets the fallback default appearance.
     */
    setDefaultAppearance() {
        this.setAmbient(0.2, 0.4, 0.8, 1.0);
        this.setDiffuse(0.2, 0.4, 0.8, 1.0);
        this.setSpecular(0.2, 0.4, 0.8, 1.0);
        this.setShininess(10.0);
    }

    /** Handler called when the graph is finally loaded.
     * As loading is asynchronous, this may be called already after the application has started the run loop
     */
    onGraphLoaded() {
        this.axis = new CGFaxis(this, this.graph.referenceLength);

        this.gl.clearColor(
            this.graph.background[0],
            this.graph.background[1],
            this.graph.background[2],
            this.graph.background[3]
        );

        this.setGlobalAmbientLight(
            this.graph.ambient[0],
            this.graph.ambient[1],
            this.graph.ambient[2],
            this.graph.ambient[3]
        );

        this.initLights();

        // Interface controls and key bindings
        // Cameras
        this.interface.gui
            .add(this, 'selectedView', this.graph.cameraIds)
            .name('Selected Camera')
            .onChange(() =>
                this.setCamera(this.graph.cameras[this.selectedView])
            );
        // Lights
        let i = 0;
        const lightsFolder = this.interface.gui.addFolder('Lights');
        for (const lightId in this.graph.lights) {
            lightsFolder
                .add(this, 'light' + i)
                .name(lightId)
                .onChange(() => this.updateLights());
            i++;
        }
        // Materials
        this.interface.onClick('KeyM', () => this.toggleMaterial());
        // Highlights
        i = 0;
        const highlightsFolder = this.interface.gui.addFolder('Highlights');
        for (const highlightableComponent of this.graph.getHighlightableComponents()) {
            const checkboxVariableName = 'highlight' + i;
            this[checkboxVariableName] = false;
            highlightsFolder
                .add(this, checkboxVariableName)
                .name(highlightableComponent.id)
                .onChange(() => this.updateHighlights(highlightableComponent, checkboxVariableName));
            i++;
        }

        // Axis
        this.interface.gui
            .add(this, 'displayAxis')
            .name('Display Axis');

        this.sceneInited = true;
    }

    /**
     * Activates or deactivates the highlight shader.
     * @param {Boolean} activateHighlight Whether to activate or deactivate the highlight
     * @param highlightColor The color of the highlight
     * @param highlightScale The max scale factor of the highlight
     */
    toggleHighlightShader(activateHighlight, highlightColor, highlightScale) {
        // For efficiency purposes this function is a no-op if the the active state
        // is the same as the one that is being requested.
        if (activateHighlight != this.isHighlightActive) {
            this.isHighlightActive = activateHighlight;
            if (activateHighlight) {
                this.setActiveShader(this.highlightShader);
            } else {
                this.setActiveShader(this.defaultShader);
            }

            // Apply the material on the new shader
            this.appearanceStack[this.appearanceStack.length - 1].appearance.apply();
        }

        if (activateHighlight) {
            this.highlightColor = highlightColor;
            this.highlightScale = highlightScale;
            this.highlightShader.setUniformsValues({
                highlightColor: this.highlightColor,
                highlightScale: this.highlightScale
            });
        }
    }

    /**
     * Toggles the material of every component in the scene graph.
     */
    toggleMaterial() {
        for (const componentId of this.graph.componentsIds) {
            this.graph.components[componentId].toggleMaterial();
        }
    }

    /**
     * Adds an appearance to the appearance stack and applies it.
     * @param material the material properties.
     * May be the string "inherit" or an object with shininess, emission, ambient, diffuse and specular properties.
     * @param texture the texture to be applied. May be a CGFtexture object, the string "inherit" or the string "none".
     */
    pushAppearance(material, texture) {
        const newAppearance = new CGFappearance(this);
        if (material == null) {
            material = 'inherit';
        }
        if (texture == null) {
            texture = 'none';
        }
        if (material == 'inherit') {
            if (this.appearanceStack.length > 0) {
                // Inherit means the material is the same as the previous one in the stack.
                material = this.appearanceStack[this.appearanceStack.length - 1].material;
            } else {
                // No previous material, so fallback to a default one.
                material = this.fallbackMaterial;
            }
        }
        if (texture == 'inherit') {
            if (this.appearanceStack.length > 0) {
                // Inherit means the texture is the same as the previous one in the stack.
                texture = this.appearanceStack[this.appearanceStack.length - 1].texture;
            } else {
                // If the stack is empty, inherit no texture.
                texture = 'none';
            }
        }

        newAppearance.setEmission(...material.emission);
        newAppearance.setAmbient(...material.ambient);
        newAppearance.setDiffuse(...material.diffuse);
        newAppearance.setSpecular(...material.specular);
        newAppearance.setShininess(material.shininess);

        // Add texture unless its none.
        if (texture != 'none') {
            newAppearance.setTexture(texture);
            newAppearance.setTextureWrap('REPEAT', 'REPEAT');
        }

        // Apply appearance.
        newAppearance.apply();

        // Push appearance and its properties to stack, since it may need to be reused.
        this.appearanceStack.push({
            material: material,
            texture: texture,
            appearance: newAppearance,
        });
    }

    /**
     * Removes an appearance from the appearance stack and applies the previous one if there is any.
     */
    popAppearance() {
        if (this.appearanceStack.length == 0) {
            console.error('Error: No appearance in stack.');
            return;
        }
        this.appearanceStack.pop();
        if (this.appearanceStack.length > 0) {
            this.appearanceStack[this.appearanceStack.length - 1].appearance.apply();
        }
    }

    /**
     * Checks if there were any picked objects and calls their onClick method.
     */
    checkPicking() {
        if (this.pickMode == false) {
            // results can only be retrieved when picking mode is false
            if (this.pickResults != null && this.pickResults.length > 0) {
                this.removeSelectedTextBox();

                for (let i = 0; i < this.pickResults.length; i++) {
                    let obj = this.pickResults[i][0];
                    if (obj) {
                        obj.onClick(this.pickResults[i][1]);
                    }
                }
                this.pickResults.splice(0, this.pickResults.length);
            }
        }
    }

    /**
     * Adds a new event animation to the scene.
     * @param {EventAnimation} eventAnimation The event animation to be added.
     */
    animate(eventAnimation) {
        this.eventAnimations.add(eventAnimation);
    }

    /**
     * Removes an event animation from the scene.
     * @param {EventAnimation} eventAnimation The event animation to be removed.
     */
    removeAnimation(eventAnimation) {
        this.eventAnimations.delete(eventAnimation);
    }

    /**
     * Displays the scene.
     */
    display() {
        this.checkPicking();
        this.clearPickRegistration();

        // ---- BEGIN Background, camera and axis setup

        // Clear image and depth buffer everytime we update the scene
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        // Initialize Model-View matrix as identity (no transformation
        this.updateProjectionMatrix();
        this.loadIdentity();

        // Apply transformations corresponding to the camera position relative to the origin
        this.applyViewMatrix();

        this.pushMatrix();
        this.toggleHighlightShader(false);
        this.fallbackMaterialAppearance.apply();
        if (this.displayAxis) {
            this.axis.display();
        }

        for (let i = 0; i < this.lightsCount; i++) {
            this.lights[i].setVisible(true);
            this.lights[i].update();
        }

        this.lights[7].setVisible(false);
        this.lights[7].update();

        if (this.sceneInited) {
            // Display game or menu depending on the current state.
            if (this.game !== null) {
                this.game.display(this.pickMode);
            } else if (this.mainMenu !== null) {
                this.mainMenu.display(this.pickMode);
            }

            // Displays the scene (MySceneGraph function).
            this.registerForPick(-1, null); // Disable picking for the scene graph.
            this.graph.displayScene();
        }

        this.popMatrix();
        // ---- END Background, camera and axis setup
    }

    /**
     * Updates shader and scene graph animations.
     * 
     * @param t updated time
     */
    update(t) {
        if (this.sceneInited) {
            if (this.startTime === null) {
                this.startTime = t;
            }

            this.currentTime = t;

            this.highlightShader.setUniformsValues({
                timeFactor: Math.cos(t * 0.0035) / 2 + 0.5,
                highlightColor: this.highlightColor,
                highlightScale: this.highlightScale
            });

            // traverse scene graph and, for nodes having animation,
            // compute the animation matrix
            this.graph.update(t);
            
            if (this.game !== null) {
                this.game.update(t);
            }

            this.eventAnimations.forEach((eventAnimation) => eventAnimation.update(t));
        }
    }
}
