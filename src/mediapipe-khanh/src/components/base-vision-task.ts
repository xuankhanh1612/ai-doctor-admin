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

import { ViewToggle } from './view-toggle';
import { BaseTask, BaseTaskOptions } from './base-task';

export interface BaseVisionTaskOptions extends BaseTaskOptions {}

export abstract class BaseVisionTask extends BaseTask {
  protected runningMode: 'IMAGE' | 'VIDEO' = 'IMAGE';
  protected video!: HTMLVideoElement;
  protected canvasElement!: HTMLCanvasElement;
  protected canvasCtx!: CanvasRenderingContext2D;
  protected enableWebcamButton!: HTMLButtonElement;

  protected lastVideoTimeSeconds = -1;
  protected lastTimestampMs = -1;
  protected animationFrameId: number | undefined;

  public override async initialize() {
    this.container.innerHTML = this.options.template;

    this.video = document.getElementById('webcam') as HTMLVideoElement;
    this.canvasElement = document.getElementById('output_canvas') as HTMLCanvasElement;
    if (this.canvasElement) {
      this.canvasCtx = this.canvasElement.getContext('2d')!;
    }
    this.enableWebcamButton = document.getElementById('webcamButton') as HTMLButtonElement;

    this.initWorker();
    this.setupUI();
    this.setupViewToggle();
    this.setupImageUpload();
    this.setupUploadRecordControls();

    // Child class hook
    this.onInitializeUI();
    this.setupDelegateSelect();

    await this.initializeTask();
  }

  protected override handleWorkerMessage(event: MessageEvent) {
    const { type } = event.data;

    switch (type) {
      case 'DETECT_RESULT':
        const { mode, result, inferenceTime } = event.data;
        this.updateStatus(`Done in ${Math.round(inferenceTime)}ms`);
        this.updateInferenceTime(inferenceTime);

        if (mode === 'IMAGE') {
          this.displayImageResult(result);
        } else if (mode === 'VIDEO') {
          this.displayVideoResult(result);
          if (this.video.srcObject && !this.video.paused) {
            this.animationFrameId = window.requestAnimationFrame(this.predictWebcam.bind(this));
          }
        }
        break;
      default:
        super.handleWorkerMessage(event);
        break;
    }
  }

  protected override handleInitDone() {
    super.handleInitDone();

    if (this.video && this.video.srcObject && this.enableWebcamButton) {
      this.setWebcamButtonLabel('close');
      this.enableWebcamButton.disabled = false;
    } else if (this.enableWebcamButton && this.enableWebcamButton.innerText !== 'Starting...') {
      this.setWebcamButtonLabel('open');
      this.enableWebcamButton.disabled = false;
    }

    if (this.runningMode === 'VIDEO') {
      if (this.video.srcObject) {
        this.enableCam();
      }
    } else if (this.runningMode === 'IMAGE') {
      const testImage = document.getElementById('test-image') as HTMLImageElement;
      if (testImage && testImage.style.display !== 'none' && testImage.src) {
        this.triggerImageDetection(testImage);
      }
    }
  }

  protected setupViewToggle() {
    const viewWebcam = document.getElementById('view-webcam');
    const viewImage = document.getElementById('view-image');

    if (!viewWebcam || !viewImage) return;

    const switchView = (mode: 'VIDEO' | 'IMAGE') => {
      localStorage.setItem('mediapipe-running-mode', mode);
      const webcamControls = document.getElementById('webcam-controls-container');
      const classificationResults = document.getElementById('classification-results');

      // Clear out old results so they don't linger across mode switches
      if (classificationResults) {
        classificationResults.innerHTML = '';
      }

      if (mode === 'VIDEO') {
        viewWebcam.classList.add('active');
        viewImage.classList.remove('active');
        if (webcamControls) webcamControls.style.display = 'flex';
        this.runningMode = 'VIDEO';
        this.worker?.postMessage({ type: 'SET_OPTIONS', runningMode: 'VIDEO' });

        const isWebcamActive = localStorage.getItem('mediapipe-webcam-active') === 'true';
        if (isWebcamActive) {
          this.enableCam();
        }
      } else {
        viewWebcam.classList.remove('active');
        viewImage.classList.add('active');
        if (webcamControls) webcamControls.style.display = 'none';
        this.runningMode = 'IMAGE';
        this.worker?.postMessage({ type: 'SET_OPTIONS', runningMode: 'IMAGE' });
        this.stopCam(false);

        if (this.isWorkerReady) {
          const testImage = document.getElementById('test-image') as HTMLImageElement;
          if (testImage && testImage.src) this.triggerImageDetection(testImage);
        }
      }
    };

    const storedMode = localStorage.getItem('mediapipe-running-mode') as 'VIDEO' | 'IMAGE';
    const initialMode = storedMode || 'IMAGE';

    const viewToggle = new ViewToggle(
      'view-mode-toggle',
      [
        { label: 'Webcam', value: 'video' },
        { label: 'Image', value: 'image' },
      ],
      initialMode.toLowerCase(),
      (value) => {
        switchView(value === 'video' ? 'VIDEO' : 'IMAGE');
      }
    );

    viewToggle.setActive(initialMode.toLowerCase());

    switchView(initialMode);
    if (this.enableWebcamButton) {
      this.enableWebcamButton.addEventListener('click', this.toggleCam.bind(this));
    }
  }


