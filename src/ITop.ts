import * as BabylonJS from '@babylonjs/core'

let _material : BabylonJS.PBRMetallicRoughnessMaterial | undefined = undefined;

export const TopMaterial = (scene: BabylonJS.Scene) => {
    if (_material && _material.getScene() == scene) return _material;
    else  {
        const material = new BabylonJS.PBRMetallicRoughnessMaterial("top#material", scene);
        material.roughness = 0.1;
        material.metallicRoughnessTexture = new BabylonJS.Texture("Metal012_1K-JPG/Metal012_1K_Metalness.jpg", scene)
        material.baseTexture = new BabylonJS.Texture("Metal012_1K-JPG/Metal012_1K_Color.jpg", scene)
        material.normalTexture = new BabylonJS.Texture("Metal012_1K-JPG/Metal012_1K_NormalGL.jpg", scene)
        _material = material;
        return material;
    }
}

export const GRAVITY = BabylonJS.Vector3.Down().scale(9.81);

export type SimulationDataEntry = {
    time: number,
    velocity: BabylonJS.Vector3,
    angularVelocity: BabylonJS.Vector3,
    torque: BabylonJS.Vector3
    kineticEnergy: number,
    rotationalEnergy: number,
    potentialEnergy: number,
    totalEnergy: number,
}

export type SimulationData = SimulationDataEntry[]

export abstract class ITop extends BabylonJS.TransformNode {

    protected friction: number = 0.6;
    protected mass: number = 0.25
    protected momentOfInertia: BabylonJS.Matrix = BabylonJS.Matrix.Identity();

    protected angularVelocity: BabylonJS.Vector3 = BabylonJS.Vector3.Zero();
    protected velocity: BabylonJS.Vector3 = BabylonJS.Vector3.Zero();

    protected addCustomTorque: boolean = true;

    private _time: number = 0;

    private _simulationData: SimulationData = []
    get simulationData() {
        return this._simulationData;
    }

    public simulationStepsPerFrame : number = 100;

    protected constructor(name: string, scene: BabylonJS.Scene, mass: number, momentOfInertia: BabylonJS.Matrix) {
        super(name, scene);
        this.mass = mass;
        this.momentOfInertia = momentOfInertia;
        this.reset();
    }

    abstract contactPoint(worldRotation: BabylonJS.Matrix): BabylonJS.Vector3

    reset() {
        this._simulationData = [];
        this.angularVelocity = BabylonJS.Vector3.Zero();
        this.velocity = BabylonJS.Vector3.Zero();
        this._time = 0;
    }

    tick(simulate: boolean) {
        if (simulate) {

            const dt = (this.getScene().getEngine().getDeltaTime() / 1000) / this.simulationStepsPerFrame;

            for (let i = 0; i < this.simulationStepsPerFrame; ++i) {

                const world = this.getWorldMatrix().getRotationMatrix();

                // compute contact point
                const pWorld = this.contactPoint(world);

                // gravity force
                const Fg = GRAVITY.clone().scale(this.mass);

                // friction force
                const Fr = this.velocity.add(
                    BabylonJS.Vector3.Cross(pWorld, this.angularVelocity)
                ).scale(-this.friction);

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
                const inertia = world.transpose().multiply(this.momentOfInertia.clone()).multiply(world);

                if (this.addCustomTorque) torque.addInPlace(this.customTorque(dt, Fr, Fg, Fn, pWorld, inertia));


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
                this._time += dt;

                if (i == this.simulationStepsPerFrame - 1) {

                    const Ekin = 0.5 * this.velocity.lengthSquared() * this.mass;
                    const Erot = 0.5 * BabylonJS.Vector3.Dot(
                        BabylonJS.Vector3.TransformCoordinates(
                            this.angularVelocity,
                            inertia
                        ),
                        this.angularVelocity
                    );
                    const Epot = -pWorld.y * this.mass * GRAVITY.length();

                    this.simulationData.push({
                        time: this._time,
                        velocity: this.velocity.clone(),
                        angularVelocity: this.angularVelocity.clone(),
                        torque: torque.clone(),
                        kineticEnergy: Ekin,
                        rotationalEnergy: Erot,
                        potentialEnergy: Epot,
                        totalEnergy: Ekin + Erot + Epot
                    })
                }
            }
        } else {
            const world = this.getWorldMatrix().getRotationMatrix();
            const pWorld = this.contactPoint(world);
            this.position.y = -pWorld.y;
        }
    }

    abstract customTorque(
        dt : number, 
        Fr : BabylonJS.Vector3, 
        Fg: BabylonJS.Vector3, 
        Fn: BabylonJS.Vector3, 
        pWorld: BabylonJS.Vector3, 
        inertia: BabylonJS.Matrix
    ) : BabylonJS.Vector3;
}