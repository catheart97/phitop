import { ITop, TopMaterial } from "./ITop";
import * as BabylonJS from '@babylonjs/core'

export class TippeTop extends ITop {
    r1: number
    r2: number

    constructor(name: string, scene: BabylonJS.Scene) {
        const r1 = 0.25;
        const r2 = 0.1;

        const scale = 0.16848;

        const smallSphere = BabylonJS.CreateSphere(
            "tippeTopSmallSphere", {
            diameter: 2 * r2
        }, scene);
        smallSphere.position.y = r1;

        const sphere = BabylonJS.CreateSphere(
            "tippeTopSphere", {
            diameter: 2 * r1
        }, scene);

        const box = BabylonJS.CreateBox(
            "tippeTopBox", {
            height: 2 * r2,
            width: 2,
            depth: 2
        }, scene);
        box.position.y = r1;

        const sphereCSG = BabylonJS.CSG.FromMesh(sphere);
        const smallSphereCSG = BabylonJS.CSG.FromMesh(smallSphere);
        const boxCSG = BabylonJS.CSG.FromMesh(box);
        const cutSphere = sphereCSG.subtract(boxCSG)

        sphere.dispose();
        box.dispose();
        smallSphere.dispose();

        const mesh = cutSphere.union(smallSphereCSG).toMesh("tippeTop", TopMaterial(scene), scene);

        // const mesh = cylinder2;

        super(name, scene, 0.25, BabylonJS.Matrix.Identity());
        mesh.parent = this;

        this.r1 = r1;
        this.r2 = r2;
    }

    reset(): void {
        super.reset();

        this.position = new BabylonJS.Vector3(0, 0, 0);
        this.angularVelocity = new BabylonJS.Vector3(0, 0, 1)
        this.rotationQuaternion = BabylonJS.Quaternion.RotationAxis(
            BabylonJS.Vector3.Left(), Math.PI
        )
    }

    contactPoint(worldRotation: BabylonJS.Matrix): BabylonJS.Vector3 {
        let u = worldRotation.transpose().getRow(1)!.toVector3()!;
        const threshold = Math.acos((this.r1 - this.r2) / this.r1);
        const value = Math.acos(BabylonJS.Vector3.Dot(u, BabylonJS.Vector3.Down()));
        if (value < threshold) {
            return BabylonJS.Vector3.Up().scale(-this.r2).add(
                u.scale(this.r1)
            );
        }
        else {
            return BabylonJS.Vector3.Up().scale(-this.r1);
        }
    }
    customTorque(dt: number, Fr: BabylonJS.Vector3, Fg: BabylonJS.Vector3, Fn: BabylonJS.Vector3, pWorld: BabylonJS.Vector3, inertia: BabylonJS.Matrix): BabylonJS.Vector3 {
        return BabylonJS.Vector3.Zero();
    }

    tick(simulate: boolean): void {
        if (!simulate) {
            this.rotationQuaternion = BabylonJS.Quaternion.RotationAxis(
                BabylonJS.Vector3.Left(),
                0.001
            ).multiply(this.rotationQuaternion!)
        }
        super.tick(simulate);
    }

}