  protected setWebcamButtonLabel(state: 'open' | 'close' | 'starting' | 'initializing') {
    if (!this.enableWebcamButton) return;
    const labels = {
      open: '<span class="material-icons">videocam</span> Mở camera',
      close: '<span class="material-icons">videocam_off</span> Đóng camera',
      starting: '<span class="material-icons">hourglass_empty</span> Đang mở...',
      initializing: '<span class="material-icons">hourglass_empty</span> Đang khởi tạo...',
    };
    this.enableWebcamButton.innerHTML = labels[state];
  }

  protected setupUploadRecordControls() {
    this.setWebcamButtonLabel('open');

    document.querySelectorAll<HTMLButtonElement>('#re-upload-btn').forEach((button) => {
      button.innerHTML = '<span class="material-icons">upload</span> upload hình trong máy';
    });

    const webcamControls = document.getElementById('webcam-controls-container');
    if (!webcamControls || document.getElementById('save-webcam-record-btn')) return;

    webcamControls.classList.add('webcam-controls');
    const saveButton = document.createElement('button');
    saveButton.id = 'save-webcam-record-btn';
    saveButton.className = 'action-button secondary';
    saveButton.type = 'button';
    saveButton.innerHTML = '<span class="material-icons">save_alt</span> Lưu Upload Records';
    saveButton.addEventListener('click', () => this.captureWebcamToUploadRecords());
    webcamControls.appendChild(saveButton);
  }

