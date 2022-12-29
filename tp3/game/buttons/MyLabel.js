import { CGFobject } from '../../../lib/CGF.js';
import { MyFont } from '../MyFont.js';

export class MyLabel extends CGFobject {
    constructor(scene, label, colorRGBa=[0, 0, 0, 1], fontSize=1) {
        super(scene);

        this.label = label;
        this.fontSize = fontSize;

        this.font = new MyFont(scene, this.fontSize, 0.01, colorRGBa);
    }

    getFontSize() {
        return this.fontSize;
    }

    getLabelTrans() {
        return this.font.getTransAmountCenteredEqualLines(this.label);
    }

    display() {
        this.scene.pushMatrix();
        this.scene.translate(0, 0, this.font.elevated);
        this.font.writeCenteredEqualLines(this.label);
        this.scene.popMatrix();
    }
}
