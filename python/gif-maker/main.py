import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
from matplotlib.animation import FuncAnimation


def hex_to_rgb(hex_color):
    """Convert hex color string to RGB tuple with values from 0 to 1."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4))


def create_rotating_cube_gif(
    filename="rotating_cube.gif",
    width=64,
    height=32,
    fps=30,
    frames=120,
    cube_size=10.0,  # This will now control the relative size within the view
    bg_color="#000000",  # Default black background
    edge_color="#FFFFFF",  # Default white edges
    fill_cube=False,  # Whether to fill the cube faces
):
    """
    Creates a GIF of a rotating 3D cube.

    Args:
        filename (str): The name of the output GIF file.
        width (int): The width of the image in pixels.
        height (int): The height of the image in pixels.
        fps (int): Frames per second for the GIF.
        frames (int): Total number of frames in the GIF.
        cube_size (float): Relative size of the cube (1.0 = small, 10.0 = medium, 50.0 = large).
        bg_color (str): Background color in hex format (e.g. "#000000" for black).
        edge_color (str): Color of cube edges in hex format (e.g. "#FFFFFF" for white).
        fill_cube (bool): Whether to fill the cube faces.
    """
    # Convert hex colors to RGB
    bg_rgb = hex_to_rgb(bg_color)
    edge_rgb = hex_to_rgb(edge_color)

    # Create figure with appropriate size
    fig = plt.figure(figsize=(width / 100, height / 100), dpi=100)
    fig.patch.set_facecolor(bg_rgb)
    
    # Create 3D axes with fixed limits
    ax = fig.add_subplot(111, projection="3d")
    
    # Fixed view size - cube_size controls how much of this space the cube takes up
    ax.set_xlim([-10, 10])
    ax.set_ylim([-10, 10])
    ax.set_zlim([-10, 10])
    
    # Force equal aspect ratio
    ax.set_box_aspect([1, 1, 1])
    ax.axis("off")
    ax.set_facecolor(bg_rgb)

    # Calculate relative size as percentage of view space
    # Map cube_size from 1-50 range to 5%-90% of view space
    relative_size = 0.05 + (min(cube_size, 50) / 50) * 0.85
    actual_size = 20 * relative_size  # 20 = total view space (-10 to 10)
    
    # Define unit cube vertices (from -1 to 1)
    unit_vertices = np.array([
        [-1, -1, -1],  # 0
        [1, -1, -1],  # 1
        [1, 1, -1],  # 2
        [-1, 1, -1],  # 3
        [-1, -1, 1],  # 4
        [1, -1, 1],  # 5
        [1, 1, 1],  # 6
        [-1, 1, 1],  # 7
    ])
    
    # Scale to the desired size
    vertices = unit_vertices * (actual_size / 2)
    
    print(f"Requested cube size: {cube_size}")
    print(f"Relative size: {relative_size * 100:.1f}% of view")
    print(f"Actual size in coord space: {actual_size}")
    print(f"Vertex bounds: {np.min(vertices)} to {np.max(vertices)}")

    # Cube edges
    edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],  # Bottom face
        [4, 5], [5, 6], [6, 7], [7, 4],  # Top face
        [0, 4], [1, 5], [2, 6], [3, 7],  # Connecting edges
    ]

    # Line width based on image size
    line_width = max(1, min(width, height) / 32)
    lines = [ax.plot([], [], [], color=edge_rgb, linewidth=line_width)[0] for _ in range(len(edges))]

    # Define faces
    faces = [
        [0, 1, 2, 3],  # Bottom face (-z)
        [4, 5, 6, 7],  # Top face (+z)
        [0, 1, 5, 4],  # Front face (-y)
        [2, 3, 7, 6],  # Back face (+y)
        [0, 3, 7, 4],  # Left face (-x)
        [1, 2, 6, 5],  # Right face (+x)
    ]
    
    # Face colors
    face_colors = [
        [edge_rgb[0] * 0.8, edge_rgb[1] * 0.8, edge_rgb[2] * 0.8],
        [edge_rgb[0] * 0.9, edge_rgb[1] * 0.9, edge_rgb[2] * 0.9],
        [edge_rgb[0] * 0.7, edge_rgb[1] * 0.7, edge_rgb[2] * 0.7],
        [edge_rgb[0] * 0.6, edge_rgb[1] * 0.6, edge_rgb[2] * 0.6],
        [edge_rgb[0] * 0.5, edge_rgb[1] * 0.5, edge_rgb[2] * 0.5],
        [edge_rgb[0] * 0.4, edge_rgb[1] * 0.4, edge_rgb[2] * 0.4],
    ]

    # For filled cube, create a Poly3DCollection
    face_collection = None
    if fill_cube:
        face_collection = Poly3DCollection(
            [[[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]] for _ in range(len(faces))],
            alpha=0.7,
            linewidths=line_width * 0.5,
            edgecolors=edge_rgb
        )
        face_collection.set_facecolor(face_colors)
        ax.add_collection3d(face_collection)

    def update(frame):
        angle = 2 * np.pi * frame / frames  # Full rotation
        
        # Create rotation matrices
        rotation_x = np.array([
            [1, 0, 0],
            [0, np.cos(angle * 0.7), -np.sin(angle * 0.7)],
            [0, np.sin(angle * 0.7), np.cos(angle * 0.7)],
        ])
        
        rotation_y = np.array([
            [np.cos(angle), 0, np.sin(angle)],
            [0, 1, 0],
            [-np.sin(angle), 0, np.cos(angle)],
        ])
        
        # Combine rotations
        rotation_matrix = rotation_y @ rotation_x
        
        # Translation scaled by cube size
        translation_scale = actual_size * 0.05  # 5% of cube size for translation
        translation = np.array([
            translation_scale * np.sin(2 * angle),
            translation_scale * np.cos(3 * angle),
            translation_scale * np.sin(angle),
        ])

        rotated_vertices = vertices @ rotation_matrix + translation

        # Update the lines (edges)
        for i, (start, end) in enumerate(edges):
            x = [rotated_vertices[start, 0], rotated_vertices[end, 0]]
            y = [rotated_vertices[start, 1], rotated_vertices[end, 1]]
            z = [rotated_vertices[start, 2], rotated_vertices[end, 2]]
            lines[i].set_data(x, y)
            lines[i].set_3d_properties(z)

        # Update the filled faces if needed
        if fill_cube and face_collection is not None:
            face_polygons = []
            for face_idx in faces:
                face_verts = rotated_vertices[face_idx]
                face_polygons.append(face_verts)
            
            face_collection.set_verts(face_polygons)
        
        return lines

    ani = FuncAnimation(fig, update, frames=frames, blit=True)

    # Save as GIF using imageio
    ani.save(filename, writer="pillow", fps=fps)

    plt.close(fig)  # Close the figure to release memory
    print(f"GIF saved as {filename}")


if __name__ == "__main__":
    create_rotating_cube_gif(
        filename="rotating_cube.gif",
        width=128,
        height=32,
        fps=30,
        frames=120,
        cube_size=50.0,
        bg_color="#000000",
        edge_color="#00FF00",
        fill_cube=True,
    )
    
