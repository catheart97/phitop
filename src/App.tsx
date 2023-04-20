import * as BabylonJS from '@babylonjs/core';
import '@babylonjs/inspector';
import * as React from "react";
import { PhiTop, PHI } from './PhiTop';

import 'bootstrap-icons/font/bootstrap-icons.css'
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

type LicenseInfo = {
    department: string,
    relatedTo: string
    name: string
    licensePeriod: string
    material: string
    licenseType: string
    link: string
    remoteVersion: string
    installedVersion: string
    definedVersion: string
    author: string
}

const LicenseView = (props: {
    info: LicenseInfo
}) => {
    return (
        <div className='p-2 pl-5 pr-5'>
            {props.info.name} <br/>
            {
                (props.info.author != "n/a") ? <>{props.info.author} <br/></> : <></>
            }
            {props.info.licenseType}
        </div>
    )
}

const LicenseOverview = () => {

    const mainRef = React.createRef<HTMLDivElement>();
    const [animationState, setAnimationState] = React.useState(0)

    const [licenses, setLicenses] = React.useState<LicenseInfo[]>([]);

    React.useEffect(() => {
        fetch("/phitop/licenses.json").then(res => res.json()).then(data => {
            setLicenses(data)
        })
    }, []);

    return (
        <div>
            <div className='flex justify-between text-neutral-500/60 items-center'>
                    
                    <FullButton 
                        onClick={() => {
                            setAnimationState(
                                animationState == 0 ? (mainRef.current!.scrollHeight) : 0
                            )
                        }}
                    >
                        <div>Show/Hide OS Licenses</div>
                        <i className={'bi ' + (animationState == 0 ? "bi-arrow-down" : "bi-arrow-up")}></i>
                    </FullButton>
            </div>
            <div ref={mainRef} className={'flex overflow-hidden rounded-2xl bg-neutral-50/80 transition-all duration-300 text-left flex-col ease-in-out'} style={{height: animationState}}>
                {
                    licenses.map((license, idx) => <LicenseView info={license} key={idx} />) 
                }
            </div>
        </div>
    )
}

const FullButton = (props: {
    children?: React.ReactNode
    onClick?: () => void
}) => {
    return (
        <button 
            className="transition-all hover:bg-neutral-500 hover:text-neutral-50 border-neutral-500/60 p-2 text-neutral-800 duration-300 pl-5 pr-5 rounded-full w-full flex justify-between" 
            onClick={props.onClick}
        >
            {props.children}
        </button>
    )
}

const Button = (props: {
    children?: React.ReactNode
    onClick?: () => void
    className?: string
}) => {
    return (
        <button 
            className={"transition-all bg-neutral-50/60 hover:bg-neutral-500 hover:text-neutral-50 border-2 border-neutral-500/60 p-2 text-neutral-500/60 duration-300 pl-3 pr-3 rounded-full " + props.className} 
            onClick={props.onClick}
        >
            {props.children}
        </button>
    )
}

type OverlayHandle = {
    open: () => void
    hide: () => void
    toggle: () => void
}

type OverlayProps = {
    children?: React.ReactNode
}

const OverlayRenderer : React.ForwardRefRenderFunction<OverlayHandle, OverlayProps> = (props, env) => {

    const [animationState, setAnimationState] = React.useState("w-0 border-0")

    const handle : OverlayHandle = {
        toggle() {
            setAnimationState(animationState == "w-96 border-2" ? "w-0 border-0" : "w-96 border-2");
        },
        open() {
            setAnimationState("w-96 border-2")
        },
        hide() {
            setAnimationState("w-0 border-0")
        },
    }

    React.useImperativeHandle(env, () => (handle));

    return (
        <div className='absolute right-0 top-0 bottom-0 p-4'>
            <div className={'max-w-96 h-full bg-neutral-50/80 flex flex-col items-stretch text-center top-0 bottom-0 overflow-hidden overflow-y-scroll border-neutral-500/60 border-2 transition-[width,border] duration-300 ease-in-out rounded-2xl gap-4 ' + animationState}>
                <div className='m-5'>
                    {props.children}
                </div>
            </div>
        </div>
    )
}

const Overlay = React.forwardRef(OverlayRenderer)

