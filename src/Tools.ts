import { Matrix, Vector3 } from "@babylonjs/core";

export const dyad = (a: Vector3, b: Vector3) => {
    return Matrix.FromArray([
        a.x * b.x, a.x * b.y, a.x * b.z, 0,
        a.y * b.x, a.y * b.y, a.y * b.z, 0,
        a.z * b.x, a.z * b.y, a.z * b.z, 0,
        0, 0, 0, 1
    ])
}