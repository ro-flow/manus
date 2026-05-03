#!/usr/bin/env python3
from PIL import Image
import os

# Source logo
source = "/home/ubuntu/ro-flow/client/public/ro-flow-logo.png"
output_dir = "/home/ubuntu/ro-flow/client/public/icons"

# Icon sizes for PWA
sizes = [72, 96, 128, 144, 152, 192, 384, 512]

# Open source image
img = Image.open(source)

# Convert to RGBA if needed
if img.mode != 'RGBA':
    img = img.convert('RGBA')

# Generate icons
for size in sizes:
    # Resize with high quality
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    
    # Save
    output_path = os.path.join(output_dir, f"icon-{size}x{size}.png")
    resized.save(output_path, "PNG")
    print(f"Generated: {output_path}")

print("Done!")
