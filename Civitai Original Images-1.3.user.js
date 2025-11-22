// ==UserScript==
// @name         Civitai Original Images
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Display original quality images with correct aspect ratio on Civitai
// @author       You
// @match        https://civitai.com/images
// @match        https://civitai.com/images?*
// @icon         https://civitai.com/favicon.ico
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const IMAGE_WIDTH = 1050;

    /**
     * Convert optimized URL to original URL
     */
    function convertToOriginalUrl(sUrl) {
        if (!sUrl || !sUrl.includes('image.civitai.com')) {
            return null;
        }

        // Extract the base path and image ID
        const aMatches = sUrl.match(/(https:\/\/image\.civitai\.com\/[^\/]+\/[^\/]+)\//);
        if (!aMatches) {
            return null;
        }

        const sBasePath = aMatches[1];
        return `${sBasePath}/original=true,quality=100,anim=true`;
    }

    /**
     * Calculate megapixels from image dimensions
     */
    function calculateMegapixels(iWidth, iHeight) {
        const fMegapixels = (iWidth * iHeight) / 1000000;
        return fMegapixels >= 1 ? Math.round(fMegapixels) : Math.round(fMegapixels * 10) / 10;
    }

    /**
     * Get badge color based on megapixels
     */
    function getBadgeColour(fMegapixels) {
        if (fMegapixels < 6) {
            return '#ef4444'; // Red
        } else if (fMegapixels < 10) {
            return '#f97316'; // Orange
        } else if (fMegapixels < 20) {
            return '#22c55e'; // Green
        } else {
            return '#3b82f6'; // Blue
        }
    }

    /**
     * Create megapixel badge
     */
    function createMegapixelBadge(iWidth, iHeight, sImageUrl) {
        const fMegapixels = calculateMegapixels(iWidth, iHeight);
        const sBadgeText = `${fMegapixels}MP`;
        const sColour = getBadgeColour(fMegapixels);

        const oBadge = document.createElement('div');
        oBadge.style.cssText = `
            position: absolute;
            bottom: 8px;
            left: 8px;
            background: ${sColour};
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            z-index: 10;
            pointer-events: auto;
            backdrop-filter: blur(4px);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            cursor: pointer;
            transition: opacity 0.2s ease;
        `;
        oBadge.textContent = sBadgeText;
        oBadge.className = 'civitai-mp-badge';
        oBadge.title = `${iWidth}×${iHeight} - Click to open full image`;

        // Add hover effect
        oBadge.addEventListener('mouseenter', function() {
            this.style.opacity = '0.8';
        });

        oBadge.addEventListener('mouseleave', function() {
            this.style.opacity = '1';
        });

        // Open image in new tab on click
        oBadge.addEventListener('click', function(oEvent) {
            oEvent.preventDefault();
            oEvent.stopPropagation();
            window.open(sImageUrl, '_blank');
        });

        return oBadge;
    }

    /**
     * Process a single image element
     */
    function processImage(oImg) {
        // Avoid processing the same image multiple times
        if (oImg.dataset.originalProcessed) {
            return;
        }

        const sOriginalUrl = oImg.src;
        const sNewUrl = convertToOriginalUrl(sOriginalUrl);

        if (!sNewUrl) {
            return;
        }

        oImg.dataset.originalProcessed = 'true';

        // Load original image to get dimensions
        const oTempImg = new Image();
        oTempImg.onload = function() {
            const fRatio = oTempImg.height / oTempImg.width;
            const iNewHeight = Math.round(IMAGE_WIDTH * fRatio);
            const fMegapixels = calculateMegapixels(oTempImg.width, oTempImg.height);
            const sColour = getBadgeColour(fMegapixels);

            // Update image source and dimensions with colored border
            oImg.src = sNewUrl;
            oImg.style.maxWidth = `${IMAGE_WIDTH}px`;
            oImg.style.height = 'auto';
            oImg.style.border = `1px solid ${sColour}`;
            oImg.style.boxSizing = 'border-box';

            // Update parent container height
            const oContainer = oImg.closest('[style*="height:"]');
            if (oContainer) {
                const sCurrentStyle = oContainer.getAttribute('style');
                const sNewStyle = sCurrentStyle.replace(/height:\s*\d+px/, `height: ${iNewHeight}px`);
                oContainer.setAttribute('style', sNewStyle);
            }

            // Update absolute positioned parent
            const oAbsoluteParent = oImg.closest('div[style*="position: absolute"]');
            if (oAbsoluteParent) {
                const sCurrentStyle = oAbsoluteParent.getAttribute('style');
                const sNewStyle = sCurrentStyle.replace(/height:\s*\d+px/, `height: ${iNewHeight}px`);
                oAbsoluteParent.setAttribute('style', sNewStyle);
            }

            // Add megapixel badge
            const oRelativeParent = oImg.closest('.relative');
            if (oRelativeParent) {
                // Remove existing badge if any
                const oExistingBadge = oRelativeParent.querySelector('.civitai-mp-badge');
                if (oExistingBadge) {
                    oExistingBadge.remove();
                }

                const oBadge = createMegapixelBadge(oTempImg.width, oTempImg.height, sNewUrl);
                oRelativeParent.appendChild(oBadge);
            }
        };

        oTempImg.onerror = function() {
            console.error('Failed to load original image:', sNewUrl);
        };

        oTempImg.src = sNewUrl;
    }

    /**
     * Process all images on the page
     */
    function processAllImages() {
        const aImages = document.querySelectorAll('img.EdgeImage_image__iH4_q');
        aImages.forEach(oImg => processImage(oImg));
    }

    /**
     * Set up observer for dynamically loaded images (infinite scroll)
     */
    function setupObserver() {
        const oObserver = new MutationObserver(function(aMutations) {
            aMutations.forEach(function(oMutation) {
                oMutation.addedNodes.forEach(function(oNode) {
                    if (oNode.nodeType === 1) { // Element node
                        // Check if the node itself is an image
                        if (oNode.matches && oNode.matches('img.EdgeImage_image__iH4_q')) {
                            processImage(oNode);
                        }
                        // Check for images within the node
                        const aImages = oNode.querySelectorAll('img.EdgeImage_image__iH4_q');
                        aImages.forEach(oImg => processImage(oImg));
                    }
                });
            });
        });

        oObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            processAllImages();
            setupObserver();
        });
    } else {
        processAllImages();
        setupObserver();
    }

    // Also process on window load to catch any late-loaded images
    window.addEventListener('load', processAllImages);
})();
