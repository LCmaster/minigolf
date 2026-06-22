import trimesh
import numpy as np
import os

OUTPUT_DIR = "static/block"

def create_box(extents, name, transform=None):
    mesh = trimesh.creation.box(extents=extents)
    if transform is not None:
        mesh.apply_transform(transform)
    return mesh, name

def build_straight():
    scene = trimesh.Scene()
    # Floor: 2x wide, 0.2 thick, 2x long.
    # Center of floor at Y = -0.1 so top surface is at Y=0.
    floor_tf = trimesh.transformations.translation_matrix([0, -0.1, 0])
    ground, _ = create_box([2, 0.2, 2], "ground", floor_tf)
    scene.add_geometry(ground, node_name="ground_mesh")

    # Walls: left wall at X = -0.75, width=0.5 (goes from -1.0 to -0.5). Height=0.5 above floor.
    # Y center is 0.25.
    left_tf = trimesh.transformations.translation_matrix([-0.75, 0.25, 0])
    wall_left, _ = create_box([0.5, 0.5, 2], "wall_left", left_tf)
    scene.add_geometry(wall_left, node_name="wall_left")

    right_tf = trimesh.transformations.translation_matrix([0.75, 0.25, 0])
    wall_right, _ = create_box([0.5, 0.5, 2], "wall_right", right_tf)
    scene.add_geometry(wall_right, node_name="wall_right")
    
    return scene

def build_turn():
    scene = trimesh.Scene()
    # A 90-degree corner. Ground is 2x2.
    floor_tf = trimesh.transformations.translation_matrix([0, -0.1, 0])
    ground, _ = create_box([2, 0.2, 2], "ground", floor_tf)
    scene.add_geometry(ground, node_name="ground_mesh")
    
    # Outer corner wall. L-shape for simplicity.
    left_tf = trimesh.transformations.translation_matrix([-0.75, 0.25, 0])
    wall_left, _ = create_box([0.5, 0.5, 2], "wall_left", left_tf)
    scene.add_geometry(wall_left, node_name="wall_outer_1")
    
    # Far wall covers from X=-0.5 to X=1.
    far_tf = trimesh.transformations.translation_matrix([0.25, 0.25, -0.75])
    wall_far, _ = create_box([1.5, 0.5, 0.5], "wall_far", far_tf)
    scene.add_geometry(wall_far, node_name="wall_outer_2")
    
    # Inner corner wall. covers from X=0.5 to 1, Z=0.5 to 1.
    inner_tf = trimesh.transformations.translation_matrix([0.75, 0.25, 0.75])
    wall_inner, _ = create_box([0.5, 0.5, 0.5], "wall_inner", inner_tf)
    scene.add_geometry(wall_inner, node_name="wall_inner")

    return scene

def build_ramp_1(): return build_slope(0.5)
def build_ramp_2(): return build_slope(1.0)
def build_ramp_3(): return build_slope(1.5)

def build_intersection():
    scene = trimesh.Scene()
    floor_tf = trimesh.transformations.translation_matrix([0, -0.1, 0])
    ground, _ = create_box([2, 0.2, 2], "ground", floor_tf)
    scene.add_geometry(ground, node_name="ground_mesh")
    
    # 4 corner pillars. width=0.5, depth=0.5
    tf1 = trimesh.transformations.translation_matrix([-0.75, 0.25, -0.75])
    tf2 = trimesh.transformations.translation_matrix([0.75, 0.25, -0.75])
    tf3 = trimesh.transformations.translation_matrix([-0.75, 0.25, 0.75])
    tf4 = trimesh.transformations.translation_matrix([0.75, 0.25, 0.75])
    
    p1, _ = create_box([0.5, 0.5, 0.5], "wall_1", tf1)
    p2, _ = create_box([0.5, 0.5, 0.5], "wall_2", tf2)
    p3, _ = create_box([0.5, 0.5, 0.5], "wall_3", tf3)
    p4, _ = create_box([0.5, 0.5, 0.5], "wall_4", tf4)
    
    scene.add_geometry(p1, node_name="wall_1")
    scene.add_geometry(p2, node_name="wall_2")
    scene.add_geometry(p3, node_name="wall_3")
    scene.add_geometry(p4, node_name="wall_4")
    
    return scene

def build_slope(height):
    scene = trimesh.Scene()
    
    # Floor thickness: 0.2
    # Slope goes from Z=1 (y=0) to Z=-1 (y=height)
    vertices = np.array([
        [-1, 0, 1], [1, 0, 1], [1, height, -1], [-1, height, -1],
        [-1, -0.2, 1], [1, -0.2, 1], [1, height-0.2, -1], [-1, height-0.2, -1]
    ])
    faces = np.array([
        [0, 1, 2], [0, 2, 3], # top
        [4, 6, 5], [4, 7, 6], # bottom
        [0, 4, 5], [0, 5, 1], # front
        [3, 2, 6], [3, 6, 7], # back
        [0, 3, 7], [0, 7, 4], # left
        [1, 5, 6], [1, 6, 2], # right
    ])
    ground = trimesh.Trimesh(vertices=vertices, faces=faces)
    scene.add_geometry(ground, node_name="ground_mesh")
    
    # Left Wall
    w_left_verts = np.copy(vertices)
    w_left_verts[:,0] = [-1, -0.5, -0.5, -1, -1, -0.5, -0.5, -1] # X bounds
    w_left_verts[0:4, 1] += 0.5 # top Y + 0.5
    wall_left = trimesh.Trimesh(vertices=w_left_verts, faces=faces)
    scene.add_geometry(wall_left, node_name="wall_left")
    
    # Right Wall
    w_right_verts = np.copy(vertices)
    w_right_verts[:,0] = [0.5, 1, 1, 0.5, 0.5, 1, 1, 0.5] # X bounds
    w_right_verts[0:4, 1] += 0.5 # top Y + 0.5
    wall_right = trimesh.Trimesh(vertices=w_right_verts, faces=faces)
    scene.add_geometry(wall_right, node_name="wall_right")
    
    return scene

def build_slope_1(): return build_slope(0.5)
def build_slope_2(): return build_slope(1.0)
def build_slope_3(): return build_slope(1.5)

def save_scene(scene, output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    scene.export(output_path, file_type="glb")
    print(f"Exported: {output_path}")

def main():
    generators = {
        "straight/1.glb": build_straight,
        "turn/1.glb": build_turn,
        "ramp/1.glb": build_ramp_1,
        "ramp/2.glb": build_ramp_2,
        "ramp/3.glb": build_ramp_3,
        "intersection/1.glb": build_intersection,
        "slope/1.glb": build_slope_1,
        "slope/2.glb": build_slope_2,
        "slope/3.glb": build_slope_3,
    }
    for rel_path, gen_func in generators.items():
        print(f"Generating {rel_path}...")
        scene = gen_func()
        save_scene(scene, os.path.join(OUTPUT_DIR, rel_path))
    print("Done!")

if __name__ == "__main__":
    main()