function App() {

    const canvas = React.createRef<HTMLCanvasElement>();
    const overlayHandle = React.createRef<OverlayHandle>();
    
    const engine = React.useRef<BabylonJS.Engine>();
    const scene = React.useRef<BabylonJS.Scene>();
    const phitop = React.useRef<PhiTop>();

    const [velocityChart, setVelocityChart] = React.useState<JSX.Element>();
    const [angularVelocityChart, setAngularVelocityChart] = React.useState<JSX.Element>();
    const [energyChart, setEnergyChart] = React.useState<JSX.Element>();
    const [torqueChart, setTorqueChart] = React.useState<JSX.Element>();

    const [ simulate, setSimulate ] = React.useState(false);

    const updateCharts = () => {
        setVelocityChart(<></>);
        setAngularVelocityChart(<></>)
        setEnergyChart(<></>)
        setTorqueChart(<></>)

        setTimeout(() => {

            const data = phitop.current!.data;

            setVelocityChart(
                <LineChart width={300} height={200} data={data}>
                    <XAxis dataKey="t" tickFormatter={(val : number, _) => { return val.toFixed(1);}}/>
                    <YAxis/>
                    <CartesianGrid stroke="#090909" strokeDasharray="5 5"/>
                    <Tooltip/>
                    <Line type="monotone" dataKey="vx" stroke="#f87171" dot={false} />
                    <Line type="monotone" dataKey="vy" stroke="#4ade80" dot={false} />
                    <Line type="monotone" dataKey="vz" stroke="#38bdf8" dot={false} />
                </LineChart>
            )
            setAngularVelocityChart(
                <LineChart width={300} height={200} data={data}>
                    <XAxis dataKey="t" tickFormatter={(val : number, _) => { return val.toFixed(1);}}/>
                    <YAxis/>
                    <CartesianGrid stroke="#090909" strokeDasharray="5 5"/>
                    <Tooltip/>
                    <Line type="monotone" dataKey="wx" stroke="#f87171" dot={false} />
                    <Line type="monotone" dataKey="wy" stroke="#4ade80" dot={false} />
                    <Line type="monotone" dataKey="wz" stroke="#38bdf8" dot={false} />
                </LineChart>
            )
            setEnergyChart(
                <LineChart width={300} height={200} data={data}>
                    <XAxis dataKey="t" tickFormatter={(val : number, _) => { return val.toFixed(1)}} />
                    <YAxis tickFormatter={(val, idx) => { return (val).toFixed(1) }}/>
                    <CartesianGrid stroke="#090909" strokeDasharray="5 5"/>
                    <Tooltip/>
                    <Line type="monotone" dataKey="Ekin" stroke="#f87171" dot={false} />
                    <Line type="monotone" dataKey="Erot" stroke="#4ade80" dot={false} />
                    <Line type="monotone" dataKey="Epot" stroke="#fbbf24" dot={false} />
                    <Line type="monotone" dataKey="E" stroke="#38bdf8" dot={false} />
                </LineChart>
            )
            setTorqueChart(
                <LineChart width={300} height={200} data={data}>
                    <XAxis dataKey="t" tickFormatter={(val : number, _) => { return val.toFixed(1)}} />
                    <YAxis/>
                    <CartesianGrid stroke="#090909" strokeDasharray="5 5"/>
                    <Tooltip/>
                    <Line type="monotone" dataKey="tx" stroke="#f87171" dot={false} />
                    <Line type="monotone" dataKey="ty" stroke="#4ade80" dot={false} />
                    <Line type="monotone" dataKey="tz" stroke="#38bdf8" dot={false} />
                </LineChart>
            )
        }, 100)
    }

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
        camera.target.y = phitop.current!.scale * PHI;
        scene.current?.onBeforeRenderObservable.add(() => {
            const p = phitop.current!.getAbsolutePosition()!.clone();
            p.y = phitop.current!.scale * PHI;
            camera.target = p;
        })
        camera.attachControl(canvas.current!)
    }

    const setupEnvironment = () => {
        const hdri = new BabylonJS.HDRCubeTexture(
            "/phitop/burnt_warehouse_4k.hdr",
            scene.current!,
            128,
            false,
            true,
            false,
            true
        );
        scene.current!.environmentTexture = hdri;
        scene.current!.environmentBRDFTexture = hdri;

        const skybox = new BabylonJS.PhotoDome("skybox", "/phitop/burnt_warehouse_4k.hdr", {}, scene.current!)
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
        window.addEventListener("resize", () => {
            engine.current!.resize();
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
            updateCharts();
            engine.current!.hideLoadingUI();
        })
    }

    const toggleSimulation = () => { setSimulate(!simulate); phitop.current!.simulate = !simulate; }

    React.useEffect(() => {
        init();

        return () => {
            engine.current?.hideLoadingUI();
            engine.current?.stopRenderLoop();
        }
    }, []);

    return (
        <div className="w-full h-screen relative">
            <div className='grow h-full'>
                <canvas className="w-full h-full" ref={canvas} />
            </div>
            <div className='w-96 absolute left-0 bottom-0 h-fit flex p-4 gap-3'>
                <Button onClick={toggleSimulation}>
                    {
                        simulate ? <i className='bi bi-pause-fill' />
                                 : <i className='bi bi-play-fill'  />
                    }
                </Button>
                <Button onClick={() => { phitop.current?.reset(); }}>
                    <i className="bi bi-arrow-counterclockwise"></i>
                </Button>
                <Button onClick={() => { overlayHandle.current?.toggle() }}>
                    <i className="bi bi-layout-sidebar-reverse"></i>
                </Button>
            </div>

            <Overlay
                ref={overlayHandle}
            >

                <div className='w-full border-b-2 pb-3 gap-1 flex flex-col border-neutral-500'>
                    <FullButton onClick={updateCharts}>
                        <div>Refresh Graph Data</div>
                        <i className='bi bi-arrow-clockwise'></i>
                    </FullButton>

                    <LicenseOverview />
                </div>

                <div className='flex flex-col items-center gap-3 w-full pt-3 pb-3 p-5'>
                    <div className='w-full text-right flex flex-col gap-3'>
                        <InlineMath math="\vec{v}\ [\frac{\text{m}}{\text{s}}]" />
                        {velocityChart}
                    </div>

                    <div className='w-full text-right flex flex-col gap-3'>
                        <InlineMath math="\vec{\omega}\ [\frac{1}{\text{s}}]" />
                        {angularVelocityChart}
                    </div>

                    <div className='w-full text-right flex flex-col gap-3'>
                        <InlineMath math="E\ [\frac{\text{kg} \cdot \text{m}^2}{\text{s}^2}]" />
                        {energyChart}
                    </div>

                    <div className='w-full text-right flex flex-col gap-3'>
                        <InlineMath math="M\ [\frac{\text{kg} \cdot \text{m}^2}{\text{s}^2}]" />
                        {torqueChart}
                    </div>
                </div>

            </Overlay>
        </div>
    )
}

export default App
