import * as BabylonJS from '@babylonjs/core'
import { ITop, TopMaterial } from './ITop';
import { dyad } from './Tools';

export const steiner = ( offset: BabylonJS.Vector3, mass: number ) => {
    const negDyad = dyad(
        offset, offset
    ).scale(-1);
    const dotIdentity = BabylonJS.Matrix.Identity().scale(
        BabylonJS.Vector3.Dot(offset, offset)
    );
    const t = dotIdentity.add(negDyad);
    return t.scale(mass);
}

export class Rattleback extends ITop {

    private centerOfMass: BabylonJS.Vector3;
    private r: BabylonJS.Vector3;

    private m1: number;
    private m2: number;
    private r1: BabylonJS.Vector3;
    private r2: BabylonJS.Vector3;
    private direction: number = -1;

    constructor(name: string, scene: BabylonJS.Scene) {

        const mass = 0.25;
        const scale = 0.16848;

        const rx = scale * 4;
        const ry = scale * 0.4;
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

        const m1 = 0.05;
        const m2 = 0.4;
        const r1 = new BabylonJS.Vector3(-0.8 * rx, -0.8 * ry, 0); 
        const r2 = new BabylonJS.Vector3(0.8 * rx, 0.8 * ry, 0);

        const centerOfMass = new BabylonJS.Vector3(0, ry / 4, 0);

        let momentOfInertia = new BabylonJS.Matrix();
        let tx = (m1 + m2 + mass) / 5 * (ry * ry + rz * rz);
        let ty = (m1 + m2 + mass) / 5 * (rx * rx + rz * rz);
        let tz = (m1 + m2 + mass) / 5 * (rx * rx + ry * ry);
        momentOfInertia.setRowFromFloats(0, tx, 0, 0, 0);
        momentOfInertia.setRowFromFloats(1, 0, ty, 0, 0);
        momentOfInertia.setRowFromFloats(2, 0, 0, tz, 0);
        momentOfInertia.setRowFromFloats(3, 0, 0, 0, 1);

        // const r = new BabylonJS.Matrix();
        // BabylonJS.Quaternion.RotationAxis(
        //     BabylonJS.Vector3.Up(),
        //     -Math.PI / 8
        // ).toRotationMatrix(r)

        // momentOfInertia = BabylonJS.Matrix.Transpose(r).multiply(momentOfInertia).multiply(r);

        momentOfInertia = momentOfInertia.add(
            steiner(centerOfMass.clone(), mass)
        )

        momentOfInertia = momentOfInertia.add(
            steiner(r1, m1)
        ).add(
            steiner(r2, m2)
        )

        super(name, scene, mass, momentOfInertia);

        mesh.position = centerOfMass;
        mesh.parent = this;
        this.centerOfMass = centerOfMass;
        this.addCustomTorque = true;
        this.simulationStepsPerFrame = 10;
        this.r = new BabylonJS.Vector3(rx, ry, rz);
        this.simulationStepsPerFrame = 1;
        this.m1 = m1;
        this.m2 = m2;
        this.r1 = r1;
        this.r2 = r2;
        this.friction = 0.99;

        this.reset();
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
        // this.rotate(BabylonJS.Vector3.Forward(), 0.0001);
        this.position = BabylonJS.Vector3.Zero();
        this.angularVelocity = new BabylonJS.Vector3(0, this.direction, 0);
    }

    customTorque(
        dt: number,
        Fr: BabylonJS.Vector3,
        Fg: BabylonJS.Vector3,
        Fn: BabylonJS.Vector3,
        pWorld: BabylonJS.Vector3,
        inertia: BabylonJS.Matrix
    ): BabylonJS.Vector3 {
        const torque = BabylonJS.Vector3.Zero();

        torque.addInPlace(
            BabylonJS.Vector3.Cross(BabylonJS.Vector3.Down().scale(this.m1), pWorld.subtract(this.r1))
        )

        torque.addInPlace(
            BabylonJS.Vector3.Cross(BabylonJS.Vector3.Down().scale(this.m2), pWorld.subtract(this.r2))
        )

        if (Fr.length() < 0.05) {
            torque.addInPlace(
                this.angularVelocity.scale(-dt*dt)
            )
        }
        return torque;
    }

    tick(simulate: boolean): void {
        if (!simulate) {
            this.rotationQuaternion = BabylonJS.Quaternion.RotationAxis(
                BabylonJS.Vector3.Left(),
                0.01
            ).multiply(this.rotationQuaternion!)
        }
        super.tick(simulate);
    }
}