  protected captureWebcamToUploadRecords() {
    if (!this.video || !this.video.srcObject || this.video.videoWidth === 0) {
      this.updateStatus('Vui lòng mở camera trước khi lưu.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = this.video.videoWidth || 1280;
    canvas.height = this.video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (this.canvasElement?.width && this.canvasElement?.height) {
      ctx.drawImage(this.canvasElement, 0, 0, canvas.width, canvas.height);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    window.parent?.postMessage({
      type: 'AI_CLINIC_MEDIAPIPE_WEBCAM_CAPTURE',
      dataUrl,
      filename: `mediapipe_webcam_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`,
    }, window.location.origin);
    this.updateStatus('Đã gửi ảnh Webcam sang Upload Records.');
  }

  protected setupImageUpload() {
    const imageUpload = document.getElementById('image-upload') as HTMLInputElement;
    const imagePreviewContainer = document.getElementById('image-preview-container')!;
    const testImage = document.getElementById('test-image') as HTMLImageElement;
    const dropzone = document.querySelector('.upload-dropzone') as HTMLElement;
    const dropzoneContent = document.querySelector('.dropzone-content') as HTMLElement;

    if (testImage && testImage.src && dropzoneContent) {
      dropzoneContent.style.display = 'none';
    }

    if (dropzone) {
      dropzone.addEventListener('click', (e) => {
        const previewContainer = dropzone.querySelector('.preview-container');
        if (previewContainer && previewContainer.contains(e.target as Node)) {
          return;
        }
        imageUpload?.click();
      });
    }

    imageUpload?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (testImage) testImage.src = e.target?.result as string;
          if (imagePreviewContainer) imagePreviewContainer.style.display = '';
          const dc = document.querySelector('.dropzone-content') as HTMLElement;
          if (dc) dc.style.display = 'none';

          if (testImage) this.triggerImageDetection(testImage);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  protected override async initializeTask() {
    if (this.enableWebcamButton) {
      this.enableWebcamButton.disabled = true;
      if (!this.video || !this.video.srcObject) {
        this.setWebcamButtonLabel('initializing');
      }
    }
    await super.initializeTask();
  }

  protected override getWorkerInitParamsInner(): Record<string, any> {
    return {
      runningMode: this.runningMode,
      ...this.getWorkerInitParams(),
    };
  }

  protected triggerImageDetection(image: HTMLImageElement) {
    if (image.complete && image.naturalWidth > 0) {
      this.detectImage(image);
    } else {
      image.onload = () => {
        if (image.naturalWidth > 0) {
          this.detectImage(image);
        }
      };
    }
  }

  protected async detectImage(image: HTMLImageElement) {
    if (!this.worker || !this.isWorkerReady) return;
    if (this.runningMode !== 'IMAGE') this.runningMode = 'IMAGE';

    const bitmap = await createImageBitmap(image);
    this.updateStatus(`Processing image...`);
    this.worker.postMessage(
      {
        type: 'DETECT_IMAGE',
        bitmap: bitmap,
        timestampMs: performance.now(),
      },
      [bitmap]
    );
  }

  protected async enableCam() {
    if (!this.worker || !this.video) return;
    if (this.video.srcObject) return;

    if (this.enableWebcamButton) {
      this.setWebcamButtonLabel('starting');
      this.enableWebcamButton.disabled = true;
    }
    const constraints = { video: true };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = stream;
      const placeholder = document.getElementById('webcam-placeholder');
      if (placeholder) placeholder.style.display = 'none';

      const playAndPredict = () => {
        if (!this.video) return;
        this.video.play().catch(console.error);
        this.predictWebcam();
      };

      if (this.video.readyState >= 2) {
        playAndPredict();
      } else {
        this.video.addEventListener('loadeddata', playAndPredict, { once: true });
      }

      this.runningMode = 'VIDEO';
      localStorage.setItem('mediapipe-webcam-active', 'true');
      this.worker.postMessage({ type: 'SET_OPTIONS', runningMode: 'VIDEO' });
      this.updateStatus('Webcam running...');
      if (this.enableWebcamButton) {
        this.setWebcamButtonLabel('close');
        this.enableWebcamButton.disabled = false;
      }
    } catch (err) {
      console.error(err);
      this.updateStatus('Camera error!');
      if (this.enableWebcamButton) {
        this.setWebcamButtonLabel('open');
        this.enableWebcamButton.disabled = false;
      }
    }
  }

  protected toggleCam() {
    if (this.video && this.video.srcObject) {
      this.stopCam(true);
    } else {
      this.enableCam();
    }
  }

  protected stopCam(persistState = true) {
    if (this.video && this.video.srcObject) {
      const stream = this.video.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      this.video.srcObject = null;
      const placeholder = document.getElementById('webcam-placeholder');
      if (placeholder) placeholder.style.display = 'flex';
      if (this.enableWebcamButton) this.setWebcamButtonLabel('open');
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

      if (this.canvasCtx && this.canvasElement) {
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
      }

      if (persistState) {
        localStorage.setItem('mediapipe-webcam-active', 'false');
      }
    }
  }

  protected async predictWebcam() {
    if (this.runningMode === 'IMAGE') {
      this.runningMode = 'VIDEO';
    }

    if (!this.isWorkerReady || !this.worker) {
      this.animationFrameId = window.requestAnimationFrame(this.predictWebcam.bind(this));
      return;
    }

    if (this.video.currentTime !== this.lastVideoTimeSeconds) {
      this.lastVideoTimeSeconds = this.video.currentTime;

      try {
        let bitmap: ImageBitmap;
        if (navigator.webdriver) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = this.video.videoWidth || 640;
          tempCanvas.height = this.video.videoHeight || 480;
          const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
          ctx?.drawImage(this.video, 0, 0, tempCanvas.width, tempCanvas.height);
          bitmap = await window.createImageBitmap(tempCanvas);
        } else {
          bitmap = await window.createImageBitmap(this.video);
        }

        const now = performance.now();
        const timestampMs = now > this.lastTimestampMs ? now : this.lastTimestampMs + 1;
        this.lastTimestampMs = timestampMs;

        this.worker?.postMessage(
          {
            type: 'DETECT_VIDEO',
            bitmap: bitmap,
            timestampMs: timestampMs,
          },
          [bitmap]
        );
      } catch (e) {
        console.error('Failed to create ImageBitmap from video', e);
        this.animationFrameId = window.requestAnimationFrame(this.predictWebcam.bind(this));
      }
    } else {
      this.animationFrameId = window.requestAnimationFrame(this.predictWebcam.bind(this));
    }
  }

  public override cleanup() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.stopCam(false);

    if (this.canvasCtx && this.canvasElement) {
      this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }

    super.cleanup();
  }

  protected abstract displayImageResult(result: any): void;
  protected abstract displayVideoResult(result: any): void;
}
