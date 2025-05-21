import { BookSummary } from "@/constants/types";
import { HYMNAL_FOLDER } from "./hymnals";
import * as FileSystem from 'expo-file-system';
import PdfPageImage from 'react-native-pdf-page-image';
import { Canvas, Skia, Image as SkiaImage, SkImage, useCanvasRef, useImage } from "@shopify/react-native-skia";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { Image } from "react-native";


async function loadSkiaImageFromUri(uri: string) {
    try {
        const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
        });
        const imageBytes = Skia.Data.fromBase64(base64);
        const image = Skia.Image.MakeImageFromEncoded(imageBytes);
        return image;
    } catch (e) {
        console.error("Error loading image:", e);
        return null;
    }
}

async function getImageData(bookData: BookSummary, songId: string): Promise<{ uri: string; aspectRatio: number } | null> {
    const filePath = `${FileSystem.documentDirectory}${HYMNAL_FOLDER}/${bookData.name.short}/songs/${songId}.${bookData.fileExtension}`.replace(/\/\//g, '/');
    const normalizedFilePath = filePath.replace(/\\/g, '/').replace(/\/\//g, '/');
    const fileInfo = await FileSystem.getInfoAsync(normalizedFilePath);
    if (fileInfo.exists) {
        let result = null;
        const imageURI = fileInfo.exists ? normalizedFilePath : null;
        // check if file is a PDF
        if (bookData.fileExtension === 'pdf') {

            // get base64 string from file
            const base64Input = await FileSystem.readAsStringAsync(normalizedFilePath, {
                encoding: FileSystem.EncodingType.Base64,
            });

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
                const { x: cropX, y: cropY, width: cropWidth, height: cropHeight } = page.getCropBox();
                const pageRect = page.getMediaBox();
                const img = images[i];
                const adjustedCropX = cropX * img.width() / pageRect.width;
                // Invert Y because PDF origin is bottom-left, image origin is top-left
                const adjustedCropY = img.height() - ((cropY + cropHeight) * img.height() / pageRect.height);
                const adjustedCropWidth = cropWidth * img.width() / pageRect.width;
                const adjustedCropHeight = cropHeight * img.height() / pageRect.height;

                if (img) {
                    // Define source rect (from the original image)
                    const srcRect = {
                        x: adjustedCropX,
                        y: adjustedCropY,
                        width: adjustedCropWidth,
                        height: adjustedCropHeight,
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
                let size = await Image.getSize(imageURI)
                result = {
                    uri: imageURI,
                    aspectRatio: size.width / size.height,
                };
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