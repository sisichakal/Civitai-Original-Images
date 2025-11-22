
# Civitai Original Images

A Tampermonkey userscript that displays original quality images with correct aspect ratios on Civitai's image gallery, replacing the optimised thumbnails.

## Features

**High-Quality Images**
Automatically replaces optimised thumbnails with original quality images at 100% quality with animations enabled.

**Correct Aspect Ratios**
Displays images in their true aspect ratio (600px width) whilst maintaining the original dimensions.

**Visual Quality Indicators**
Each image features a colour-coded border and megapixel badge indicating resolution quality:
- Red: Less than 6 MP
- Orange: 6-10 MP
- Green: 10-20 MP
- Blue: Over 20 MP

**Quick Image Access**
Click the MP badge to open the full-resolution image in a new tab.

**Infinite Scroll Support**
Automatically processes new images as they load during scrolling, ensuring all content benefits from the enhancement.

## Installation

Install Tampermonkey for your browser:
- [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- [Firefox](https://addons.mozilla.org/en-GB/firefox/addon/tampermonkey/)
- [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
- [Safari](https://apps.apple.com/gb/app/tampermonkey/id1482490089)

Click on the Tampermonkey icon in your browser and select "Create a new script". Delete the default content and paste the script code. Save the script (File → Save or Ctrl+S).

## Usage

Navigate to [https://civitai.com/images](https://civitai.com/images). The script activates automatically and begins processing images as they appear.

**MP Badge**
The badge in the bottom-left corner of each image displays the resolution in megapixels. Click it to open the full-resolution image in a new tab. Hover over the badge to see exact dimensions.

**Colour Coding**
The border colour provides instant visual feedback about image quality, allowing you to quickly identify high-resolution content.

## Configuration

You can modify the `IMAGE_WIDTH` constant at the top of the script to adjust the display width (default: 600px).

```javascript
const IMAGE_WIDTH = 600; // Change this value as needed
```

To adjust the megapixel colour thresholds, modify the `getBadgeColour` function.

## Technical Details

The script intercepts image URLs and converts them from the optimised format to the original format:

**Before**
```
https://image.civitai.com/.../anim=false,width=450,optimised=true/image.jpeg
```

**After**
```
https://image.civitai.com/.../original=true,quality=100,anim=true
```

A temporary image loads in the background to retrieve original dimensions, which are then used to calculate the correct aspect ratio and megapixel count.

## Browser Compatibility

Tested and working on modern browsers with Tampermonkey support including Chrome, Firefox, Edge, and Safari.

## Licence

This script is released under the MIT Licence. Feel free to modify and distribute as needed.

## Contributing

Contributions, issues, and feature requests are welcome. Feel free to check the issues page if you want to contribute.

## Acknowledgements

Created for the Civitai community to enhance the image browsing experience.

***

Would you like me to adjust any section or add additional information such as troubleshooting tips or known limitations?
