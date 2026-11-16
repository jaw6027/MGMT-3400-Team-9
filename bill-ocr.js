import { parseBillText } from './bill-parser.js';

export async function readBillImage(file, { signal, onProgress = () => {} } = {}) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPG, or WebP image. PDFs and HEIC photos are not supported.');
  if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('Choose a nonempty image smaller than 10 MB.');
  if (!/^https?:$/.test(location.protocol)) throw new Error('Image reading is unavailable in this preview. Open the full served app, or enter the values manually.');
  let bitmap;
  let worker;
  let canvas;
  let abortHandler;
  const stopped = () => new DOMException('Reading cancelled', 'AbortError');
  const abortPromise = new Promise((_, reject) => {
    abortHandler = () => { worker?.terminate(); reject(stopped()); };
    signal?.addEventListener('abort', abortHandler, { once: true });
    if (signal?.aborted) abortHandler();
  });
  const work = async () => {
    bitmap = await createImageBitmap(file);
    if (signal?.aborted) { bitmap.close(); bitmap = null; throw stopped(); }
    if (bitmap.width * bitmap.height > 25000000) throw new Error('This image is too large to read safely. Crop the bill to the usage and total sections, then try again.');
    canvas = document.createElement('canvas');
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    bitmap = null;
    let engine;
    try {
      const module = await import(new URL('vendor/ocr/tesseract.esm.min.js', document.baseURI).href);
      engine = module.default;
    } catch {
      throw new Error('Image reading could not load in this preview. Open the full app or enter the values manually.');
    }
    if (signal?.aborted) throw stopped();
    const base = new URL('vendor/ocr/', document.baseURI).href;
    worker = await engine.createWorker('eng', 1, {
      workerPath: `${base}worker.min.js`, corePath: base, langPath: base,
      workerBlobURL: false, cacheMethod: 'none', logging: false,
      errorHandler: () => {},
      logger: info => {
        if (!signal?.aborted) onProgress(info.status === 'recognizing text' ? Math.round(info.progress * 100) : null);
      },
    }).then(created => {
      if (signal?.aborted) { created.terminate(); throw stopped(); }
      return created;
    });
    if (signal?.aborted) throw stopped();
    const output = await worker.recognize(canvas, {}, { text: true, blocks: false, hocr: false, tsv: false });
    const extracted = parseBillText(output.data.text, output.data.confidence);
    output.data.text = '';
    return extracted;
  };
  try {
    return await Promise.race([work(), abortPromise]);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    if (/Choose |too large|preview/.test(error.message || '')) throw error;
    throw new Error('This image could not be read. Try a clear, upright photo or screenshot, or enter all three values manually.');
  } finally {
    signal?.removeEventListener('abort', abortHandler);
    await worker?.terminate();
    bitmap?.close();
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}
