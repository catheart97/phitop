import * as BabylonJS from '@babylonjs/core';
import '@babylonjs/inspector';
import * as React from "react";
import { PhiTop, PHI } from './PhiTop';

let firstRun = true;


const Button = (props: {
    children?: React.ReactNode
    onClick?: () => void
}) => {
    return (
        <button 
            className="transition-all bg-neutral-50/40 hover:bg-neutral-500 hover:text-neutral-50 border-2 border-neutral-500/40 p-2 text-neutral-500/40 duration-300" 
            onClick={props.onClick}
        >
            {props.children}
        </button>
    )
}

function App() {

    const canvas = React.createRef<HTMLCanvasElement>();

    const engine = React.useRef<BabylonJS.Engine>();
    const scene = React.useRef<BabylonJS.Scene>();
    const phitop = React.useRef<PhiTop>();

    const initEngine = () => {
        engine.current = new BabylonJS.Engine(canvas.current, true, {
            powerPreference: "high-performance"
        });
        engine.current.displayLoadingUI();
    }

    const initScene = () => {
        scene.current = new BabylonJS.Scene(engine.current!);
        scene.current.clearColor = BabylonJS.Color3.White().toColor4();
    }

    const setupCamera = () => {
        const camera = new BabylonJS.ArcRotateCamera(
            "camera",
            Math.PI / 3,
            Math.PI / 3,
            3,
            BabylonJS.Vector3.Zero(), scene.current
        )
        camera.minZ = 0.1;
        scene.current?.onBeforeRenderObservable.add(() => {
            // camera.target = phitop.current?.getAbsolutePosition()!;
            camera.target.y = phitop.current!.scale * PHI;
        })
        camera.attachControl(canvas.current!)
    }

    const setupEnvironment = () => {
        const hdri = new BabylonJS.HDRCubeTexture(
            "/phitop/burnt_warehouse_4k.hdr",
            scene.current!,
            1024,
            false,
            true,
            false,
            true
        );
        scene.current!.environmentTexture = hdri;
        scene.current!.environmentBRDFTexture = hdri;

        const skybox = new BabylonJS.PhotoDome(
            "skybox", "/phitop/burnt_warehouse_4k.hdr", {}, scene.current!
        )
        skybox.infiniteDistance = true;

        const sunPosition = new BabylonJS.Vector3(1,10,1).normalize().scale(5);

        const light = new BabylonJS.HemisphericLight("skylight", BabylonJS.Vector3.Up(), scene.current!);
        light.intensity = .6;
        const sun = new BabylonJS.DirectionalLight(
            "sun",
            sunPosition.clone().normalize().scale(-1),
            scene.current!
        );
        sun.shadowEnabled = true;
        sun.autoCalcShadowZBounds = true;
        sun.intensity = 10;
        sun.shadowMinZ = 1;
        sun.shadowMaxZ = 30;
        sun.autoUpdateExtends = false;
        sun.shadowFrustumSize = 4;
        sun.position = sunPosition;
        const generator = new BabylonJS.ShadowGenerator(1024, sun);
        generator.addShadowCaster(phitop.current!.getChildMeshes(true)[0] as BabylonJS.Mesh);
        generator.usePoissonSampling = false;
        generator.bias = 0.001;
        generator.blurKernel = 3;
        generator.blurScale = 1;
        generator.useExponentialShadowMap = true;
        generator.useBlurExponentialShadowMap = false;
        generator.useCloseExponentialShadowMap = true;
        generator.useBlurCloseExponentialShadowMap = true;
        generator.useContactHardeningShadow = true;
        generator.setDarkness(0);
        generator.recreateShadowMap();

        scene.current?.onBeforeRenderObservable.add(() => {
            sun.position = sunPosition.add(phitop.current?.getAbsolutePosition()!);
        })
    }

    const setupTop = () => {
        phitop.current = new PhiTop("phitop", scene.current!);

        const ground = BabylonJS.CreatePlane("ground", {
            width: 5,
            height: 5,
        }, scene.current)
        const groundMaterial = new BabylonJS.PBRMetallicRoughnessMaterial("ground#material", scene.current);
        groundMaterial.baseColor = BabylonJS.Color3.Gray();
        groundMaterial.backFaceCulling = false;
        groundMaterial.roughness = 0.1;
        // groundMaterial.metallicRoughnessTexture = new BabylonJS.Texture("WoodFloor051_2K-JPG/WoodFloor051_2K_Roughness.jpg", scene.current)
        groundMaterial.metallic = 0.0;
        groundMaterial.baseTexture = new BabylonJS.Texture("WoodFloor051_2K-JPG/WoodFloor051_2K_Color.jpg", scene.current)
        groundMaterial.normalTexture = new BabylonJS.Texture("WoodFloor051_2K-JPG/WoodFloor051_2K_NormalGL.jpg", scene.current)
        ground.material = groundMaterial;
        ground.rotation.x = Math.PI / 2;
        ground.receiveShadows = true;
    }

    const setupPost = () => {
        const pipeline = new BabylonJS.DefaultRenderingPipeline(
            "pipeline", false, scene.current, [scene.current!.activeCamera!]
        );
        pipeline.samples = 4;
        pipeline.fxaaEnabled = true;
        pipeline.bloomEnabled = true;
        pipeline.bloomThreshold = .8;
        pipeline.bloomWeight = 0.1;
        pipeline.bloomKernel = 32;
        pipeline.bloomScale = 0.5;
        pipeline.imageProcessingEnabled = true;
        pipeline.chromaticAberrationEnabled = true;
        pipeline.chromaticAberration.aberrationAmount = 20;
        pipeline.chromaticAberration.radialIntensity = 3;
        pipeline.chromaticAberration.direction.x = Math.sin(Math.PI);
        pipeline.chromaticAberration.direction.y = Math.cos(Math.PI);
        pipeline.grainEnabled = true;
        pipeline.grain.intensity = 5;
        pipeline.grain.animated = true;

    }

    const setupLoop = () => {
        engine.current?.runRenderLoop(() => {
            scene.current?.render()
        })
        canvas.current?.addEventListener("resize", () => {
            engine.current?.resize();
        })
    }

    const init = () => {
        initEngine();
        initScene();
        setupTop();
        setupCamera(); 
        setupEnvironment();
        setupPost();
        setupLoop();
        scene.current?.onReadyObservable.addOnce(() => {
            engine.current!.hideLoadingUI();
        })
    }

    React.useEffect(() => {
        init();

        return () => {
            engine.current?.hideLoadingUI();
            engine.current?.stopRenderLoop();
        }
    }, []);

    return (
        <div className="w-full h-screen flex relative">
            <div className='grow h-full'>
                <canvas className="w-full h-full" ref={canvas}></canvas>
            </div>
            <div className='w-96 absolute left-0 bottom-0 h-fit flex flex-col p-4 gap-3'>
                <Button onClick={() => {
                    phitop.current!.simulate = !phitop.current!.simulate;
                    console.log("simulate", phitop.current!.simulate);
                }}>
                    Start/Pause
                </Button>
                <Button onClick={() => { phitop.current?.reset(); }}>
                    Reset All
                </Button>
            </div>
        </div>
    )
}

export default App
