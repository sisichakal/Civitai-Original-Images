// ==UserScript==
// @name         Civitai Original Images & Custom Layout
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  Display original quality images, fix cropping, adjust gaps, and clean layout on Civitai.
// @author       You
// @match        https://civitai.com/*
// @icon         https://civitai.com/favicon.ico
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const IMAGE_WIDTH = 600;
    const MIN_IMAGE_SIZE = 150;     // Min dimension for processing in galleries/feeds

    /**
     * Check if the current URL is allowed for processing (UK English function name)
     */
    function isUrlAllowed() {
        const sPath = window.location.pathname;

        // Explicitly allow known gallery pages and single image pages
        if (sPath.startsWith('/images') || sPath.startsWith('/models/') || sPath.startsWith('/posts') || sPath.startsWith('/collections/')) {
            return true;
        }

        // Default allow for root and all user profile pages, including /user/xxxxx/images
        return sPath === '/' || sPath.startsWith('/user/');
    }

    /**
     * Check if we are on a single image detail page (UK English function name)
     */
    function isSingleImagePage() {
        return window.location.pathname.match(/^\/images\/\d+/);
    }

    /**
     * Convert optimized URL to original URL (UK English function name)
     */
    function convertToOriginalUrl(sUrl) {
        if (!sUrl || !sUrl.includes('image.civitai.com')) {
            return null;
        }

        const aMatches = sUrl.match(/(https:\/\/image\.civitai\.com\/[^\/]+\/[^\/]+)\//);
        if (!aMatches) {
            return null;
        }

        const sBasePath = aMatches[1];
        return `${sBasePath}/original=true,quality=100,anim=true`;
    }

    /**
     * Calculate megapixels from image dimensions (UK English function name)
     */
    function calculateMegapixels(iWidth, iHeight) {
        const fMegapixels = (iWidth * iHeight) / 1000000;
        return fMegapixels >= 1 ? Math.round(fMegapixels) : Math.round(fMegapixels * 10) / 10;
    }

    /**
     * Get badge colour based on megapixels (UK English function name)
     */
    function getBadgeColour(fMegapixels) {
        if (fMegapixels < 2) {
            return '#ef4444'; // Red
        } else if (fMegapixels < 3) {
            return '#f97316'; // Orange
        } else if (fMegapixels < 5) {
            return '#22c55e'; // Green
        } else {
            return '#3b82f6'; // Blue
        }
    }

    /**
     * Create megapixel badge (UK English function name)
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

        oBadge.addEventListener('mouseenter', function() {
            this.style.opacity = '0.8';
        });

        oBadge.addEventListener('mouseleave', function() {
            this.style.opacity = '1';
        });

        oBadge.addEventListener('click', function(oEvent) {
            oEvent.preventDefault();
            oEvent.stopPropagation();
            window.open(sImageUrl, '_blank');
        });

        return oBadge;
    }

    /**
     * Inject custom CSS to fix layout issues globally (UK English function name)
     */
    function injectCustomStyles() {
        const sCss = `
            /* Fix for cropped images in cards */
            .Cards_image__d4f6b {
                object-fit: contain !important;
                background-color: rgba(0,0,0,0.2);
            }

            /* Target generic card images just in case */
            img[class*="Cards_image_"] {
                object-fit: contain !important;
            }

            /* Reduce gap size as requested */
            .gap-4 {
                gap: 0.3em !important;
            }
        `;

        const oStyle = document.createElement('style');
        oStyle.type = 'text/css';
        oStyle.appendChild(document.createTextNode(sCss));
        document.head.appendChild(oStyle);
    }

    /**
     * Remove specific unwanted badges/elements from the DOM (UK English function name)
     */
    function removeUnwantedElements() {
        // 1. Remove Leaderboard badges
        const aLeaderboardBadges = document.querySelectorAll('a[href*="/leaderboard/"]');
        aLeaderboardBadges.forEach(oLink => {
            if (oLink.classList.contains('mantine-Badge-root') || oLink.querySelector('.mantine-Badge-label')) {
                oLink.remove();
            }
        });

        // 2. Remove "Base Badge" images (stats)
        const aStatIcons = document.querySelectorAll('img[src*="base-badge.png"]');
        aStatIcons.forEach(oIcon => {
            const oBadgeWrapper = oIcon.closest('.mantine-Badge-root') || oIcon.closest('div[style*="background"]');
            if (oBadgeWrapper) {
                oBadgeWrapper.remove();
            } else {
                const oParent = oIcon.parentElement;
                if (oParent) oParent.style.display = 'none';
            }
        });

        // 3. Clean up empty parent containers
        const aPotentialEmptyGroups = document.querySelectorAll('.mantine-Group-root');
        aPotentialEmptyGroups.forEach(oGroup => {
            if (oGroup.children.length === 0 && oGroup.textContent.trim() === '') {
                oGroup.remove();
            }
        });
    }

    /**
     * Remove empty containers left by ad blockers (UK English function name)
     */
    function removeGhostAdContainers() {
        const aDivs = document.querySelectorAll('div[style*="position: absolute"]');
        aDivs.forEach(oDiv => {
            if (oDiv.children.length === 0 && oDiv.innerText.trim() === '' && oDiv.offsetHeight > 0) {
                oDiv.style.display = 'none';
            }
        });
    }

    /**
     * Process a single image element (UK English function name)
     */
    function processImage(oImg) {
        if (!isUrlAllowed()) return;
        if (oImg.dataset.originalProcessed) return;

        const bIsSinglePage = isSingleImagePage();

        // --- FILTERING FOR SINGLE IMAGE PAGE (TO EXCLUDE BADGES/AVATARS) ---
        if (bIsSinglePage) {
            // Structural Blacklist: Skip images that are clearly badges or avatars
            if (oImg.closest('.CreatorCard_avatar__w8yic') ||
                oImg.closest('div[style*="max-width: 60px"]') || // Target the badge container from the example
                (oImg.alt && (oImg.alt.includes('Badge') || oImg.alt.includes('Avatar')))
            ) {
                oImg.dataset.originalProcessed = 'true';
                return;
            }
        }

        // General size filter (applies to all pages)
        const iCheckWidth = oImg.naturalWidth || oImg.clientWidth;
        if (iCheckWidth > 0 && iCheckWidth < MIN_IMAGE_SIZE) {
            return;
        }

        const sOriginalUrl = oImg.src;
        const sNewUrl = convertToOriginalUrl(sOriginalUrl);

        if (!sNewUrl) return;

        oImg.dataset.originalProcessed = 'true';

        // Load original image to get dimensions
        const oTempImg = new Image();
        oTempImg.onload = function() {
            // Final check for single page images to prevent processing large icons
            if (bIsSinglePage && oTempImg.width < 300) {
                 oImg.dataset.originalProcessed = '';
                 return;
            }

            const fMegapixels = calculateMegapixels(oTempImg.width, oTempImg.height);
            const sColour = getBadgeColour(fMegapixels);

            // --- COMMON ACTIONS ---
            oImg.style.border = `1px solid ${sColour}`;
            oImg.style.boxSizing = 'border-box';

            // Add Badge
            const oRelativeParent = oImg.closest('.relative') || oImg.parentNode;
            if (getComputedStyle(oRelativeParent).position === 'static') {
                oRelativeParent.style.position = 'relative';
            }

            if (oRelativeParent) {
                const oExistingBadge = oRelativeParent.querySelector('.civitai-mp-badge');
                if (oExistingBadge) oExistingBadge.remove();

                const oBadge = createMegapixelBadge(oTempImg.width, oTempImg.height, sNewUrl);
                oRelativeParent.appendChild(oBadge);
            }

            // --- GALLERY/FEED ACTIONS ONLY (Not single image page) ---
            if (!bIsSinglePage) {
                const fRatio = oTempImg.height / oTempImg.width;
                const iNewHeight = Math.round(IMAGE_WIDTH * fRatio);

                oImg.src = sNewUrl;

                // Set max width but allow object-fit logic from CSS to handle the rest
                oImg.style.maxWidth = `${IMAGE_WIDTH}px`;
                oImg.style.height = 'auto';

                // Update containers
                const oContainer = oImg.closest('[style*="height:"]');
                if (oContainer) {
                    const sCurrentStyle = oContainer.getAttribute('style');
                    const sNewStyle = sCurrentStyle.replace(/height:\s*[\d\.]+px/, `height: ${iNewHeight}px`);
                    oContainer.setAttribute('style', sNewStyle);
                }

                const oAbsoluteParent = oImg.closest('div[style*="position: absolute"]');
                if (oAbsoluteParent) {
                    const sCurrentStyle = oAbsoluteParent.getAttribute('style');
                    const sNewStyle = sCurrentStyle.replace(/height:\s*[\d\.]+px/, `height: ${iNewHeight}px`);
                    oAbsoluteParent.setAttribute('style', sNewStyle);
                }
            }
        };

        oTempImg.onerror = function() {
            console.error('Failed to load original image:', sNewUrl);
        };

        oTempImg.src = sNewUrl;
    }

    /**
     * Main processing function (UK English function name)
     */
    function runProcessing() {
        if (!isUrlAllowed()) return;

        processAllImages();
        removeUnwantedElements();
        removeGhostAdContainers();
    }

    /**
     * Process all images (UK English function name)
     */
    function processAllImages() {
        const aImages = document.querySelectorAll('img.EdgeImage_image__iH4_q');
        aImages.forEach(oImg => processImage(oImg));
    }

    /**
     * Set up observer (UK English function name)
     */
    function setupObserver() {
        const oObserver = new MutationObserver(function(aMutations) {
            if (!isUrlAllowed()) return;

            let bShouldProcess = false;
            aMutations.forEach(function(oMutation) {
                if (oMutation.addedNodes.length > 0) bShouldProcess = true;
                if (oMutation.type === 'attributes' && oMutation.attributeName === 'class') bShouldProcess = true;
            });

            if (bShouldProcess) {
                runProcessing();
            }
        });

        oObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
    }

    /**
     * Initialise (UK English function name)
     */
    function initialise() {
        // Inject global CSS override immediately
        injectCustomStyles();

        runProcessing();
        setupObserver();

        let sLastUrl = location.href;
        setInterval(() => {
            const sUrl = location.href;
            if (sUrl !== sLastUrl) {
                sLastUrl = sUrl;
                if (isUrlAllowed()) {
                    // Give a slight delay for the page content to load after navigation
                    setTimeout(runProcessing, 500);
                    setTimeout(runProcessing, 1500);
                }
            }
        }, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialise);
    } else {
        initialise();
    }

    window.addEventListener('load', runProcessing);

})();