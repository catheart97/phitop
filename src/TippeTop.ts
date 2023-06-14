import { ITop, TopMaterial } from "./ITop";
import * as BabylonJS from '@babylonjs/core'
import { dyad } from "./Tools";
import { steiner } from "./Rattleback";

export const CrossMatrix = (v: BabylonJS.Vector3) => {
    const r = new BabylonJS.Matrix();
    r.setRowFromFloats(0, 0, -v.z, v.y, 0);
    r.setRowFromFloats(1, v.z, 0, -v.x, 0);
    r.setRowFromFloats(2, -v.y, v.x, 0, 0);
    return r;
}


export class TippeTop extends ITop {
    r1: number
    r2: number
    c: number;

    constructor(name: string, scene: BabylonJS.Scene) {
        const r1 = 0.25;
        const r2 = 0.1;
        const h = r1 - r2;
        const c = - 3 / 8 * h;

        const mass = 0.1;
        const volSphere = 4 / 3 * Math.PI * r2 ** 3;
        const volCap = Math.PI * 2 / 3 * r1 ** 2 * (2 * r1 - h);
        const volTotal = volSphere + volCap;
        const massSphere = 0.01 * mass;
        const massCap = 0.99 * mass;

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
        // const cutSphere = sphereCSG;
        const cutSphere = sphereCSG.subtract(boxCSG)

        sphere.dispose();
        box.dispose();
        smallSphere.dispose();

        const mesh = cutSphere.union(smallSphereCSG).toMesh("tippeTop", TopMaterial(scene), scene);
        mesh.position.y = c;

        let smallMomentOfInertia = BabylonJS.Matrix.Identity();
        const stx = massSphere / 5 * 2 * r2 ** 2;
        const sty = massSphere / 5 * 2 * r2 ** 2;
        const stz = massSphere / 5 * 2 * r2 ** 2;
        smallMomentOfInertia.setRowFromFloats(0, stx, 0, 0, 0);
        smallMomentOfInertia.setRowFromFloats(1, 0, sty, 0, 0);
        smallMomentOfInertia.setRowFromFloats(2, 0, 0, stz, 0);
        smallMomentOfInertia.setRowFromFloats(3, 0, 0, 0, 1);

        smallMomentOfInertia = smallMomentOfInertia.add(
            steiner(new BabylonJS.Vector3(0, r1 - c, 0), massSphere)
        );

        console.log(smallMomentOfInertia)

        let momentOfInertia = new BabylonJS.Matrix();
        const tx = massCap / 10 * (4 * r1 ** 2 - h * r1 + h ** 2);
        const ty = massCap / 5 * (2 * r1 ** 2 + h * r1 + h ** 2);
        const tz = tx;
        momentOfInertia.setRowFromFloats(0, tx, 0, 0, 0);
        momentOfInertia.setRowFromFloats(1, 0, ty, 0, 0);
        momentOfInertia.setRowFromFloats(2, 0, 0, tz, 0);
        momentOfInertia.setRowFromFloats(3, 0, 0, 0, 1);

        const uvec = new BabylonJS.Vector3(0, c, 0);
        momentOfInertia = momentOfInertia.add(
            steiner(uvec, massCap)
        )
        .add(
            smallMomentOfInertia
        );
        momentOfInertia.setRowFromFloats(3, 0, 0, 0, 1);

        super(name, scene, mass, momentOfInertia);
        mesh.parent = this;
        this.simulationStepsPerFrame = 10;
        this.addCustomTorque = true;

        this.r1 = r1;
        this.r2 = r2;
        this.c = c;
        this.friction = 0.1;
    }

    reset(): void {
        super.reset();
        this.rotationQuaternion = BabylonJS.Quaternion.RotationAxis(
            BabylonJS.Vector3.Forward(), Math.PI - 1.1
        ).multiplyInPlace(BabylonJS.Quaternion.RotationAxis(
            BabylonJS.Vector3.Right(), 0.1
        ));
        this.position = BabylonJS.Vector3.Zero();
        this.angularVelocity = new BabylonJS.Vector3(0, 20 * Math.PI, 0)
    }

    contactPoint(worldRotation: BabylonJS.Matrix): BabylonJS.Vector3 {
        let u = worldRotation.transpose().getRow(1)!.toVector3()!;
        const threshold = Math.acos((this.r1 - this.r2) / this.r1);
        const value = Math.acos(BabylonJS.Vector3.Dot(u, BabylonJS.Vector3.Down()));
        if (value < threshold) {
            return BabylonJS.Vector3.Up().scale(-this.r2).add(
                u.scale(this.r1 + this.c)
            );
        } else if (value == threshold) {
            return BabylonJS.Vector3.Lerp(
                BabylonJS.Vector3.Up().scale(-this.r1).add(
                    u.scale(this.c)
                ),
                BabylonJS.Vector3.Up().scale(-this.r2).add(
                    u.scale(this.r1 + this.c)
                ),
                0.5
            );
        } else {
            return BabylonJS.Vector3.Up().scale(-this.r1).add(
                u.scale(this.c)
            );
        }
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

    tick(simulate: boolean): void {
        if (!simulate) {
            // this.rotationQuaternion = BabylonJS.Quaternion.RotationAxis(
            //     BabylonJS.Vector3.Forward(), 0.01
            // ).multiplyInPlace(this.rotationQuaternion!);
        }

        const dt = this.getScene().getEngine().getDeltaTime() / 1000;
        const coreAcc = this.position.scale(-1);
        coreAcc.y = 0;

        this.position.addInPlace(coreAcc.scale(dt));

        super.tick(simulate);
    }


}