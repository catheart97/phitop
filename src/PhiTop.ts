import * as BabylonJS from '@babylonjs/core'
import { ITop, TopMaterial } from './ITop';

export const PHI = 1.6180339887;

export class PhiTop extends ITop {

    private scale = 0.16848;

    constructor(name: string, scene: BabylonJS.Scene) {

        const mass = 0.25;
        const scale = 0.16848;

        const rx = scale;
        const ry = scale * PHI;
        const rz = scale;

        const mesh = BabylonJS.CreateSphere("phitop", {
            diameterX: 2 * rx,
            diameterY: 2 * ry,
            diameterZ: 2 * rz
        }, scene)

        mesh.material = TopMaterial(scene);

        const momentOfInertia = new BabylonJS.Matrix();
        let tx = mass / 5 * (ry * ry + rz * rz);
        let ty = mass / 5 * (rx * rx + rz * rz);
        let tz = mass / 5 * (rx * rx + ry * ry);
        momentOfInertia.setRowFromFloats(0, tx, 0, 0, 0);
        momentOfInertia.setRowFromFloats(1, 0, ty, 0, 0);
        momentOfInertia.setRowFromFloats(2, 0, 0, tz, 0);
        momentOfInertia.setRowFromFloats(3, 0, 0, 0, 1);

        super(name, scene, mass, momentOfInertia);

        mesh.parent = this;
        this.scale = scale;
    }

    contactPoint(worldRotation: BabylonJS.Matrix): BabylonJS.Vector3 {
        let u = worldRotation.transpose().getRow(1)!.toVector3()!;
        let p = new BabylonJS.Vector3(-u.x, -u.y * PHI * PHI, -u.z);
        p = p.scale(Math.sqrt(1 / ((p.x * p.x) + (p.y * p.y / (PHI * PHI)) + (p.z * p.z)))).scale(this.scale)
        return BabylonJS.Vector3.TransformCoordinates(p, worldRotation);
    }

    reset() {
        super.reset();
        this.rotation = new BabylonJS.Vector3(0.0, 0.0, Math.PI / 2 + 0.1);
        this.position = BabylonJS.Vector3.Zero();
        this.rotate(BabylonJS.Vector3.Up(), 0);
        this.angularVelocity = new BabylonJS.Vector3(0, 10 * Math.PI, 0)
    }

    customTorque(
        dt: number, 
        Fr: BabylonJS.Vector3, 
        Fg: BabylonJS.Vector3, 
        Fn: BabylonJS.Vector3, 
        pWorld: BabylonJS.Vector3, 
        inertia: BabylonJS.Matrix
    ): BabylonJS.Vector3 {
        const torque = new BabylonJS.Vector3(0, 0, 0);
        if (Fr.length() < 0.05 && this.addCustomTorque) {
            torque.addInPlace(
                this.angularVelocity.scale(-dt)
            )
            torque.addInPlace(new BabylonJS.Vector3(
                dt * this.angularVelocity.length() * 0.01, 0, 0
            ));
        }
        return torque;
    }
}