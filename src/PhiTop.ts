import * as BabylonJS from '@babylonjs/core'

export const PHI = 1.6180339887;

export class PhiTop extends BabylonJS.TransformNode {

    private mass: number = 0.25
    private kineticFriction: number = 0.4;
    steps: number = 100;

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
        this.angularVelocity = new BabylonJS.Vector3(0, 40, 0);
        this.velocity = BabylonJS.Vector3.Zero();
        this.rotation = new BabylonJS.Vector3(0.0, 0.0, Math.PI / 2 + 0.1);
        this.position = BabylonJS.Vector3.Zero();
        this.data = []
        this.rotate(BabylonJS.Vector3.Up(), 0);
    }

    tick() {

        if (this.simulate) {

            const dt = (this.getScene().getEngine().getDeltaTime() / 1000) / this.steps;

            for (let i = 0; i < this.steps; ++i) {

                const world = this.getWorldMatrix().getRotationMatrix();

                // compute contact point
                let u = world.transpose().getRow(1)!.toVector3()!;
                let p = new BabylonJS.Vector3(-u.x, -u.y * PHI * PHI, -u.z);
                p = p.scale(Math.sqrt(1 / ((p.x * p.x) + (p.y * p.y / (PHI * PHI)) + (p.z * p.z)))).scale(this.scale)
                const pWorld = BabylonJS.Vector3.TransformCoordinates(p, world);

                // gravity force
                const Fg = this.gravity.clone().scale(this.mass);
                
                // friction force
                const Fr = this.velocity.add(
                    BabylonJS.Vector3.Cross(pWorld, this.angularVelocity)
                ).scale(-this.kineticFriction);
                
                // normal force
                let Fn = new BabylonJS.Vector3(
                    0,
                    (
                        (
                            (
                                (-pWorld.y - this.position.y) / dt
                            ) - this.velocity.y
                        ) * this.mass
                    ) / dt - Fg.y - Fr.y,
                    0
                );
                // Fn = Fg.scale(-1);
                    
                // compute torques
                const torque = BabylonJS.Vector3.Cross(Fn.scale(-1).add(Fr), pWorld);

                if (Fr.length() < 0.05) {
                    torque.addInPlace(
                        Fg.scale(dt * this.angularVelocity.length())
                    )
                    torque.addInPlace(new BabylonJS.Vector3(
                        dt * this.angularVelocity.length() * 0.01, 0, 0
                    ));
                }

                const inertia = world.transpose().multiply(this.momentOfInertia.clone()).multiply(world);

                // compute accelerations
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
                    inertia.clone().invert()
                ) 

                // explicit euler for velocities
                this.angularVelocity.addInPlace(angularAcceleration.scale(dt));
                this.velocity.addInPlace(acceleration.scale(dt));

                // apply speeds using euler
                this.position.addInPlace(this.velocity.scale(dt));
                this.rotate(
                    this.angularVelocity.normalizeToNew(),
                    this.angularVelocity.length() * dt,
                    BabylonJS.Space.WORLD
                )

                // console.log(this.position.y, -pWorld.y)

                // save graph data
                this.t += dt;
                
                if (i == this.steps - 1) {
    
                    const Ekin = 0.5 * this.velocity.lengthSquared() * this.mass;
                    const Erot = 0.5 * BabylonJS.Vector3.Dot(
                        BabylonJS.Vector3.TransformCoordinates(
                            this.angularVelocity,
                            inertia
                        ),
                        this.angularVelocity
                    );
                    const Epot = -pWorld.y * this.mass * this.gravity.length();

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
                }

                // this.simulate = false;
                // break;
                // this.position.y = -pWorld.y + 0.01;
            }

        } else {
            const world = this.getWorldMatrix().getRotationMatrix();

            let u = world.transpose().getRow(1)!.toVector3()!;
            let p = new BabylonJS.Vector3(-u.x, -u.y * PHI * PHI, -u.z);
            p = p.scale(Math.sqrt(1 / ((p.x * p.x) + (p.y * p.y / (PHI * PHI)) + (p.z * p.z)))).scale(this.scale)
            const pWorld = BabylonJS.Vector3.TransformCoordinates(p, world);
            this.position.y = -pWorld.y;
        }
    }
}