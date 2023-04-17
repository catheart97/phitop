import * as BabylonJS from '@babylonjs/core'

export const PHI = 1.6180339887;

export class PhiTop extends BabylonJS.TransformNode {

    private cp : BabylonJS.Mesh | undefined

    private showContactPoint: boolean = false;
    private mass: number = 0.25
    private kineticFriction: number = 0.2;
    private steps: number = 1;
    scale: number = 0.16848;

    private angularVelocity: BabylonJS.Vector3 = BabylonJS.Vector3.Zero();
    private speed: BabylonJS.Vector3 = BabylonJS.Vector3.Zero();

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

        if (this.showContactPoint) {
            this.cp = BabylonJS.CreateSphere("cp", { diameter: 0.2 }, scene)
            const cpMaterial = new BabylonJS.StandardMaterial("cp#material", scene);
            cpMaterial.diffuseColor = BabylonJS.Color3.Red();
            this.cp.material = cpMaterial;
        }

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
        this.angularVelocity = new BabylonJS.Vector3(0, 8 * Math.PI, 0);
        this.speed = BabylonJS.Vector3.Zero();
        this.rotation = new BabylonJS.Vector3(0.1, 0.1, Math.PI / 2);
        this.position = BabylonJS.Vector3.Zero();
    }

    private rotationMatrix() {
        let world = this.getWorldMatrix().clone();
        world.setRow(3, new BabylonJS.Vector4(0, 0, 0, 1));
        return world;
    } 

    private contactPoint(world: BabylonJS.Matrix) {
        let u = world.transpose().getRow(1)!.toVector3()!;
        let p = new BabylonJS.Vector3(-u.x, -u.y * PHI * PHI, -u.z);
        p = p.scale(Math.sqrt(1/((p.x * p.x) + (p.y * p.y / (PHI * PHI)) + (p.z * p.z)))).scale(this.scale)
        const pWorld = BabylonJS.Vector3.TransformCoordinates(p, world); 
        this.cp?.setAbsolutePosition( this.getAbsolutePosition().add(pWorld) );
        return [p, pWorld]
    }

    private floorCollision() {
        const world = this.rotationMatrix();
        const [p, pWorld] = this.contactPoint(world);
        this.position.y = -pWorld.y + 0.01;
    } 

    tick() {

        if (this.simulate) {

            const dt = (this.getScene().getEngine().getDeltaTime() / 1000) / this.steps;

            for (let i = 0; i < this.steps; ++i) {

                const world = this.rotationMatrix()
                let u = world.transpose().getRow(1)!.toVector3()!;
                let [p, pWorld] = this.contactPoint(world);
                // console.log(pWorld);

                const Fg = this.gravity.clone().scale(this.mass);
                const Fr = this.speed.add(BabylonJS.Vector3.Cross(pWorld, this.angularVelocity));
                Fr.scaleInPlace(-this.kineticFriction);
                // Fr.scaleInPlace(-this.kineticFriction * this.mass / dt);

                const inertia = world.multiply(this.momentOfInertia.multiply(world.transpose()));

                const torque = BabylonJS.Vector3.Cross(Fg.add(Fr), pWorld);

                // if (BabylonJS.Vector3.Cross(this.angularVelocity, u).length() < 0.1) {
                //     console.log("applied bohr", BabylonJS.Vector3.Cross(this.angularVelocity, u).length());
                //     this.angularVelocity = this.angularVelocity.scale(0.95)
                // }

                const acceleration = Fg.add(Fr).scale(1 / this.mass);

                // compute gradient(s)
                const dAngularVelocity = BabylonJS.Vector3.TransformCoordinates(
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

                // explicit euler for speeds
                this.angularVelocity.addInPlace(dAngularVelocity.scale(dt));
                this.speed.addInPlace(acceleration.scale(dt));

                // console.log(this.angularVelocity);

                // apply speeds using euler
                this.position.addInPlace(this.speed.scale(dt));
                this.rotation.addInPlace(this.angularVelocity.scale(dt));

                // normalize rotation values
                this.rotation.x %= 2 * Math.PI;
                this.rotation.y %= 2 * Math.PI;
                this.rotation.z %= 2 * Math.PI;
                this.floorCollision();
            }

        }

        this.floorCollision();

    }
}