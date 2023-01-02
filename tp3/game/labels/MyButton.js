import { EventAnimation } from '../../animations/EventAnimation.js';
import { CGFobject, CGFtexture, CGFshader } from '../../../lib/CGF.js';
import { MyBox } from '../../MyBox.js';
import { MyRectangle } from '../../MyRectangle.js';
import { quadMin } from '../../animations/EasingFunctions.js';
import { getAppearance } from '../../utils.js';

export class MyButton extends CGFobject {
    static WIDTH = 1.0
    static HEIGHT = 1.0
    static DEPTH = 0.2

    MIN_RATIO_DEPTH = 0.5;
    static TEXTURE_PATH = "scenes/images/game/wood.jpg";
    static DEFAULT_MATERIAL = {
        shininess: 0,
        emission: [0.25, 0.1, 0.1, 1.0],
        ambient: [0.25, 0.2, 0.2, 1.0],
        diffuse: [0.45, 0.4, 0.4, 1.0],
        specular: [0.35, 0.3, 0.3, 1.0],
    };

    constructor(scene, pickingId, commandCallBack=null, iconPath=null, iconColor=[1,1,1,1], material=MyButton.DEFAULT_MATERIAL, texturePath=MyButton.TEXTURE_PATH) {
        super(scene);

        this.pickingId = pickingId;
        this.commandCallBack = commandCallBack;
        this.iconColor = iconColor;

        const iconTexture = iconPath ? new CGFtexture(scene, iconPath) : null;
        this.iconAppearance = getAppearance(scene, material, iconTexture);

        const boxTexture = texturePath ? new CGFtexture(scene, texturePath) : null;
        const boxAppearance = getAppearance(scene, material, boxTexture);

        this.box = new MyBox(scene, boxAppearance);
        this.quad = new MyRectangle(scene, -0.5, 0.5, -0.5, 0.5);
        this.currentDepth = MyButton.DEPTH;
    }

    setShaderValues(shader) {
        shader.setUniformsValues({
            dims: [0, 0],
            colorRGBa: this.iconColor
        });
    }

    onClick() {
        const pressAnimation = new EventAnimation(this.scene, 1, quadMin(this.MIN_RATIO_DEPTH));
        let callBackCalled = false;

        pressAnimation.onUpdate((t) => {
            this.currentDepth = MyButton.DEPTH * t;

            if (!callBackCalled && this.commandCallBack && t >= 0.5) {
                callBackCalled = true;
                this.commandCallBack();
            }
        });

        pressAnimation.start(this.scene.currentTime);
    }

    display(displayFont) {
        this.scene.pushMatrix();

        if (displayFont) {
            this.scene.translate(0, 0, this.currentDepth + 0.01);
            this.scene.scale(MyButton.WIDTH*0.8, MyButton.HEIGHT*0.8, 1);
            this.iconAppearance.apply();
            this.quad.display();
        } else {
            this.scene.registerForPick(this.pickingId, this);
            this.scene.translate(0, 0, this.currentDepth / 2);
            this.scene.scale(MyButton.WIDTH, MyButton.HEIGHT, this.currentDepth);
            this.box.display();
            this.scene.registerForPick(-1, null);
        }

        this.scene.popMatrix();
    }
}