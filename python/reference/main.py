from rgbmatrix import RGBMatrix, RGBMatrixOptions
import time
import math

# ----- MATRIX CONFIGURATION -----
options = RGBMatrixOptions()
options.rows = 32
options.cols = 64
options.chain_length = 2
options.hardware_mapping = 'adafruit-hat'
options.brightness = 100
options.show_refresh_rate = 1
matrix = RGBMatrix(options=options)

LED_COLOR = (0, 255, 255)  # Cyan

left_panel = []
right_panel = []

for i in range(32):
    left_panel.append([" " for x in range(64)])
    right_panel.append([" " for x in range(64)])


# Helper functions to make drawing easier
def draw_pixel(panel, x, y):
    if 0 <= x < 64 and 0 <= y < 32:
        panel[y][x] = "X"


def draw_line(panel, x0, y0, x1, y1):
    dx = abs(x1 - x0)
    dy = abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy
    
    while True:
        draw_pixel(panel, x0, y0)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x0 += sx
        if e2 < dx:
            err += dx
            y0 += sy


def draw_circle(panel, x0, y0, radius, fill=False):
    for y in range(y0 - radius, y0 + radius + 1):
        for x in range(x0 - radius, x0 + radius + 1):
            # Check if point is within circle
            if (x - x0) ** 2 + (y - y0) ** 2 <= radius ** 2:
                if fill or (x - x0) ** 2 + (y - y0) ** 2 >= (radius - 1) ** 2:
                    draw_pixel(panel, x, y)


def draw_half_circle(panel, x0, y0, radius, direction="left", fill=False):
    for y in range(y0 - radius, y0 + radius + 1):
        for x in range(x0 - radius, x0 + radius + 1):
            # Check if point is within circle
            if (x - x0) ** 2 + (y - y0) ** 2 <= radius ** 2:
                if direction == "left" and x <= x0:
                    if fill or (x - x0) ** 2 + (y - y0) ** 2 >= (radius - 1) ** 2:
                        draw_pixel(panel, x, y)
                elif direction == "right" and x >= x0:
                    if fill or (x - x0) ** 2 + (y - y0) ** 2 >= (radius - 1) ** 2:
                        draw_pixel(panel, x, y)
                elif direction == "top" and y <= y0:
                    if fill or (x - x0) ** 2 + (y - y0) ** 2 >= (radius - 1) ** 2:
                        draw_pixel(panel, x, y)
                elif direction == "bottom" and y >= y0:
                    if fill or (x - x0) ** 2 + (y - y0) ** 2 >= (radius - 1) ** 2:
                        draw_pixel(panel, x, y)


def draw_triangle(panel, x0, y0, x1, y1, x2, y2, fill=False):
    draw_line(panel, x0, y0, x1, y1)
    draw_line(panel, x1, y1, x2, y2)
    draw_line(panel, x2, y2, x0, y0)
    
    if fill:
        # Simple fill algorithm - not perfect but works for small triangles
        min_x = min(x0, x1, x2)
        max_x = max(x0, x1, x2)
        min_y = min(y0, y1, y2)
        max_y = max(y0, y1, y2)
        
        for y in range(min_y, max_y + 1):
            for x in range(min_x, max_x + 1):
                # Simple check if point is inside triangle
                # Not accurate for all cases but works for simple shapes
                if is_point_in_triangle(x, y, x0, y0, x1, y1, x2, y2):
                    draw_pixel(panel, x, y)


def is_point_in_triangle(px, py, x0, y0, x1, y1, x2, y2):

    def sign(p1x, p1y, p2x, p2y, p3x, p3y):
        return (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y)
    
    d1 = sign(px, py, x0, y0, x1, y1)
    d2 = sign(px, py, x1, y1, x2, y2)
    d3 = sign(px, py, x2, y2, x0, y0)
    
    has_neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    has_pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    
    return not (has_neg and has_pos)


def draw_wavy_line(panel, start_x, end_x, base_y, thickness=1, amplitude=3, wavelength=10, phase=0):
    for x in range(start_x, end_x + 1):
        if 0 <= x < 64:
            # Calculate sine wave
            y_offset = amplitude * math.sin((x - start_x + phase) / wavelength * 2 * math.pi)
            y = int(base_y + y_offset)
            
            # Draw pixel at calculated position
            for t in range(thickness):
                if 0 <= y + t < 32:
                    draw_pixel(panel, x, y + t)


# Convert panel array to string arrays for the renderer
def panel_to_strings(panel):
    result = []
    for row in panel:
        result.append(''.join(row))
    return result


# Function to render panels to the matrix
def render_panels(left_panel, right_panel, matrix, color):
    matrix.Fill(0, 0, 0)
    
    # Convert panels to string arrays if they're not already
    left_strings = left_panel if isinstance(left_panel[0], str) else panel_to_strings(left_panel)
    right_strings = right_panel if isinstance(right_panel[0], str) else panel_to_strings(right_panel)
    
    # Render left panel
    for y, row in enumerate(left_strings):
        for x, pixel in enumerate(row):
            if pixel == 'X':
                matrix.SetPixel(x, y, *color)
    
    # Render right panel
    for y, row in enumerate(right_strings):
        for x, pixel in enumerate(row):
            if pixel == 'X':
                matrix.SetPixel(x + 64, y, *color)


# Draw the protogen face
# === LEFT PANEL ===
draw_half_circle(left_panel, 10, 0, 10, "bottom", fill=True)  # Eye
draw_triangle(left_panel, 63, 0, 63, 5, 58, 0, fill=True)  # Nose
draw_wavy_line(left_panel, 8, 64, 27, 2, amplitude=3, wavelength=32)  # Mouth

# === RIGHT PANEL ===
draw_half_circle(right_panel, 53, 0, 10, "bottom", fill=True)  # Eye
draw_triangle(right_panel, 0, 0, 0, 5, 5, 0, fill=True)  # Nose
draw_wavy_line(right_panel, 0, 56, 27, 2, amplitude=3, wavelength=32)  # Mouth


def create_blink_panels():
    blink_left = [row[:] for row in left_panel]
    blink_right = [row[:] for row in right_panel]
    
    # Clear the eye areas
    for y in range(0, 20):
        for x in range(0, 20):
            blink_left[y][x] = " "
            blink_right[y][x + 44] = " "
    
    draw_line(blink_left, 5, 10, 15, 10)
    draw_line(blink_right, 48, 10, 58, 10)
    
    return panel_to_strings(blink_left), panel_to_strings(blink_right)


try:
    left_strings = panel_to_strings(left_panel)
    right_strings = panel_to_strings(right_panel)
    
    blink_left, blink_right = create_blink_panels()
    
    while True:
        # Normal face
        render_panels(left_strings, right_strings, matrix, LED_COLOR)
        time.sleep(3)
        
        # Blinking
        render_panels(blink_left, blink_right, matrix, LED_COLOR)
        time.sleep(0.2)
        
except KeyboardInterrupt:
    matrix.Clear()
