import trimesh

vertices = [
    [-1.0, 0.0, 1.0], [1.0, 0.0, 1.0], [1.0, 1.0, 1.0],
    [-1.0, 0.0, -1.0], [1.0, 0.0, -1.0], [1.0, 1.0, -1.0]
]
faces = [
    [0, 1, 2],
    [5, 4, 3],
    [0, 3, 4], [0, 4, 1],
    [1, 4, 5], [1, 5, 2],
    [0, 2, 5], [0, 5, 3]
]

mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
mesh.visual.vertex_colors = [86, 125, 70, 255] # groundMaterial color #567D46

scene = trimesh.Scene([mesh])
scene.export('./static/block/ramp/1.glb')
print("Successfully generated ramp 1.glb")
