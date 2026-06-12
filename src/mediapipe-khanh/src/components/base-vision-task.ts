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
  protected currentFacingMode: 'user' | 'environment' = 'environment';
  private uploadBridgeMessageHandler?: (event: MessageEvent) => void;

  protected lastVideoTimeSeconds = -1;
  protected lastTimestampMs = -1;
  protected animationFrameId: number | undefined;

  public override async initialize() {
    this.container.innerHTML = this.options.template;
    this.currentFacingMode = (localStorage.getItem('mediapipe-camera-facing-mode') as 'user' | 'environment') || 'environment';

    this.video = document.getElementById('webcam') as HTMLVideoElement;
    this.canvasElement = document.getElementById('output_canvas') as HTMLCanvasElement;
    if (this.canvasElement) {
      this.canvasCtx = this.canvasElement.getContext('2d')!;
    }
    this.enableWebcamButton = document.getElementById('webcamButton') as HTMLButtonElement;
    this.updateCameraFacingPresentation();

    this.initWorker();
    this.setupUI();
    this.setupViewToggle();
    this.setupImageUpload();
    this.setupUploadRecordControls();
    this.setupModelSelectionToggle();

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
//       this.setWebcamButtonLabel('close');
//       this.enableWebcamButton.disabled = false;
//     } else if (this.enableWebcamButton && this.enableWebcamButton.innerText !== 'Starting...') {
//       this.setWebcamButtonLabel('open');
      this.enableWebcamButton.innerText = 'Đóng camera';
      this.enableWebcamButton.disabled = false;
    } else if (this.enableWebcamButton && this.enableWebcamButton.innerText !== 'Đang mở...') {
      this.enableWebcamButton.innerText = 'Mở camera';
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
        const requestedWebcam = ['webcam', 'video'].includes((new URLSearchParams(window.location.search).get('mode') || new URLSearchParams(window.location.search).get('view') || '').toLowerCase());
        if (!requestedWebcam && isWebcamActive) {
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

    const params = new URLSearchParams(window.location.search);
    const requestedWebcam = ['webcam', 'video'].includes((params.get('mode') || params.get('view') || '').toLowerCase());
    const storedMode = localStorage.getItem('mediapipe-running-mode') as 'VIDEO' | 'IMAGE';
    const initialMode = requestedWebcam ? 'VIDEO' : (storedMode || 'IMAGE');
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
    this.setupUploadBridgeMessages();

    const reUploadButton = document.getElementById('re-upload-btn') as HTMLButtonElement | null;
    if (reUploadButton) {
      reUploadButton.innerHTML = '<span class="material-icons">upload</span> upload hình trong máy';
      this.ensureImageSaveControls(reUploadButton);
    }

    const webcamControls = document.getElementById('webcam-controls-container');
    if (!webcamControls) return;

    webcamControls.classList.add('webcam-controls');
    this.ensureWebcamSwitchButton(webcamControls);
    this.ensureWebcamSaveButton(webcamControls);
    this.ensureViewUploadRecordsButton(webcamControls, 'webcam');
  }


  protected setupModelSelectionToggle() {
    const taskContainer = this.container.querySelector('.task-container') as HTMLElement | null;
    const controlsPanel = this.container.querySelector('.controls-panel') as HTMLElement | null;
    if (!taskContainer || !controlsPanel || document.getElementById('model-selection-toggle-btn')) return;

    const params = new URLSearchParams(window.location.search);
    const requestedWebcam = ['webcam', 'video'].includes((params.get('mode') || params.get('view') || '').toLowerCase());
    const collapsedLabel = 'Hiện Model Selection';
    const expandedLabel = 'Ẩn Model Selection';
    const toggleButton = document.createElement('button');
    toggleButton.id = 'model-selection-toggle-btn';
    toggleButton.className = 'model-selection-toggle action-button secondary';
    toggleButton.type = 'button';

    const setCollapsed = (collapsed: boolean) => {
      taskContainer.classList.toggle('controls-collapsed', collapsed);
      toggleButton.innerHTML = `<span class="material-icons">tune</span> ${collapsed ? collapsedLabel : expandedLabel}`;
      toggleButton.setAttribute('aria-expanded', String(!collapsed));
    };

    toggleButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      setCollapsed(!taskContainer.classList.contains('controls-collapsed'));
    });

    taskContainer.insertBefore(toggleButton, taskContainer.firstChild);
    setCollapsed(requestedWebcam);
  }

  private setupUploadBridgeMessages() {
    if (this.uploadBridgeMessageHandler) return;

    this.uploadBridgeMessageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'AI_CLINIC_MEDIAPIPE_CAPTURE_SAVED') {
        this.showUploadRecordsButton(event.data.captureKind, event.data.uploadPath);
        this.updateStatus(`Đã lưu hình: ${event.data.uploadPath || ''}`.trim());
      }

      if (event.data?.type === 'AI_CLINIC_MEDIAPIPE_CAPTURE_SAVE_FAILED') {
        this.updateStatus(`Không lưu được hình: ${event.data.message || ''}`.trim());
      }
    };

    window.addEventListener('message', this.uploadBridgeMessageHandler);
  }

  private getWebcamControlsButtonHost(webcamControls: HTMLElement) {
    const webcamButtonParent = this.enableWebcamButton?.parentElement as HTMLElement | null;
    return webcamButtonParent && webcamControls.contains(webcamButtonParent) ? webcamButtonParent : webcamControls;
  }

  private ensureWebcamSwitchButton(webcamControls: HTMLElement) {
    if (document.getElementById('switch-camera-btn')) return;

    const buttonHost = this.getWebcamControlsButtonHost(webcamControls);
    buttonHost.classList.add('webcam-controls');

    const switchButton = document.createElement('button');
    switchButton.id = 'switch-camera-btn';
    switchButton.className = 'action-button secondary';
    switchButton.type = 'button';
    switchButton.innerHTML = '<span class="material-icons">flip_camera_ios</span> Đổi camera';
    switchButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.switchCamera();
    });

    if (this.enableWebcamButton?.parentElement === buttonHost && this.enableWebcamButton.nextSibling) {
      buttonHost.insertBefore(switchButton, this.enableWebcamButton.nextSibling);
    } else {
      buttonHost.appendChild(switchButton);
    }
  }

  private ensureWebcamSaveButton(webcamControls: HTMLElement) {
    if (document.getElementById('save-webcam-record-btn')) return;

    const buttonHost = this.getWebcamControlsButtonHost(webcamControls);
    buttonHost.classList.add('webcam-controls');

    const saveButton = document.createElement('button');
    saveButton.id = 'save-webcam-record-btn';
    saveButton.className = 'action-button secondary';
    saveButton.type = 'button';
    saveButton.innerHTML = '<span class="material-icons">save_alt</span> Lưu&nbsp;&nbsp;Hình';
    saveButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.captureWebcamToUploadRecords();
    });
    buttonHost.appendChild(saveButton);
  }

  private ensureImageSaveControls(reUploadButton: HTMLButtonElement) {
    if (!document.getElementById('save-image-record-btn')) {
      const saveButton = document.createElement('button');
      saveButton.id = 'save-image-record-btn';
      saveButton.className = 'action-button secondary image-save-record';
      saveButton.type = 'button';
      saveButton.innerHTML = '<span class="material-icons">save_alt</span> Lưu&nbsp;&nbsp;Hình';
      saveButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.captureImageToUploadRecords();
      });
      reUploadButton.insertAdjacentElement('afterend', saveButton);
    }

    const imageSaveButton = document.getElementById('save-image-record-btn') as HTMLButtonElement | null;
    if (imageSaveButton) this.ensureViewUploadRecordsButton(imageSaveButton, 'image');
  }

  private ensureViewUploadRecordsButton(anchor: HTMLElement, captureKind: 'webcam' | 'image') {
    const id = `view-${captureKind}-upload-records-btn`;
    if (document.getElementById(id)) return;

    const viewButton = document.createElement('button');
    viewButton.id = id;
    viewButton.className = 'action-button view-upload-records';
    viewButton.type = 'button';
    viewButton.style.display = 'flex';
    viewButton.innerHTML = '<span class="material-icons">folder_shared</span> Xem hình tại Medical Records';
    viewButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.parent?.postMessage({ type: 'AI_CLINIC_OPEN_UPLOAD_RECORDS' }, window.location.origin);
    });
    anchor.insertAdjacentElement('afterend', viewButton);
  }

  private showUploadRecordsButton(captureKind: 'webcam' | 'image', uploadPath = '') {
    const viewButton = document.getElementById(`view-${captureKind}-upload-records-btn`) as HTMLButtonElement | null;
    if (!viewButton) return;

    viewButton.style.display = 'flex';
    viewButton.title = uploadPath;
  }

  protected captureWebcamToUploadRecords() {
    const baseSource = this.getWebcamCaptureBaseSource();
    const baseDimensions = baseSource ? this.getCaptureSourceDimensions(baseSource) : { width: 0, height: 0 };

    if (!baseSource || !baseDimensions.width || !baseDimensions.height || !this.video?.srcObject) {
      this.updateStatus('Vui lòng mở camera trước khi lưu.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = baseDimensions.width || 1280;
    canvas.height = baseDimensions.height || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.shouldMirrorWebcamCapture()) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    this.drawCaptureLayer(ctx, baseSource, canvas.width, canvas.height);

    const overlayCanvases = this.getWebcamCaptureOverlayCanvases();
    overlayCanvases.forEach((overlayCanvas) => {
      if (overlayCanvas?.width && overlayCanvas?.height) {
        this.drawCaptureLayer(ctx, overlayCanvas, canvas.width, canvas.height);
      }
    });

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    window.parent?.postMessage({
      type: 'AI_CLINIC_MEDIAPIPE_WEBCAM_CAPTURE',
      dataUrl,
      filename: `mediapipe_webcam_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`,
    }, window.location.origin);
    this.updateStatus('Đang lưu hình Webcam...');
  }

  protected captureImageToUploadRecords() {
    const testImage = document.getElementById('test-image') as HTMLImageElement | null;
    const imageCanvas = document.getElementById('image-canvas') as HTMLCanvasElement | null;

    if (!testImage || !testImage.src || !testImage.complete || testImage.naturalWidth === 0) {
      this.updateStatus('Vui lòng upload hình trước khi lưu.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = testImage.naturalWidth;
    canvas.height = testImage.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(testImage, 0, 0, canvas.width, canvas.height);
    if (imageCanvas?.width && imageCanvas?.height) {
      ctx.drawImage(imageCanvas, 0, 0, canvas.width, canvas.height);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    window.parent?.postMessage({
      type: 'AI_CLINIC_MEDIAPIPE_IMAGE_CAPTURE',
      dataUrl,
      filename: `mediapipe_image_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`,
    }, window.location.origin);
    this.updateStatus('Đang lưu hình Image tab...');
  }

  protected setupImageUpload() {
    const imageUpload = document.getElementById('image-upload') as HTMLInputElement;
    const imagePreviewContainer = document.getElementById('image-preview-container')!;
    const testImage = document.getElementById('test-image') as HTMLImageElement;
    const dropzone = document.querySelector('.upload-dropzone') as HTMLElement;
    const dropzoneContent = document.querySelector('.dropzone-content') as HTMLElement;
    const reUploadButton = document.getElementById('re-upload-btn') as HTMLButtonElement | null;

    if (testImage && testImage.src && dropzoneContent) {
      dropzoneContent.style.display = 'none';
    }

    reUploadButton?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      imageUpload?.click();
    });

    if (dropzone) {
      dropzone.addEventListener('click', (e) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest('button, .action-button')) {
          return;
        }

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
        this.enableWebcamButton.innerText = 'Đang khởi tạo...';
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

  protected getVideoWrapper() {
    return this.video?.closest('.video-wrapper') as HTMLElement | null;
  }

  protected updateCameraFacingPresentation() {
    const wrapper = this.getVideoWrapper();
    if (!wrapper) return;

    wrapper.classList.toggle('facing-user', this.currentFacingMode === 'user');
    wrapper.classList.toggle('facing-environment', this.currentFacingMode !== 'user');
  }

  protected shouldMirrorWebcamCapture() {
    return this.currentFacingMode === 'user';
  }

  protected getWebcamCaptureBaseSource(): CanvasImageSource | null {
    return this.video || null;
  }

  protected getWebcamCaptureOverlayCanvases(): HTMLCanvasElement[] {
    return this.canvasElement ? [this.canvasElement] : [];
  }

  private getCaptureSourceDimensions(source: CanvasImageSource) {
    if (source instanceof HTMLVideoElement) {
      return { width: source.videoWidth, height: source.videoHeight };
    }

    if (source instanceof HTMLImageElement) {
      return { width: source.naturalWidth, height: source.naturalHeight };
    }

    return { width: source.width as number, height: source.height as number };
  }

  private drawCaptureLayer(
    ctx: CanvasRenderingContext2D,
    source: CanvasImageSource,
    width: number,
    height: number
  ) {
    const element = source instanceof Element ? source : null;
    const opacity = element ? Number.parseFloat(window.getComputedStyle(element).opacity || '1') : 1;

    ctx.save();
    if (Number.isFinite(opacity)) {
      ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
    }
    ctx.drawImage(source, 0, 0, width, height);
    ctx.restore();
  }

  private buildCameraConstraints(exactFacingMode = false): MediaStreamConstraints {
    return {
      video: {
        facingMode: exactFacingMode ? { exact: this.currentFacingMode } : { ideal: this.currentFacingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };
  }

  private async openCameraStream(exactFacingMode = false) {
    try {
      return await navigator.mediaDevices.getUserMedia(this.buildCameraConstraints(exactFacingMode));
    } catch (error) {
      if (!exactFacingMode) throw error;
      console.warn('Exact facingMode unavailable, falling back to ideal facingMode.', error);
      return navigator.mediaDevices.getUserMedia(this.buildCameraConstraints(false));
    }
  }

  protected async enableCam(exactFacingMode = false) {
    if (!this.worker || !this.video) return;
    if (this.video.srcObject) return;

    if (this.enableWebcamButton) {
      this.setWebcamButtonLabel('starting');
      this.enableWebcamButton.innerText = 'Đang mở...';
      this.enableWebcamButton.disabled = true;
    }

    try {
      const stream = await this.openCameraStream(exactFacingMode);
      const trackFacingMode = stream.getVideoTracks()[0]?.getSettings?.().facingMode;
      if (trackFacingMode === 'user' || trackFacingMode === 'environment') {
        this.currentFacingMode = trackFacingMode;
        localStorage.setItem('mediapipe-camera-facing-mode', this.currentFacingMode);
      }
      this.updateCameraFacingPresentation();
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
        this.enableWebcamButton.innerText = 'Đóng camera';
        this.enableWebcamButton.disabled = false;
      }
    } catch (err) {
      console.error(err);
      this.updateStatus('Camera error!');
      if (this.enableWebcamButton) {
        this.setWebcamButtonLabel('open');
        this.enableWebcamButton.innerText = 'Mở camera';
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

  protected async switchCamera() {
    const nextFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
    this.currentFacingMode = nextFacingMode;
    localStorage.setItem('mediapipe-camera-facing-mode', this.currentFacingMode);
    this.updateCameraFacingPresentation();

    if (this.video?.srcObject) {
      this.updateStatus(`Đang đổi sang camera ${this.currentFacingMode === 'user' ? 'trước' : 'sau'}...`);
      this.stopCam(false);
      await this.enableCam(true);
    } else {
      this.updateStatus(`Đã chọn camera ${this.currentFacingMode === 'user' ? 'trước' : 'sau'}. Bấm Mở camera để chạy.`);
    }
  }

  protected stopCam(persistState = true) {
    if (this.video && this.video.srcObject) {
      const stream = this.video.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      this.video.srcObject = null;
      this.updateCameraFacingPresentation();
      const placeholder = document.getElementById('webcam-placeholder');
      if (placeholder) placeholder.style.display = 'flex';
      if (this.enableWebcamButton) this.setWebcamButtonLabel('open');
      if (this.enableWebcamButton) this.enableWebcamButton.innerText = 'Mở camera';
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
    if (this.uploadBridgeMessageHandler) {
      window.removeEventListener('message', this.uploadBridgeMessageHandler);
      this.uploadBridgeMessageHandler = undefined;
    }
    this.stopCam(false);

    if (this.canvasCtx && this.canvasElement) {
      this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }

    super.cleanup();
  }

  protected abstract displayImageResult(result: any): void;
  protected abstract displayVideoResult(result: any): void;
}
