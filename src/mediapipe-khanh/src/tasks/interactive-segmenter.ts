/**
 * Copyright 2026 The MediaPipe Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { BaseVisionTask, BaseVisionTaskOptions } from '../components/base-vision-task';

// @ts-ignore
import template from '../templates/interactive-segmenter.html?raw';
// @ts-ignore

class InteractiveSegmenterTask extends BaseVisionTask {
  private isFrozen = false;
  private webcamCapture!: HTMLCanvasElement;
  private webcamOverlay!: HTMLCanvasElement;
  private freezeButton!: HTMLButtonElement;
  private webcamCtx!: CanvasRenderingContext2D;
  private overlayCtx!: CanvasRenderingContext2D;

  constructor(options: BaseVisionTaskOptions) {
    super(options);
  }

  protected override onInitializeUI() {
    this.webcamCapture = document.getElementById('webcam-capture') as HTMLCanvasElement;
    this.webcamOverlay = document.getElementById('webcam-overlay') as HTMLCanvasElement;
    this.freezeButton = document.getElementById('freezeButton') as HTMLButtonElement;
    this.webcamCtx = this.webcamCapture.getContext('2d', { willReadFrequently: true })!;
    this.overlayCtx = this.webcamOverlay.getContext('2d', { willReadFrequently: true })!;

    this.webcamCapture.style.display = 'none';
    this.webcamOverlay.style.display = 'none';
    this.webcamOverlay.style.position = 'absolute';
    this.webcamOverlay.style.top = '0';
    this.webcamOverlay.style.left = '0';
    this.webcamOverlay.style.pointerEvents = 'none';

    if (this.freezeButton) {
      this.freezeButton.addEventListener('click', this.toggleFreeze.bind(this));
      this.freezeButton.disabled = true; // Disabled initially until webcam starts
    }

    const testImage = document.getElementById('test-image') as HTMLImageElement;

    const handleInteraction = async (e: MouseEvent, source: 'image' | 'webcam') => {
      if (!this.isWorkerReady) return;

      let originalBitmapSource: HTMLImageElement | HTMLCanvasElement;

      if (source === 'image') {
        if (!testImage.src) return;
        originalBitmapSource = testImage;
      } else {
        if (!this.isFrozen) return;
        originalBitmapSource = this.webcamCapture;
      }

      // e.offsetX gives the exact pixel coordinate relative to the padding edge, but can be error-prone
      // with certain flex/grid layouts. getBoundingClientRect is safer.
      const clickElement = e.target as HTMLElement;
      const rect = clickElement.getBoundingClientRect();
      let clickX = e.clientX - rect.left;
      let clickY = e.clientY - rect.top;

      let x = clickX / rect.width;
      const y = clickY / rect.height;

      // The WebCam feed visually mirrors logic, so X must be flipped.
      // Image mode natively aligns, so no X flip is necessary.
      if (source === 'webcam') {
        x = 1 - x; // Adjust for mirrored CSS transform: rotateY(180deg)
      }

      this.updateStatus('Segmenting...');
      try {
        const bitmap = await createImageBitmap(originalBitmapSource);
        this.worker?.postMessage(
          {
            type: 'SEGMENT',
            bitmap,
            pt: { x, y },
          },
          [bitmap]
        );
      } catch (err) {
        console.error(err);
      }
    };

    testImage.addEventListener('click', (e) => handleInteraction(e, 'image'));
    this.canvasElement.addEventListener('click', (e) => handleInteraction(e, 'image'));

    this.webcamCapture.addEventListener('click', (e) => handleInteraction(e, 'webcam'));
    this.webcamOverlay.addEventListener('click', (e) => handleInteraction(e, 'webcam'));

    if (this.video) {
      this.video.style.cursor = 'pointer';
      this.video.addEventListener('click', () => {
        if (!this.isFrozen && this.video.srcObject) {
          this.toggleFreeze();
        }
      });
    }
  }

  // Interactive Segmenter responds to CLI clicks, not continuous video frames
  protected override async predictWebcam() {}

  protected override async detectImage(_: HTMLImageElement) {
    if (this.runningMode !== 'IMAGE') this.runningMode = 'IMAGE';
    this.isWorkerReady = true;
    this.updateStatus('Ready');
  }

  protected override async enableCam() {
    await super.enableCam();
    if (this.freezeButton) {
      this.freezeButton.disabled = false;
      this.isFrozen = false;
      this.freezeButton.innerText = 'Freeze & Segment';
      this.webcamCapture.style.display = 'none';
      this.webcamOverlay.style.display = 'none';
      this.video.style.display = 'block';
    }

    const infoSpan = document.querySelector('.instructions-banner span:nth-of-type(2)') as HTMLSpanElement;
    if (infoSpan)
      infoSpan.innerText = 'Click anywhere on the webcam feed to freeze it, then click the object to segment.';
  }

  protected override stopCam(persistState = true) {
    super.stopCam(persistState);
    if (this.freezeButton) {
      this.freezeButton.disabled = true;
      this.isFrozen = false;
      this.webcamCapture.style.display = 'none';
      this.webcamOverlay.style.display = 'none';
      this.video.style.display = 'block';
      this.overlayCtx.clearRect(0, 0, this.webcamOverlay.width, this.webcamOverlay.height);
      this.webcamCtx.clearRect(0, 0, this.webcamCapture.width, this.webcamCapture.height);
    }

    const infoSpan = document.querySelector('.instructions-banner span:nth-of-type(2)') as HTMLSpanElement;
    if (infoSpan) infoSpan.innerText = 'Click on an object in the image or video to segment it.';
  }

  private toggleFreeze() {
    if (!this.video || !this.video.srcObject) return;

    if (!this.isFrozen) {
      this.webcamCapture.width = this.video.videoWidth;
      this.webcamCapture.height = this.video.videoHeight;
      this.webcamOverlay.width = this.video.videoWidth;
      this.webcamOverlay.height = this.video.videoHeight;

      this.webcamCtx.drawImage(this.video, 0, 0);

      this.video.style.display = 'none';
      this.webcamCapture.style.display = 'block';
      this.webcamOverlay.style.display = 'block';
      this.webcamOverlay.style.pointerEvents = 'auto';
      this.webcamOverlay.classList.add('clickable');
      this.webcamOverlay.style.width = '100%';

      this.isFrozen = true;
      this.freezeButton.innerText = 'Unfreeze';
      this.updateStatus('Frozen! Click on object to segment');
      const infoSpan = document.querySelector('.instructions-banner span:nth-of-type(2)') as HTMLSpanElement;
      if (infoSpan) infoSpan.innerText = 'Click on an object to segment it, or click Unfreeze to restart.';
    } else {
      this.isFrozen = false;
      this.freezeButton.innerText = 'Freeze & Segment';
      this.video.style.display = 'block';
      this.webcamCapture.style.display = 'none';
      this.webcamOverlay.style.display = 'none';
      this.webcamOverlay.style.pointerEvents = 'none';

      this.overlayCtx.clearRect(0, 0, this.webcamOverlay.width, this.webcamOverlay.height);
      this.updateStatus('Ready to freeze');
    }
  }

  protected override handleWorkerMessage(event: MessageEvent) {
    const { type } = event.data;
    if (type === 'SEGMENT_RESULT') {
      const { maskBitmap, width, height, inferenceTime } = event.data;
      this.updateInferenceTime(inferenceTime);

      if (this.runningMode === 'VIDEO') {
        this.drawMask(maskBitmap, width, height, this.overlayCtx);
      } else {
        this.drawMask(maskBitmap, width, height, this.canvasCtx);
      }

      this.updateStatus(`Done in ${Math.round(inferenceTime)}ms`);
    } else {
      super.handleWorkerMessage(event);
    }
  }

  private drawMask(maskBitmap: ImageBitmap | null, width: number, height: number, ctx: CanvasRenderingContext2D) {
    if (!maskBitmap) return;

    ctx.canvas.width = width;
    ctx.canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(maskBitmap, 0, 0);

    maskBitmap.close();
  }

  protected override getWorkerInitParams(): Record<string, any> {
    return {};
  }

  protected override displayImageResult() {}
  protected override displayVideoResult() {}
}

let activeTask: InteractiveSegmenterTask | null = null;

export async function setupInteractiveSegmenter(container: HTMLElement) {
  activeTask = new InteractiveSegmenterTask({
    container,
    template,
    defaultModelName: 'magic_touch',
    defaultModelUrl:
      'https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float32/1/magic_touch.tflite',
    defaultDelegate: 'GPU',
    workerFactory: () =>
      new Worker(new URL('../workers/interactive-segmenter.worker.ts', import.meta.url), { type: 'module' }),
  });
  await activeTask.initialize();
}

export function cleanupInteractiveSegmenter() {
  if (activeTask) {
    activeTask.cleanup();
    activeTask = null;
  }
}
