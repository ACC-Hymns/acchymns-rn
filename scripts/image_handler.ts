import { BookSummary } from "@/constants/types";
import { HYMNAL_FOLDER } from "./hymnals";
import { File, Paths } from 'expo-file-system/next';
import { Colors } from "@/constants/Colors";
import { Platform } from "react-native";


async function getHTMLStringFromSong(
    bookData: BookSummary,
    songId: string,
    inverted: boolean,
    theme: 'dark' | 'light',
    headerHeight: number
) {
    let isLiquidGlass = false;
    if (Platform.OS === 'ios') {
        const majorVersion = parseInt(Platform.Version, 10);
        if (majorVersion >= 26) {
            isLiquidGlass = true;
        }
    }
    // Build file path and get base64 content
    const fileExtension = bookData.fileExtension;
    const filePath = `${HYMNAL_FOLDER}/${bookData.name.short}/songs/${songId}.${fileExtension}`.replace(/\/\//g, '/');
    const normalizedFilePath = filePath.replace(/\\/g, '/').replace(/\/\//g, '/');
    const file = new File(Paths.document, normalizedFilePath);
    const base64 = await file.base64();

    // Determine if file is PDF
    const isPDF = fileExtension === 'pdf';

    // Create appropriate data URI based on file extension
    const mimeType = isPDF ? 'application/pdf' :
        fileExtension === 'png' ? 'image/png' :
            fileExtension === 'jpg' || fileExtension === 'jpeg' ? 'image/jpeg' :
                'image/png'; // Default to PNG if unknown
    const dataUri = `data:${mimeType};base64,${base64}`;

    // Calculate header height as percentage of viewport height
    const headerHeightVh = isLiquidGlass ? headerHeight * 110 : 0;

    // Common CSS for both PDF and image viewers
    const commonCSS = `
    body, html {
        margin: 0;
        padding: 0;
        width: 100%;
        background-color: ${Colors[theme]['songBackground']};
        overscroll-behavior: none;
    }
    
    .content-container {
        width: 100%;
        margin-top: ${headerHeightVh}vh;
    }
    
    .fit-width-content {
        width: 100%;
        height: auto;
        display: block;
    }
  `;

    if (isPDF) {
        // PDF viewer using PDF.js
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0">
    <title>Song ${songId}</title>
    <style>
        ${commonCSS}
        
        #pdf-container {
            width: 100%;
        }
        
        #pdf-viewer {
            width: 100%;
            margin: 0 auto;
            /* Remove space between elements but keep them as a continuous stream */
            font-size: 0; /* Remove space between inline-block elements */
        }
        
        .pdf-page {
            width: 100% !important;
            display: inline-block; /* Better than flex for this specific case */
            font-size: 0;  /* Removes tiny gaps between elements */
            line-height: 0; /* Removes gaps related to line-height */
            vertical-align: top; /* Aligns pages at the top */
        }
        
        .pdf-page canvas {
            width: 100% !important;
            height: auto !important;
            ${inverted ? 'filter: invert(1);' : ''}
            display: block;
            border: none;
            padding: 0;
            margin: 0;
        }
        
        /* Loading indicator */
        #loading {
            text-align: center;
            padding: 20px;
            font-family: Arial, sans-serif;
            color: ${theme === 'dark' ? '#fff' : '#333'};
            font-size: 16px; /* Reset font size for loading text */
        }
    </style>
    <!-- PDF.js library -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js"></script>
</head>
<body>
    <div class="content-container">
        <div id="loading"></div>
        <div id="pdf-container">
            <div id="pdf-viewer"></div>
        </div>
    </div>

    <script>
        // Set PDF.js worker path
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        
        // Base64 string of the PDF
        const pdfData = '${base64}';
        
        // Convert base64 to binary
        const binaryString = atob(pdfData);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Get device pixel ratio for high DPI displays
        const pixelRatio = window.devicePixelRatio || 1;
        
        // Load PDF document
        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        loadingTask.promise.then(function(pdf) {
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
            
            // Get total number of pages
            const numPages = pdf.numPages;
            const viewer = document.getElementById('pdf-viewer');
            
            // Function to render a single page
            async function renderPage(pageNumber) {
                // Get page
                const page = await pdf.getPage(pageNumber);
                
                // Create a div for this page
                const pageDiv = document.createElement('div');
                pageDiv.className = 'pdf-page';
                pageDiv.id = 'page-' + pageNumber;
                viewer.appendChild(pageDiv);
                
                // Get viewport and calculate scaling
                const originalViewport = page.getViewport({ scale: 1.0 });
                
                // Calculate container width (accounting for any padding/margins)
                const containerWidth = viewer.clientWidth;
                
                // Calculate the scale to fit the page width to the container
                let scale = containerWidth / originalViewport.width;
                
                // Increase scale for high DPI displays - this is key for sharper rendering
                scale = scale * pixelRatio;
                
                // Add extra scale factor for higher quality (2.0 = 2x the resolution)
                scale = scale * 2.0;
                
                // Get the scaled viewport
                const scaledViewport = page.getViewport({ scale: scale });
                
                // Prepare canvas with the calculated dimensions
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d', { alpha: false, antialias: true });
                canvas.height = scaledViewport.height;
                canvas.width = scaledViewport.width;
                
                // Set display size back to what's needed for the page
                // This maintains high resolution while showing at correct size
                canvas.style.width = (originalViewport.width * (containerWidth / originalViewport.width)) + 'px';
                canvas.style.height = 'auto';
                
                // Add canvas to page div
                pageDiv.appendChild(canvas);
                
                // Render PDF page into canvas context with high quality options
                const renderContext = {
                    canvasContext: context,
                    viewport: scaledViewport,
                    // Enable image smoothing for better quality
                    renderInteractiveForms: false,
                    enableWebGL: true
                };
                
                await page.render(renderContext).promise;
            }
            
            // Render all pages
            async function renderAllPages() {
                for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
                    await renderPage(pageNumber);
                }
            }
            
            renderAllPages();
            
            // Listen for window resize and re-render if necessary
            window.addEventListener('resize', function() {
                // Clear existing rendering
                viewer.innerHTML = '';
                // Re-render all pages
                renderAllPages();
            });
        }).catch(function(error) {
            console.error('Error loading PDF: ', error);
            document.getElementById('loading').textContent = 'Error loading PDF: ' + error.message;
        });
    </script>
</body>
</html>`;
    } else {
        // Image viewer HTML - keeping consistent with PDF viewer style
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0">
    <title>Song ${songId}</title>
    <style>
        ${commonCSS}
        
        .fit-width-image {
            width: 100%;
            height: auto;
            display: block;
            filter: invert(${inverted ? '1' : '0'});
        }
    </style>
</head>
<body>
    <div class="content-container">
        <img id="songImage" class="fit-width-image" src="${dataUri}" alt="Hymn ${songId}">
    </div>
</body>
</html>`;
    }
}

export { getHTMLStringFromSong };