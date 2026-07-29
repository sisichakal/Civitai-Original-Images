// ==UserScript==
// @name         _Civitai Original Images & Custom Layout
// @namespace    http://tampermonkey.net/
// @version      2.12
// @description  Display original quality images, fix cropping, adjust gaps, clean layout and filter by megapixels on Civitai.
// @author       You
// @match        https://civitai.com/*
// @match        https://civitai.red/*
// @icon         https://civitai.com/favicon.ico
// @grant        GM_info
// ==/UserScript==
(function() {
    'use strict';
    const IMAGE_WIDTH = 600;
    const MIN_IMAGE_SIZE = 150;     // Min dimension for processing in galleries/feeds
    const BADGE_MAX_DIMENSION = 320; // Originals with both dimensions below this are site badges/decorations, not gallery images
    const SCRIPT_VERSION = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.version : '2.12';
    // Default settings
    const DEFAULT_SETTINGS = {
        filterEnabled: false,
        minMegapixels: 0
    };
    const SETTINGS_KEY = 'civitai_userscript_settings';
    /**
     * Load settings from localStorage (UK English function name)
     */
    function loadSettings() {
        try {
            const sRaw = localStorage.getItem(SETTINGS_KEY);
            if (!sRaw) return { ...DEFAULT_SETTINGS };
            const oParsed = JSON.parse(sRaw);
            return { ...DEFAULT_SETTINGS, ...oParsed };
        } catch (oError) {
            console.error('Failed to load settings:', oError);
            return { ...DEFAULT_SETTINGS };
        }
    }
    /**
     * Save settings to localStorage (UK English function name)
     */
    function saveSettings(oSettings) {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(oSettings));
        } catch (oError) {
            console.error('Failed to save settings:', oError);
        }
    }
    let oSettings = loadSettings();
    /**
     * Check if the current URL is allowed for processing (UK English function name)
     */
    function isUrlAllowed() {
        const sPath = window.location.pathname;
        if (sPath.startsWith('/images') || sPath.startsWith('/models/') || sPath.startsWith('/posts') || sPath.startsWith('/collections/')) {
            return true;
        }
        return sPath === '/' || sPath.startsWith('/user/');
    }
    /**
     * Check if we are on a single image detail page (UK English function name)
     */
    function isSingleImagePage() {
        return window.location.pathname.match(/^\/images\/\d+/);
    }
    /**
     * Check whether an image is a cosmetic badge/decoration (UK English function name)
     * Civitai wraps card decorations (reward badges, contest badges, cosmetics) in a
     * dedicated flex container with a drop-shadow filter, e.g.:
     * <div style="display: flex; filter: drop-shadow(rgba(0,0,0,0.8) 1px 1px 1px);">
     * Gallery images never use this wrapper, so it is a reliable structural signal
     * regardless of the badge's dimensions or alt text.
     */
    function isCosmeticDecoration(oImg) {
        const oParent = oImg.parentElement;
        if (!oParent || !oParent.style) return false;
        const sFilter = oParent.style.filter || '';
        return oParent.style.display === 'flex' && sFilter.includes('drop-shadow');
    }
    /**
     * Hide every cosmetic decoration wrapper on the page (UK English function name)
     * Runs as a sweep so decorations are removed even when their image was
     * already marked as processed by a previous script version.
     */
    function removeCosmeticDecorations() {
        const aImages = document.querySelectorAll('img[class*="EdgeImage"]');
        aImages.forEach(oImg => {
            if (isCosmeticDecoration(oImg)) {
                oImg.parentElement.style.display = 'none';
                oImg.dataset.originalProcessed = 'true';
            }
        });
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
     * Find the card container to hide for a given image (UK English function name)
     */
    function findCardContainer(oImg) {
        // Try to find the outermost card wrapper
        // Common pattern: div.relative.flex.overflow-hidden.rounded-md... (the card with height style)
        let oCandidate = oImg.closest('div.relative.flex.overflow-hidden');
        if (oCandidate) return oCandidate;
        // Fallback: any ancestor with explicit height style (typical of card layouts)
        let oNode = oImg.parentElement;
        while (oNode && oNode !== document.body) {
            if (oNode.style && oNode.style.height && oNode.classList.contains('relative')) {
                return oNode;
            }
            oNode = oNode.parentElement;
        }
        // Last resort: parent of parent
        return oImg.parentElement ? oImg.parentElement.parentElement : null;
    }
    /**
     * Apply megapixel filter to a single processed image (UK English function name)
     */
    function applyFilterToImage(oImg) {
        if (!oImg.dataset.megapixels) return;
        const fMP = parseFloat(oImg.dataset.megapixels);
        const oCard = findCardContainer(oImg);
        if (!oCard) return;
        if (oSettings.filterEnabled && fMP < oSettings.minMegapixels) {
            oCard.dataset.mpHidden = 'true';
            oCard.style.display = 'none';
        } else if (oCard.dataset.mpHidden === 'true') {
            oCard.dataset.mpHidden = '';
            oCard.style.display = '';
        }
    }
    /**
     * Re-apply filter to all processed images (UK English function name)
     */
    function reapplyFilterToAll() {
        const aProcessed = document.querySelectorAll('img[data-megapixels]');
        aProcessed.forEach(oImg => applyFilterToImage(oImg));
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
            /* Civitai now uses CSS-module names like "Cards-module__OuHqJW__image"; */
            /* older builds used "Cards_image__d4f6b". Cover both naming schemes. */
            img[class*="Cards_image_"],
            img[class*="Cards-module"][class*="__image"] {
                object-fit: contain !important;
                background-color: rgba(0,0,0,0.2);
            }
            .gap-4 {
                gap: 0.3em !important;
            }
            /* Settings panel styles */
            #civitai-userscript-settings-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                margin-left: 6px;
                padding: 0;
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 6px;
                background: rgba(255,255,255,0.08);
                color: #fff;
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
                transition: background 0.2s ease, border-color 0.2s ease;
            }
            #civitai-userscript-settings-btn:hover {
                background: rgba(255,255,255,0.18);
                border-color: rgba(255,255,255,0.35);
            }
            #civitai-userscript-settings-btn svg {
                width: 18px;
                height: 18px;
            }
            /* Floating fallback position when the header support button cannot be found */
            #civitai-userscript-settings-btn.cus-floating {
                position: fixed;
                bottom: 16px;
                right: 16px;
                margin-left: 0;
                width: 40px;
                height: 40px;
                z-index: 99998;
                background: rgba(31,31,36,0.92);
                box-shadow: 0 4px 12px rgba(0,0,0,0.45);
            }
            #civitai-userscript-settings-panel {
                position: fixed;
                z-index: 99999;
                width: 320px;
                background: #1f1f24;
                color: #f1f1f1;
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                padding: 14px 16px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 13px;
            }
            #civitai-userscript-settings-panel .cus-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                padding-bottom: 8px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            #civitai-userscript-settings-panel .cus-title {
                font-weight: 700;
                font-size: 13px;
            }
            #civitai-userscript-settings-panel .cus-version {
                font-size: 11px;
                color: #9aa0a6;
            }
            #civitai-userscript-settings-panel .cus-row {
                margin: 10px 0;
            }
            #civitai-userscript-settings-panel .cus-row-label {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 6px;
            }
            #civitai-userscript-settings-panel .cus-switch {
                position: relative;
                display: inline-block;
                width: 36px;
                height: 20px;
            }
            #civitai-userscript-settings-panel .cus-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            #civitai-userscript-settings-panel .cus-slider {
                position: absolute;
                cursor: pointer;
                top: 0; left: 0; right: 0; bottom: 0;
                background-color: #555;
                border-radius: 20px;
                transition: 0.2s;
            }
            #civitai-userscript-settings-panel .cus-slider:before {
                position: absolute;
                content: "";
                height: 14px;
                width: 14px;
                left: 3px;
                bottom: 3px;
                background-color: #fff;
                border-radius: 50%;
                transition: 0.2s;
            }
            #civitai-userscript-settings-panel input:checked + .cus-slider {
                background-color: #3b82f6;
            }
            #civitai-userscript-settings-panel input:checked + .cus-slider:before {
                transform: translateX(16px);
            }
            #civitai-userscript-settings-panel input[type="range"] {
                width: 100%;
                accent-color: #3b82f6;
            }
            #civitai-userscript-settings-panel .cus-slider-row {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            #civitai-userscript-settings-panel .cus-step-btn {
                flex: 0 0 auto;
                width: 26px;
                height: 26px;
                padding: 0;
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 5px;
                background: rgba(255,255,255,0.08);
                color: #fff;
                font-size: 16px;
                font-weight: 700;
                line-height: 1;
                cursor: pointer;
                transition: background 0.15s ease, border-color 0.15s ease;
            }
            #civitai-userscript-settings-panel .cus-step-btn:hover {
                background: rgba(255,255,255,0.18);
                border-color: rgba(255,255,255,0.35);
            }
            #civitai-userscript-settings-panel .cus-step-btn:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }
            #civitai-userscript-settings-panel .cus-legend {
                margin-top: 12px;
                padding-top: 10px;
                border-top: 1px solid rgba(255,255,255,0.1);
            }
            #civitai-userscript-settings-panel .cus-legend-title {
                font-size: 11px;
                font-weight: 600;
                color: #9aa0a6;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
            }
            #civitai-userscript-settings-panel .cus-legend-item {
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 4px 0;
                font-size: 12px;
            }
            #civitai-userscript-settings-panel .cus-legend-swatch {
                width: 14px;
                height: 14px;
                border-radius: 3px;
                flex: 0 0 auto;
            }
            #civitai-userscript-settings-panel .cus-value {
                font-weight: 600;
                color: #3b82f6;
            }
            #civitai-userscript-settings-panel .cus-row.disabled {
                opacity: 0.45;
                pointer-events: none;
            }
        `;
        const oStyle = document.createElement('style');
        oStyle.type = 'text/css';
        oStyle.appendChild(document.createTextNode(sCss));
        document.head.appendChild(oStyle);
    }
    /**
     * Build the settings panel DOM (UK English function name)
     */
    function buildSettingsPanel() {
        if (document.getElementById('civitai-userscript-settings-panel')) return;
        const oPanel = document.createElement('div');
        oPanel.id = 'civitai-userscript-settings-panel';
        oPanel.style.display = 'none';
        oPanel.innerHTML = `
            <div class="cus-header">
                <span class="cus-title">Civitai Userscript</span>
                <span class="cus-version">v${SCRIPT_VERSION}</span>
            </div>
            <div class="cus-row">
                <div class="cus-row-label">
                    <span>Masquer les images &lt; X MP</span>
                    <label class="cus-switch">
                        <input type="checkbox" id="cus-filter-toggle">
                        <span class="cus-slider"></span>
                    </label>
                </div>
            </div>
            <div class="cus-row" id="cus-mp-row">
                <div class="cus-row-label">
                    <span>Seuil minimum</span>
                    <span><span class="cus-value" id="cus-mp-value">0</span> MP</span>
                </div>
                <div class="cus-slider-row">
                    <button type="button" class="cus-step-btn" id="cus-mp-decrease" title="-1 MP">−</button>
                    <input type="range" id="cus-mp-slider" min="0" max="100" step="1" value="0">
                    <button type="button" class="cus-step-btn" id="cus-mp-increase" title="+1 MP">+</button>
                </div>
            </div>
            <div class="cus-legend">
                <div class="cus-legend-title">Légende des couleurs (MP)</div>
                <div class="cus-legend-item"><span class="cus-legend-swatch" style="background:#ef4444"></span><span>&lt; 2 MP</span></div>
                <div class="cus-legend-item"><span class="cus-legend-swatch" style="background:#f97316"></span><span>2 – 3 MP</span></div>
                <div class="cus-legend-item"><span class="cus-legend-swatch" style="background:#22c55e"></span><span>3 – 5 MP</span></div>
                <div class="cus-legend-item"><span class="cus-legend-swatch" style="background:#3b82f6"></span><span>≥ 5 MP</span></div>
            </div>
        `;
        document.body.appendChild(oPanel);
        const oToggle = oPanel.querySelector('#cus-filter-toggle');
        const oSlider = oPanel.querySelector('#cus-mp-slider');
        const oValueLabel = oPanel.querySelector('#cus-mp-value');
        const oMpRow = oPanel.querySelector('#cus-mp-row');
        const oDecreaseBtn = oPanel.querySelector('#cus-mp-decrease');
        const oIncreaseBtn = oPanel.querySelector('#cus-mp-increase');
        /**
         * Update stepper buttons enabled state based on current value
         */
        function updateStepperButtons() {
            const iVal = parseInt(oSlider.value, 10);
            const iMin = parseInt(oSlider.min, 10);
            const iMax = parseInt(oSlider.max, 10);
            oDecreaseBtn.disabled = iVal <= iMin;
            oIncreaseBtn.disabled = iVal >= iMax;
        }
        /**
         * Apply a new MP value and sync UI + storage + filter
         */
        function applyMpValue(iValue) {
            const iMin = parseInt(oSlider.min, 10);
            const iMax = parseInt(oSlider.max, 10);
            let iClamped = Math.max(iMin, Math.min(iMax, iValue));
            oSlider.value = iClamped;
            oSettings.minMegapixels = iClamped;
            oValueLabel.textContent = iClamped;
            saveSettings(oSettings);
            updateStepperButtons();
            reapplyFilterToAll();
        }
        // Initialise from stored settings
        oToggle.checked = oSettings.filterEnabled;
        oSlider.value = oSettings.minMegapixels;
        oValueLabel.textContent = oSettings.minMegapixels;
        oMpRow.classList.toggle('disabled', !oSettings.filterEnabled);
        updateStepperButtons();
        oToggle.addEventListener('change', function() {
            oSettings.filterEnabled = this.checked;
            saveSettings(oSettings);
            oMpRow.classList.toggle('disabled', !oSettings.filterEnabled);
            reapplyFilterToAll();
        });
        oSlider.addEventListener('input', function() {
            applyMpValue(parseInt(this.value, 10));
        });
        oDecreaseBtn.addEventListener('click', function() {
            applyMpValue(parseInt(oSlider.value, 10) - 1);
        });
        oIncreaseBtn.addEventListener('click', function() {
            applyMpValue(parseInt(oSlider.value, 10) + 1);
        });
        // Close panel on outside click
        document.addEventListener('click', function(oEvent) {
            const oBtn = document.getElementById('civitai-userscript-settings-btn');
            if (oPanel.style.display === 'none') return;
            if (oPanel.contains(oEvent.target)) return;
            if (oBtn && oBtn.contains(oEvent.target)) return;
            oPanel.style.display = 'none';
        });
    }
    /**
     * Position the settings panel relative to the settings button (UK English function name)
     */
    function positionSettingsPanel() {
        const oBtn = document.getElementById('civitai-userscript-settings-btn');
        const oPanel = document.getElementById('civitai-userscript-settings-panel');
        if (!oBtn || !oPanel) return;
        const oRect = oBtn.getBoundingClientRect();
        const iPanelHeight = oPanel.offsetHeight || 300;
        // Default: place below the button; flip above if it would overflow the viewport bottom
        let iTop = oRect.bottom + 8;
        if (iTop + iPanelHeight > window.innerHeight - 10) {
            iTop = oRect.top - iPanelHeight - 8;
            if (iTop < 10) iTop = 10;
        }
        let iLeft = oRect.left;
        // Keep within viewport
        const iMaxLeft = window.innerWidth - 320 - 10;
        if (iLeft > iMaxLeft) iLeft = iMaxLeft;
        if (iLeft < 10) iLeft = 10;
        oPanel.style.top = `${iTop}px`;
        oPanel.style.left = `${iLeft}px`;
    }
    /**
     * Find the header support/Pro button to anchor the settings button (UK English function name)
     */
    function findSupportButton() {
        // Current Civitai build: "Pro" button links to /purchase/buzz with a SupportButton-module class
        return document.querySelector('a[class*="SupportButton"]')
            || document.querySelector('a[href*="/purchase/buzz"]')
            // Older builds: the Pro button linked to /pricing
            || document.querySelector('a[href*="/pricing"][href*="support_pro"]')
            || document.querySelector('a[href*="/pricing"]');
    }
    /**
     * Inject the settings button next to the support button, or floating as a fallback (UK English function name)
     */
    function injectSettingsButton() {
        const oExistingBtn = document.getElementById('civitai-userscript-settings-btn');
        const oSupportButton = findSupportButton();
        // If the button already exists as floating but the header anchor is now available,
        // move it into the header (the anchor can appear after the first injection attempt)
        if (oExistingBtn) {
            if (oExistingBtn.classList.contains('cus-floating') && oSupportButton && oSupportButton.parentElement) {
                oExistingBtn.classList.remove('cus-floating');
                oSupportButton.parentElement.insertBefore(oExistingBtn, oSupportButton.nextSibling);
            }
            return;
        }
        const oBtn = document.createElement('button');
        oBtn.id = 'civitai-userscript-settings-btn';
        oBtn.type = 'button';
        oBtn.title = `Civitai Userscript v${SCRIPT_VERSION} - Settings`;
        oBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
        `;
        oBtn.addEventListener('click', function(oEvent) {
            oEvent.preventDefault();
            oEvent.stopPropagation();
            const oPanel = document.getElementById('civitai-userscript-settings-panel');
            if (!oPanel) return;
            if (oPanel.style.display === 'none' || !oPanel.style.display) {
                // Show first so the panel can be measured, then position it
                oPanel.style.display = 'block';
                positionSettingsPanel();
            } else {
                oPanel.style.display = 'none';
            }
        });
        if (oSupportButton && oSupportButton.parentElement) {
            // Insert right after the support button
            oSupportButton.parentElement.insertBefore(oBtn, oSupportButton.nextSibling);
            return;
        }
        // Fallback: floating button so settings stay reachable even if the header layout changes
        oBtn.classList.add('cus-floating');
        document.body.appendChild(oBtn);
    }
    /**
     * Remove specific unwanted badges/elements from the DOM (UK English function name)
     */
    function removeUnwantedElements() {
        const aLeaderboardBadges = document.querySelectorAll('a[href*="/leaderboard/"]');
        aLeaderboardBadges.forEach(oLink => {
            if (oLink.classList.contains('mantine-Badge-root') || oLink.querySelector('.mantine-Badge-label')) {
                oLink.remove();
            }
        });
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
        // Cosmetic decorations (reward/contest badges) are hidden entirely
        if (isCosmeticDecoration(oImg)) {
            oImg.parentElement.style.display = 'none';
            oImg.dataset.originalProcessed = 'true';
            return;
        }
        const bIsSinglePage = isSingleImagePage();
        if (oImg.alt && (/Badge\s*$/i.test(oImg.alt.trim()) || /Avatar\s*$/i.test(oImg.alt.trim()))) {
            oImg.dataset.originalProcessed = 'true';
            return;
        }
        if (bIsSinglePage) {
            // Class-prefix match: CSS-module hashes change on every build,
            // and the naming scheme itself changed (CreatorCard_avatar__x → CreatorCard-module__x__avatar).
            // Matching on the stable component name "CreatorCard" covers both schemes.
            if (oImg.closest('[class*="CreatorCard"]') ||
                oImg.closest('div[style*="max-width: 60px"]') ||
                (oImg.alt && oImg.alt.includes('Avatar'))
            ) {
                oImg.dataset.originalProcessed = 'true';
                return;
            }
        }
        const iCheckWidth = oImg.naturalWidth || oImg.clientWidth;
        if (iCheckWidth > 0 && iCheckWidth < MIN_IMAGE_SIZE) {
            return;
        }
        const sOriginalUrl = oImg.src;
        const sNewUrl = convertToOriginalUrl(sOriginalUrl);
        if (!sNewUrl) return;
        oImg.dataset.originalProcessed = 'true';
        const oTempImg = new Image();
        oTempImg.onload = function() {
            // Skip reward badges and other site decorations: their original files are tiny
            // (typically ~256×256), whereas the smallest generated gallery image is 512×512.
            // Detecting on the ORIGINAL dimensions (not the displayed size) is reliable because
            // the alt text does not always contain "Badge" (e.g. "TheAlly's Granny Grippers!").
            // Leave the element untouched so it is not upscaled to IMAGE_WIDTH.
            if (oTempImg.width < BADGE_MAX_DIMENSION && oTempImg.height < BADGE_MAX_DIMENSION) {
                return;
            }
            if (bIsSinglePage && oTempImg.width < 300) {
                 oImg.dataset.originalProcessed = '';
                 return;
            }
            const fMegapixels = calculateMegapixels(oTempImg.width, oTempImg.height);
            const sColour = getBadgeColour(fMegapixels);
            // Store MP value on the image for filter use
            oImg.dataset.megapixels = fMegapixels;
            oImg.style.border = `1px solid ${sColour}`;
            oImg.style.boxSizing = 'border-box';
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
            if (!bIsSinglePage) {
                const fRatio = oTempImg.height / oTempImg.width;
                const iNewHeight = Math.round(IMAGE_WIDTH * fRatio);
                oImg.src = sNewUrl;
                oImg.style.maxWidth = `${IMAGE_WIDTH}px`;
                oImg.style.height = 'auto';
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
            // Apply the MP filter once processing is done
            applyFilterToImage(oImg);
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
        removeCosmeticDecorations();
        processAllImages();
        removeUnwantedElements();
        removeGhostAdContainers();
        injectSettingsButton();
    }
    /**
     * Process all images (UK English function name)
     */
    function processAllImages() {
        // Civitai's CSS-module naming changed from "EdgeImage_image__hash" to
        // "EdgeImage-module-scss-module__hash__image". Matching on the stable
        // component name "EdgeImage" covers both schemes and future hash changes.
        const aImages = document.querySelectorAll('img[class*="EdgeImage"]');
        aImages.forEach(oImg => processImage(oImg));
    }
    /**
     * Set up observer (UK English function name)
     */
    function setupObserver() {
        const oObserver = new MutationObserver(function(aMutations) {
            let bShouldProcess = false;
            aMutations.forEach(function(oMutation) {
                if (oMutation.addedNodes.length > 0) bShouldProcess = true;
                if (oMutation.type === 'attributes' && oMutation.attributeName === 'class') bShouldProcess = true;
            });
            if (bShouldProcess) {
                // Always try to inject the settings button (works on every URL)
                injectSettingsButton();
                if (isUrlAllowed()) {
                    runProcessing();
                }
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
        injectCustomStyles();
        buildSettingsPanel();
        injectSettingsButton();
        runProcessing();
        setupObserver();
        // Reposition panel on resize/scroll if open
        window.addEventListener('resize', function() {
            const oPanel = document.getElementById('civitai-userscript-settings-panel');
            if (oPanel && oPanel.style.display === 'block') {
                positionSettingsPanel();
            }
        });
        let sLastUrl = location.href;
        setInterval(() => {
            const sUrl = location.href;
            if (sUrl !== sLastUrl) {
                sLastUrl = sUrl;
                if (isUrlAllowed()) {
                    setTimeout(runProcessing, 500);
                    setTimeout(runProcessing, 1500);
                }
                // Re-inject settings button on navigation
                setTimeout(injectSettingsButton, 500);
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
