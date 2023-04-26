import * as BabylonJS from '@babylonjs/core'
import { ITop, TopMaterial } from './ITop';
import { dyad } from './Tools';

export class Rattleback extends ITop {

    private centerOfMass: BabylonJS.Vector3;
    private r: BabylonJS.Vector3;

    constructor(name: string, scene: BabylonJS.Scene) {

        const mass = 0.25;
        const scale = 0.16848;

        const rx = scale * 4;
        const ry = scale * 0.5;
        const rz = scale;

        const ellipsoid = BabylonJS.CreateSphere(
            "rattlebackEllipsoid", {
            diameterX: 2 * rx,
            diameterY: 2 * ry,
            diameterZ: 2 * rz
        }, scene)

        const box = BabylonJS.CreateBox(
            "rattlebackBox", {
            height: ry,
            width: 2 * rx,
            depth: 2 * rz
        },
            scene
        )

        box.position = new BabylonJS.Vector3(0, 0.5 * ry, 0);

        const ellipsoidCSG = BabylonJS.CSG.FromMesh(ellipsoid);
        const boxCSG = BabylonJS.CSG.FromMesh(box);

        const mesh = ellipsoidCSG.subtract(boxCSG).toMesh("rattleback", TopMaterial(scene), scene);

        scene.removeMesh(ellipsoid);
        scene.removeMesh(box);

        const centerOfMass = new BabylonJS.Vector3(0, - ry / 3, 0);

        let momentOfInertia = new BabylonJS.Matrix();
        let tx = 3 * mass / 2 * (ry * ry + rz * rz);
        let ty = 3 * mass / 2 * (rx * rx + rz * rz);
        let tz = 3 * mass / 2 * (rx * rx + ry * ry);
        momentOfInertia.setRowFromFloats(0, tx, 0, 0, 0);
        momentOfInertia.setRowFromFloats(1, 0, ty, 0, 0);
        momentOfInertia.setRowFromFloats(2, 0, 0, tz, 0);
        momentOfInertia.setRowFromFloats(3, 0, 0, 0, 1);

        const tCenterOfMass = centerOfMass.clone();
        const negDyad = dyad(
            tCenterOfMass, tCenterOfMass
        ).scale(-1);
        const dotIdentity = BabylonJS.Matrix.Identity().scale(
            BabylonJS.Vector3.Dot(tCenterOfMass, tCenterOfMass)
        );
        const t = dotIdentity.add(negDyad);
        momentOfInertia = momentOfInertia.add(
            t.scale(mass)
        )

        super(name, scene, mass, momentOfInertia);

        mesh.position = centerOfMass;
        mesh.parent = this;
        this.centerOfMass = centerOfMass;
        this.addCustomTorque = false;
        this.simulationStepsPerFrame = 1;
        this.r = new BabylonJS.Vector3(rx, ry, rz);
        this.simulationStepsPerFrame = 1000;

        // scene.registerBeforeRender(() => {
        //     if (this) {
        //         this.rotate(
        //             BabylonJS.Vector3.Left(),
        //             0.01
        //         );
        //         this.rotate(
        //             BabylonJS.Vector3.Forward(),
        //             0.005
        //         );
        //         this.rotate(
        //             BabylonJS.Vector3.Up(),
        //             0.003
        //         );
        //         this.position.y = this.contactPoint(this.getWorldMatrix().getRotationMatrix()).y;
        //     }
        // })
    }

    contactPoint(worldRotation: BabylonJS.Matrix): BabylonJS.Vector3 {
        const u = worldRotation.transpose().getRow(1)!.toVector3()!;
        if (u.y == -1)
            return this.centerOfMass.scale(-1);
        else {
            let p = new BabylonJS.Vector3(
                -u.x * this.r.x * this.r.x,
                -Math.max(0, u.y) * this.r.y * this.r.y,
                -u.z * this.r.z * this.r.z
            );
            const c = Math.sqrt(1 /
                ((p.x * p.x / (this.r.x * this.r.x)) + (p.y * p.y / (this.r.y * this.r.y)) + (p.z * p.z / (this.r.z * this.r.z)))
            );
            p = p.scale(c)
            p.addInPlace(this.centerOfMass);
            return BabylonJS.Vector3.TransformCoordinates(p, worldRotation);
        }
    }

    reset() {
        super.reset();
        this.rotation = new BabylonJS.Vector3(0, 0, 0.1);
        this.position = BabylonJS.Vector3.Zero();
        this.angularVelocity = new BabylonJS.Vector3(0, 1, 0);
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
        if (Fr.length() < 0.05) {
            torque.addInPlace(
                this.angularVelocity.scale(-dt)
            )
        }
        return torque;
    }
}