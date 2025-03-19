#!/bin/bash

# Copy the base SVG to favicon.svg
cp base.svg favicon.svg

# Create a simple placeholder for each size
SIZES=(72 96 128 144 152 192 384 512)

for size in "${SIZES[@]}"; do
  echo "Creating icon-${size}x${size}.png"
  # Create a simple placeholder icon
  echo "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${size}\" height=\"${size}\" viewBox=\"0 0 ${size} ${size}\" fill=\"none\"><rect width=\"${size}\" height=\"${size}\" rx=\"${size/4}\" fill=\"#3b82f6\"/><text x=\"50%\" y=\"50%\" font-family=\"Arial\" font-size=\"${size/3}\" fill=\"white\" text-anchor=\"middle\" dominant-baseline=\"middle\">IAM</text></svg>" > "icon-${size}x${size}.svg"
  
  # If the png doesn't exist or is empty, create a placeholder
  if [ ! -s "icon-${size}x${size}.png" ]; then
    echo "Creating empty placeholder for icon-${size}x${size}.png"
    touch "icon-${size}x${size}.png"
  fi
done

# Copy for apple-touch-icon.png
cp icon-152x152.svg apple-touch-icon.svg
if [ ! -s "apple-touch-icon.png" ]; then
  touch apple-touch-icon.png
fi

# Copy for og-image.png (typically larger)
cp icon-512x512.svg og-image.svg
if [ ! -s "og-image.png" ]; then
  touch og-image.png
fi

echo "Icon generation completed!"
