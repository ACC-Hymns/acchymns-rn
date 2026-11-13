import { BookSummary } from "@/constants/types";
import { HYMNAL_FOLDER } from "./hymnals";
import { File, Paths } from 'expo-file-system';
import { Colors } from "@/constants/Colors";
import { Platform } from "react-native";
import { isIOS26DesignEnabled } from "@/constants/iosDesign";

export type SongDocumentKind = 'pdf' | 'image';

export type SongDocumentSource = {
    kind: SongDocumentKind;
    fileUri: string;
    mimeType: string;
    fileExtension: string;
    songId: string;
};

export type BuildSheetMusicHtmlOptions = {
    inverted: boolean;
    theme: 'dark' | 'light';
    /** Header height as a fraction of viewport height (legacy WebView margin). */
    headerHeightRatio: number;
};

function mimeTypeForExtension(fileExtension: string): string {
    if (fileExtension === 'pdf') return 'application/pdf';
    if (fileExtension === 'png') return 'image/png';
    if (fileExtension === 'jpg' || fileExtension === 'jpeg') return 'image/jpeg';
    return 'image/png';
}

function songFile(bookData: BookSummary, songId: string): File {
    const fileExtension = bookData.fileExtension;
    const filePath = `${HYMNAL_FOLDER}/${bookData.name.short}/songs/${songId}.${fileExtension}`.replace(/\/\//g, '/');
    const normalizedFilePath = filePath.replace(/\\/g, '/').replace(/\/\//g, '/');
    return new File(Paths.document, normalizedFilePath);
}

export async function resolveSongDocument(
    bookData: BookSummary,
    songId: string,
): Promise<SongDocumentSource> {
    const fileExtension = bookData.fileExtension;
    const file = songFile(bookData, songId);
    const isPDF = fileExtension === 'pdf';
    return {
        kind: isPDF ? 'pdf' : 'image',
        fileUri: file.uri,
        mimeType: mimeTypeForExtension(fileExtension),
        fileExtension,
        songId,
    };
}

export async function buildSheetMusicHtml(
    source: SongDocumentSource,
    options: BuildSheetMusicHtmlOptions,
): Promise<string> {
    const { inverted, theme, headerHeightRatio } = options;
    const isLiquidGlass = isIOS26DesignEnabled();
    const file = new File(source.fileUri);
    const base64 = await file.base64();
    const dataUri = `data:${source.mimeType};base64,${base64}`;
    const headerHeightVh = isLiquidGlass ? headerHeightRatio * 110 : 0;
    const isAndroid = Platform.OS === 'android';
    const songId = source.songId;

    const commonCSS = `
    body, html {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
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

    const androidRnBridgeScript = isAndroid ? `
    <script>
    (function () {
        function syncTouchAction() {
            var vv = window.visualViewport;
            var z = vv ? vv.scale : 1;
            var ta = z <= 1.02 ? 'pan-y pinch-zoom' : 'pan-x pan-y pinch-zoom';
            document.documentElement.style.touchAction = ta;
            if (document.body) {
                document.body.style.touchAction = ta;
            }
            var cc = document.querySelector('.content-container');
            if (cc) {
                cc.style.touchAction = ta;
            }
        }

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', syncTouchAction);
            window.visualViewport.addEventListener('scroll', syncTouchAction);
        }
        syncTouchAction();

        var startX = 0, startY = 0, tracking = false, vetoVertical = false;

        function zoomAllowsSongSwipe() {
            return !window.visualViewport || window.visualViewport.scale <= 1.02;
        }

        document.addEventListener('touchstart', function (e) {
            if (e.touches.length !== 1) {
                tracking = false;
                return;
            }
            tracking = true;
            vetoVertical = false;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchmove', function (e) {
            if (!tracking || e.touches.length !== 1) return;
            var mx = e.touches[0].clientX - startX;
            var my = e.touches[0].clientY - startY;
            if (Math.abs(my) > 28 && Math.abs(my) > Math.abs(mx) * 1.1) {
                vetoVertical = true;
            }
        }, { passive: true });

        function onTouchEnd(e) {
            if (!tracking) return;
            tracking = false;
            if (!window.ReactNativeWebView) return;
            if (!zoomAllowsSongSwipe() || vetoVertical) return;
            var t = e.changedTouches[0];
            if (!t) return;
            var dx = t.clientX - startX;
            var dy = t.clientY - startY;
            if (Math.abs(dx) < 64) return;
            if (Math.abs(dx) < Math.abs(dy) * 1.2) return;
            var direction = dx > 0 ? 'right' : 'left';
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'horizontalSongSwipe',
                direction: direction
            }));
        }

        document.addEventListener('touchend', onTouchEnd, { passive: true });
        document.addEventListener('touchcancel', function () { tracking = false; }, { passive: true });
    })();
    </script>` : '';

    if (source.kind === 'pdf') {
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
            font-size: 0;
        }
        
        .pdf-page {
            width: 100% !important;
            display: inline-block;
            font-size: 0;
            line-height: 0;
            vertical-align: top;
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
        
        #loading {
            text-align: center;
            padding: 20px;
            font-family: Arial, sans-serif;
            color: ${theme === 'dark' ? '#fff' : '#333'};
            font-size: 16px;
        }
    </style>
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
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        
        const pdfData = '${base64}';
        
        const binaryString = atob(pdfData);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const pixelRatio = window.devicePixelRatio || 1;
        
        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        loadingTask.promise.then(function(pdf) {
            document.getElementById('loading').style.display = 'none';
            
            const numPages = pdf.numPages;
            const viewer = document.getElementById('pdf-viewer');
            
            async function renderPage(pageNumber) {
                const page = await pdf.getPage(pageNumber);
                
                const pageDiv = document.createElement('div');
                pageDiv.className = 'pdf-page';
                pageDiv.id = 'page-' + pageNumber;
                viewer.appendChild(pageDiv);
                
                const originalViewport = page.getViewport({ scale: 1.0 });
                const containerWidth = viewer.clientWidth;
                let scale = containerWidth / originalViewport.width;
                scale = scale * pixelRatio;
                scale = scale * 2.0;
                
                const scaledViewport = page.getViewport({ scale: scale });
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d', { alpha: false, antialias: true });
                canvas.height = scaledViewport.height;
                canvas.width = scaledViewport.width;
                
                canvas.style.width = (originalViewport.width * (containerWidth / originalViewport.width)) + 'px';
                canvas.style.height = 'auto';
                
                pageDiv.appendChild(canvas);
                
                const renderContext = {
                    canvasContext: context,
                    viewport: scaledViewport,
                    renderInteractiveForms: false,
                    enableWebGL: true
                };
                
                await page.render(renderContext).promise;
            }
            
            async function renderAllPages() {
                for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
                    await renderPage(pageNumber);
                }
            }
            
            renderAllPages();
            
            window.addEventListener('resize', function() {
                viewer.innerHTML = '';
                renderAllPages();
            });
        }).catch(function(error) {
            console.error('Error loading PDF: ', error);
            document.getElementById('loading').textContent = 'Error loading PDF: ' + error.message;
        });
    </script>
    ${androidRnBridgeScript}
</body>
</html>`;
    }

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
    ${androidRnBridgeScript}
</body>
</html>`;
}

/** @deprecated Prefer resolveSongDocument + buildSheetMusicHtml for renderer-agnostic loading. */
export async function getHTMLStringFromSong(
    bookData: BookSummary,
    songId: string,
    inverted: boolean,
    theme: 'dark' | 'light',
    headerHeight: number,
): Promise<string> {
    const source = await resolveSongDocument(bookData, songId);
    return buildSheetMusicHtml(source, {
        inverted,
        theme,
        headerHeightRatio: headerHeight,
    });
}
