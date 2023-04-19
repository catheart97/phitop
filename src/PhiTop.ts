import * as BabylonJS from '@babylonjs/core'

export const PHI = 1.6180339887;

export class PhiTop extends BabylonJS.TransformNode {

    private mass: number = 0.25
    private kineticFriction: number = 0.3;
    steps: number = 1000;

    private t: number = 0;

    data: any[] = []
    scale: number = 0.16848;

    private angularVelocity: BabylonJS.Vector3 = BabylonJS.Vector3.Zero();
    private velocity: BabylonJS.Vector3 = BabylonJS.Vector3.Zero();

    private gravity: BabylonJS.Vector3

    private momentOfInertia: BabylonJS.Matrix

    public simulate: boolean = false;

    constructor(name: string, scene: BabylonJS.Scene) {
        super(name, scene);

        const rx = this.scale;
        const ry = this.scale * PHI;
        const rz = this.scale;

        const mesh = BabylonJS.CreateSphere("phitop", {
            diameterX: 2 * rx,
            diameterY: 2 * ry,
            diameterZ: 2 * rz
        }, scene)
        const material = new BabylonJS.PBRMetallicRoughnessMaterial("phitop#material", scene);
        material.roughness = 0.1;
        material.metallicRoughnessTexture = new BabylonJS.Texture("Metal012_1K-JPG/Metal012_1K_Metalness.jpg", scene)
        material.baseTexture = new BabylonJS.Texture("Metal012_1K-JPG/Metal012_1K_Color.jpg", scene)
        material.normalTexture = new BabylonJS.Texture("Metal012_1K-JPG/Metal012_1K_NormalGL.jpg", scene)
        mesh.material = material;
        mesh.parent = this;

        this.gravity = BabylonJS.Vector3.Down().scale(9.81);

        this.momentOfInertia = new BabylonJS.Matrix();
        let tx = this.mass / 5 * (ry * ry + rz * rz);
        let ty = this.mass / 5 * (rx * rx + rz * rz);
        let tz = this.mass / 5 * (rx * rx + ry * ry);
        this.momentOfInertia.setRowFromFloats(0, tx, 0, 0, 0);
        this.momentOfInertia.setRowFromFloats(1, 0, ty, 0, 0);
        this.momentOfInertia.setRowFromFloats(2, 0, 0, tz, 0);
        this.momentOfInertia.setRowFromFloats(3, 0, 0, 0, 1);

        this.reset();

        scene.onBeforeRenderObservable.add(() => { this.tick() })
    }

    reset() {
        this.angularVelocity = new BabylonJS.Vector3(0, 20 * Math.PI, 0);
        this.velocity = BabylonJS.Vector3.Zero();
        this.rotation = new BabylonJS.Vector3(0.1, 0.0, Math.PI / 2 + 0.1);
        this.position = BabylonJS.Vector3.Zero();
        this.data = []
        this.rotate(BabylonJS.Vector3.Up(), 0);
    }

    tick() {

        if (this.simulate) {

            const dt = (this.getScene().getEngine().getDeltaTime() / 1000) / this.steps;

            for (let i = 0; i < this.steps; ++i) {

                const world = this.getWorldMatrix().getRotationMatrix();

                let u = world.transpose().getRow(1)!.toVector3()!;
                let p = new BabylonJS.Vector3(-u.x, -u.y * PHI * PHI, -u.z);
                p = p.scale(Math.sqrt(1 / ((p.x * p.x) + (p.y * p.y / (PHI * PHI)) + (p.z * p.z)))).scale(this.scale)
                const pWorld = BabylonJS.Vector3.TransformCoordinates(p, world);

                const Fg = this.gravity.clone().scale(this.mass);
                let Fn = Fg.scale(-0.5)
                const Fr = this.velocity.add(
                    BabylonJS.Vector3.Cross(pWorld, this.angularVelocity)
                ).scale(-this.kineticFriction);
                const inertia = world.multiply(this.momentOfInertia.multiply(world.transpose()));
                const torque = BabylonJS.Vector3.Cross(Fn.add(Fr), pWorld);

                const acceleration = Fg.add(Fn).add(Fr).scale(1 / this.mass);
                const angularAcceleration = BabylonJS.Vector3.TransformCoordinates(
                    torque.subtract(
                        BabylonJS.Vector3.Cross(
                            this.angularVelocity,
                            BabylonJS.Vector3.TransformCoordinates(
                                this.angularVelocity,
                                inertia
                            )
                        )
                    ),
                    inertia.invert()
                )

                // explicit euler for velocities
                this.angularVelocity.addInPlace(angularAcceleration.scale(dt));
                this.velocity.addInPlace(acceleration.scale(dt));

                // save graph data
                this.t += dt;

                const Ekin = 0.5 * this.velocity.lengthSquared() * this.mass;
                const Erot = 0.5 * BabylonJS.Vector3.Dot(
                    BabylonJS.Vector3.TransformCoordinates(
                        this.angularVelocity,
                        inertia
                    ),
                    this.angularVelocity
                );
                const Epot = this.mass * this.gravity.length() * (-pWorld.y);

                this.data.push({
                    t: this.t,
                    vx: this.velocity.x,
                    vy: this.velocity.y,
                    vz: this.velocity.z,
                    wx: this.angularVelocity.x,
                    wy: this.angularVelocity.y,
                    wz: this.angularVelocity.z,
                    tx: torque.x,
                    ty: torque.y,
                    tz: torque.z,
                    Ekin: Ekin,
                    Erot: Erot,
                    Epot: Epot,
                    E: Ekin + Erot + Epot,
                })

                // apply speeds using euler
                this.position.addInPlace(this.velocity.scale(dt * dt));

                const axis = this.angularVelocity.normalizeToNew();
                const angle = this.angularVelocity.length() * dt;

                this.rotate(
                    axis,
                    angle,
                    BabylonJS.Space.WORLD
                )

                this.position.y = -pWorld.y + 0.01;
            }

        } else {
            const world = this.getWorldMatrix().getRotationMatrix();

            let u = world.transpose().getRow(1)!.toVector3()!;
            let p = new BabylonJS.Vector3(-u.x, -u.y * PHI * PHI, -u.z);
            p = p.scale(Math.sqrt(1 / ((p.x * p.x) + (p.y * p.y / (PHI * PHI)) + (p.z * p.z)))).scale(this.scale)
            const pWorld = BabylonJS.Vector3.TransformCoordinates(p, world);
            this.position.y = -pWorld.y + 0.01;
        }
    }
}