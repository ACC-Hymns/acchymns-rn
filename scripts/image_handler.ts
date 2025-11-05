import { BookSummary } from "@/constants/types";
import { HYMNAL_FOLDER } from "./hymnals";
import { Directory, File, Paths } from 'expo-file-system/next';
import PdfPageImage from 'react-native-pdf-page-image';
import { BlendMode, Canvas, Skia, Image as SkiaImage, SkImage, useCanvasRef, useImage } from "@shopify/react-native-skia";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { Image } from "react-native";


async function loadSkiaImageFromUri(uri: string) {
    try {
        const file = new File(uri);
        const base64 = file.base64();
        const imageBytes = Skia.Data.fromBase64(base64);
        const image = Skia.Image.MakeImageFromEncoded(imageBytes);
        return image;
    } catch (e) {
        console.error("Error loading image:", e);
        return null;
    }
}

async function getImageData(bookData: BookSummary, songId: string, inverted: boolean): Promise<{ uri: string; aspectRatio: number } | null> {
    const filePath = `${HYMNAL_FOLDER}/${bookData.name.short}/songs/${songId}.${bookData.fileExtension}`.replace(/\/\//g, '/');
    const normalizedFilePath = filePath.replace(/\\/g, '/').replace(/\/\//g, '/');
    const file = new File(Paths.document, normalizedFilePath);
    if (file.exists) {
        let result = null;
        const imageURI = file.exists ? normalizedFilePath : null;
        // check if file is a PDF
        if (bookData.fileExtension === 'pdf') {

            // get base64 string from file
            const base64Input = file.base64();

            if(!imageURI) 
                return null;

            // start milliseconds
            const startTime = Date.now();
            const imageUris = await PdfPageImage.generateAllPages(`data:application/pdf;base64,${base64Input}`, 1).catch((error) => {
                console.error("Error generating images from PDF:", error);
            });

            if (!imageUris || imageUris?.length === 0) {
                console.error("No images generated from PDF");
                return null;
            }
            const images = (await Promise.all(imageUris.map((i) => loadSkiaImageFromUri(i.uri)))).filter((img): img is SkImage => img !== null);

            // read PDF file using pdf-lib
            const pdf = await PDFDocument.load(base64Input);
            // for each skiimage
            const pages = pdf.getPages();

            
            let yOffset = 0;
            let maxWidth = 0;
            const srcRects = [];
            const dstRects = [];

            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                // test if pdf HAS a crop box (media box is the same as the crop box)
                const mediaBox = page.getMediaBox();
                const cropBox = page.getCropBox();
                let isCropped = false;
                if (mediaBox.x !== cropBox.x || mediaBox.y !== cropBox.y || mediaBox.width !== cropBox.width || mediaBox.height !== cropBox.height) {
                    isCropped = true;
                }

                const { x: cropX, y: cropY, width: cropWidth, height: cropHeight } = page.getCropBox();
                const pageRect = page.getMediaBox();
                const img = images[i];
                const scalarX = img.width() / pageRect.width;
                const scalarY = img.height() / pageRect.height;
                const adjustedCropX = cropX * scalarX;
                // Invert Y because PDF origin is bottom-left, image origin is top-left
                const adjustedCropY = img.height() - ((cropY + cropHeight) * scalarY);
                const adjustedCropWidth = cropWidth * scalarX;
                const adjustedCropHeight = cropHeight * scalarY;

                if (img) {
                    // Define source rect (from the original image) - if cropped, use the crop box, otherwise use the media box
                    const srcRect = {
                        x: isCropped ? adjustedCropX : 0,
                        y: isCropped ? adjustedCropY : 0,
                        width: isCropped ? adjustedCropWidth : img.width(),
                        height: isCropped ? adjustedCropHeight : img.height(),
                    };

                    // Define destination rect (where to draw on canvas)
                    const dstRect = {
                        x: 0,
                        y: yOffset,
                        width: adjustedCropWidth,
                        height: adjustedCropHeight,
                    };

                    srcRects.push(srcRect);
                    dstRects.push(dstRect);

                    // Increment Y offset for next image
                    yOffset += adjustedCropHeight;
                    maxWidth = Math.max(maxWidth, adjustedCropWidth);
                }
            }

            // final image height
            const totalHeight = yOffset;

            // Create offscreen surface
            const surface = Skia.Surface.MakeOffscreen(maxWidth, totalHeight);
            if (!surface) {
                console.error("Failed to create offscreen surface");
                return null;
            }
            const canvas = surface.getCanvas();


            const invertMatrix = [
                -1, 0, 0, 0, 255,  // Red channel
                0,-1, 0, 0, 255,  // Green channel
                0, 0,-1, 0, 255,  // Blue channel
                0, 0, 0, 1,   0   // Alpha channel
            ]

            // Draw images on canvas
            for (let i = 0; i < images.length; i++) {
                const img = images[i];
                const srcRect = srcRects[i];
                const dstRect = dstRects[i];

                if (img) {
                    // Draw only the cropped portion
                    const paint = Skia.Paint(); // Create a SkPaint instance

                    canvas.drawImageRect(img, srcRect, dstRect, paint);
                }
            }

            // draw a white rectangle over the canvas
            if (inverted) {
                const whitePaint = Skia.Paint();
                whitePaint.setBlendMode(BlendMode.Difference);
                whitePaint.setColor(Skia.Color('white'));
                canvas.drawRect({x: 0, y: 0, width: maxWidth, height: totalHeight}, whitePaint);
            }

            // Draw each image stacked vertically

            // Get the final image
            const resultImage = surface.makeImageSnapshot();
            const base64 = resultImage.encodeToBase64();
            const dataUri = `data:image/png;base64,${base64}`;

            // end time
            const endTime = Date.now();
            const duration = endTime - startTime;

            let size = await Image.getSize(dataUri)
            result = {
                uri: dataUri,
                aspectRatio: size.width / size.height,
            };
        } else {
            if (imageURI) {

                if(inverted) {
                    // invert the image
                    const img = await loadSkiaImageFromUri(imageURI);
                
                    if (img) {
                        const surface = Skia.Surface.MakeOffscreen(img.width(), img.height());
                        if (!surface) {
                            console.error("Failed to create offscreen surface");
                            return null;
                        }
                        const canvas = surface.getCanvas();
                        
                        // Draw the image
                        const paint = Skia.Paint();
                        canvas.drawImageRect(img, {x: 0, y: 0, width: img.width(), height: img.height()}, {x: 0, y: 0, width: img.width(), height: img.height()}, paint);
                        
                        // If inverted, apply inversion
                        if (inverted) {
                            const whitePaint = Skia.Paint();
                            whitePaint.setBlendMode(BlendMode.Difference);
                            whitePaint.setColor(Skia.Color('white'));
                            canvas.drawRect({x: 0, y: 0, width: img.width(), height: img.height()}, whitePaint);
                        }
                        
                        // Get final image
                        const resultImage = surface.makeImageSnapshot();
                        const base64 = resultImage.encodeToBase64();
                        const dataUri = `data:image/png;base64,${base64}`;
                        
                        result = {
                            uri: dataUri,
                            aspectRatio: img.width() / img.height(),
                        };
                    }
                } else {
                    let size = await Image.getSize(imageURI)
                    result = {
                        uri: imageURI,
                        aspectRatio: size.width / size.height,
                    };
                }
            }
        }

        return result;

        //console.log("Image URI:", imageURI);
    } else {
        console.error("File does not exist:", filePath);
        return null;
    }
}

export { getImageData };