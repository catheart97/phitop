import React from "react";
import * as BabylonJS from '@babylonjs/core';


export const AppBabylon = () => {
    const canvasRef = React.createRef<HTMLCanvasElement>();

    const engine = React.useRef<BabylonJS.Engine>();
    const scene = React.useRef<BabylonJS.Scene>();

    const init = async () => {
        engine.current = new BabylonJS.Engine(canvasRef.current, true);
        scene.current = new BabylonJS.Scene(engine.current);
        
        const box = BabylonJS.CreateBox("box", {
            width: 1,
            height: 1,
            depth: 1
        }, scene.current);
        const mat = new BabylonJS.StandardMaterial("boxMat", scene.current);
        mat.diffuseColor = new BabylonJS.Color3(0, 0, 1);
        box.material = mat;

        const light = new BabylonJS.HemisphericLight("light", new BabylonJS.Vector3(0, 1, 0), scene.current);
        light.intensity = 0.7;

        const camera = new BabylonJS.ArcRotateCamera("camera", 0, 0, 10, new BabylonJS.Vector3(0, 0, 0), scene.current);

        camera.attachControl(canvasRef.current, true);

        canvasRef.current!.addEventListener("resize", () => {
            engine.current!.resize();
        });

        engine.current.runRenderLoop(() => {
            scene.current!.render();
        });

        engine.current.resize();
    }

    React.useEffect(() => {
        init();
    }, []);

    return (
        <div className="h-screen w-full">
            <canvas ref={canvasRef} className="h-full w-full bg-black"></canvas>
        </div>
    )
}