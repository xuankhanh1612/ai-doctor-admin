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
      this.setWebcamButtonLabel('close');
      this.enableWebcamButton.disabled = false;
    } else if (this.enableWebcamButton) {
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


  // ── UI State ─────────────────────────────────────────────────────────────
  private wcamShowOverlay  = true;
  private wcamShowClock    = true;
  private wcamShowBorder   = true;
  private wcamClockTimer: number | null = null;

  protected setWebcamButtonLabel(state: 'open' | 'close' | 'starting' | 'initializing') {
    // Main open/close button lives inside the HUD placeholder now
    const openBtn   = document.getElementById('wcam-hud-open-btn') as HTMLButtonElement | null;
    const toolbar   = document.getElementById('wcam-toolbar')      as HTMLElement | null;
    const liveBadge = document.getElementById('wcam-live-badge')   as HTMLElement | null;
    const liveClock = document.getElementById('wcam-live-clock')   as HTMLElement | null;
    const drawer    = document.getElementById('wcam-settings-drawer') as HTMLElement | null;
    const vcorners  = document.querySelectorAll<HTMLElement>('.wcam-vcorner');

    const isOpen = state === 'close';
    if (openBtn)   openBtn.style.display   = isOpen ? 'none' : 'flex';
    if (toolbar)   toolbar.style.display   = isOpen ? 'flex' : 'none';
    if (liveBadge) liveBadge.style.display = isOpen ? 'flex' : 'none';
    // The live clock/corners overlay the video-wrapper; only show them while the
    // camera is actually open, otherwise they sit on top of (and duplicate) the
    // placeholder's own HUD clock (#wcam-hud-clock).
    if (liveClock) liveClock.style.display = (isOpen && this.wcamShowClock) ? 'flex' : 'none';
    vcorners.forEach((el) => { el.style.display = (isOpen && this.wcamShowBorder) ? 'block' : 'none'; });
    if (!isOpen && drawer) drawer.style.display = 'none';

    // Disable open button during init/starting
    if (openBtn) openBtn.disabled = (state === 'starting' || state === 'initializing');

    if (state === 'starting' || state === 'initializing') {
      if (openBtn) openBtn.innerHTML =
        '<span class="material-icons wcam-spin">hourglass_empty</span><span>Đang mở…</span>';
    } else if (state === 'open') {
      if (openBtn) openBtn.innerHTML =
        '<span class="material-icons">videocam</span><span>OPEN CAMERA</span>';
    }
  }

  protected setupUploadRecordControls() {
    this.setupUploadBridgeMessages();
    this.injectWebcamHUD();
    this.injectImageSaveControls();
  }

  // ── Inject AI Doctor Vision HUD into #webcam-placeholder ─────────────────
  private injectWebcamHUD() {
    const placeholder = document.getElementById('webcam-placeholder');
    if (!placeholder || document.getElementById('wcam-hud-inner')) return;

    // Replace boring placeholder with full HUD
    placeholder.className = 'wcam-hud-placeholder';
    placeholder.innerHTML = `
      <div id="wcam-hud-inner" class="wcam-hud-inner">
        <!-- Cyber corner borders -->
        <div class="wcam-border-tl"></div>
        <div class="wcam-border-tr"></div>
        <div class="wcam-border-bl"></div>
        <div class="wcam-border-br"></div>

        <!-- Scan grid overlay -->
        <div class="wcam-scan-grid" aria-hidden="true"></div>

        <!-- Top-left badge -->
        <div class="wcam-badge-overlay-active">
          <span class="material-icons">psychology</span>
          AI OVERLAY ACTIVE
        </div>

        <!-- Top-right clock -->
        <div id="wcam-hud-clock" class="wcam-hud-clock"></div>

        <!-- Center branding -->
        <div class="wcam-hud-center">
          <div class="wcam-hud-title">AI DOCTOR VISION</div>
          <div class="wcam-hud-subtitle">AI Overlay is running · Open camera to start</div>
          <div class="wcam-hud-tags">
            <span><span class="material-icons">face</span> Face Mesh</span>
            <span><span class="material-icons">accessibility</span> Skeleton</span>
            <span><span class="material-icons">favorite</span> Heart Rate</span>
            <span><span class="material-icons">self_improvement</span> Posture</span>
          </div>
          <button id="wcam-hud-open-btn" class="wcam-hud-open-btn" type="button">
            <span class="material-icons">videocam</span>
            <span>OPEN CAMERA</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('wcam-hud-open-btn')?.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      this.enableCam();
    });

    this.startHUDClock();
    this.injectWebcamToolbar();
  }

  // ── Inject floating toolbar + settings drawer ─────────────────────────────
  private injectWebcamToolbar() {
    const webcamControls = document.getElementById('webcam-controls-container');
    if (!webcamControls || document.getElementById('wcam-toolbar')) return;

    // Hide old webcamButton — toolbar takes over
    if (this.enableWebcamButton) this.enableWebcamButton.style.display = 'none';

    webcamControls.style.flexDirection = 'column';
    webcamControls.style.alignItems = 'center';
    webcamControls.style.gap = '0';
    webcamControls.style.padding = '0';
    webcamControls.style.margin = '0';

    webcamControls.innerHTML = `
      <!-- LIVE badge (shown when camera on) -->
      <div id="wcam-live-badge" class="wcam-live-badge" style="display:none">
        <span class="wcam-live-dot"></span> LIVE
      </div>

      <!-- Floating toolbar -->
      <div id="wcam-toolbar" class="wcam-toolbar" role="toolbar" aria-label="Camera controls">

        <!-- Switch Camera -->
        <button id="wcam-tb-switch" class="wcam-tb-btn" type="button" title="Đổi camera">
          <span class="material-icons">flip_camera_ios</span>
          <span class="wcam-tb-label">Switch Camera</span>
        </button>

        <!-- Upload Image -->
        <button id="wcam-tb-upload" class="wcam-tb-btn" type="button" title="Upload hình">
          <span class="material-icons">image</span>
          <span class="wcam-tb-label">Upload Image</span>
        </button>

        <!-- Capture (large center) -->
        <button id="wcam-tb-capture" class="wcam-tb-btn wcam-tb-capture" type="button" title="Chụp & lưu hình">
          <span class="material-icons">photo_camera</span>
        </button>

        <!-- Record -->
        <button id="wcam-tb-record" class="wcam-tb-btn" type="button" title="Quay video">
          <span class="wcam-record-dot" id="wcam-record-dot"></span>
          <span class="material-icons" id="wcam-record-icon">videocam</span>
          <span class="wcam-tb-label">Record Video</span>
        </button>

        <!-- Save Image -->
        <button id="wcam-tb-save" class="wcam-tb-btn" type="button" title="Lưu hình vào Medical Records">
          <span class="material-icons">save_alt</span>
          <span class="wcam-tb-label">Save Image</span>
        </button>

        <!-- Settings -->
        <button id="wcam-tb-settings" class="wcam-tb-btn wcam-tb-settings-btn" type="button" title="Cài đặt">
          <span class="material-icons">settings</span>
        </button>

        <!-- Close Camera -->
        <button id="wcam-toolbar-close" class="wcam-tb-btn wcam-tb-close" type="button" title="Đóng camera">
          <span class="material-icons">close</span>
        </button>
      </div>

      <!-- Settings Drawer (glassmorphism) -->
      <div id="wcam-settings-drawer" class="wcam-settings-drawer" style="display:none">
        <div class="wcam-setting-row">
          <span class="material-icons">visibility</span>
          <span class="wcam-setting-label">AI Overlay</span>
          <label class="wcam-toggle">
            <input type="checkbox" id="wcam-toggle-overlay" checked>
            <span class="wcam-toggle-slider"></span>
          </label>
        </div>
        <div class="wcam-setting-row">
          <span class="material-icons">schedule</span>
          <span class="wcam-setting-label">Clock</span>
          <label class="wcam-toggle">
            <input type="checkbox" id="wcam-toggle-clock" checked>
            <span class="wcam-toggle-slider"></span>
          </label>
        </div>
        <div class="wcam-setting-row">
          <span class="material-icons">crop_square</span>
          <span class="wcam-setting-label">Border</span>
          <label class="wcam-toggle">
            <input type="checkbox" id="wcam-toggle-border" checked>
            <span class="wcam-toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Save notification -->
      <div id="save-notif-webcam" class="capture-save-notif" role="status" aria-live="polite" style="display:none"></div>
      <button id="view-webcam-upload-records-btn" class="action-button view-upload-records" type="button" style="display:none">
        <span class="material-icons">folder_shared</span> Xem hình tại Medical Records
      </button>
    `;

    // Wire up toolbar buttons
    document.getElementById('wcam-tb-switch')?.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation(); this.switchCamera();
    });
    document.getElementById('wcam-tb-capture')?.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation(); this.captureWebcamToUploadRecords();
    });
    document.getElementById('wcam-tb-save')?.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation(); this.captureWebcamToUploadRecords();
    });
    document.getElementById('wcam-toolbar-close')?.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation(); this.stopCam(true);
    });
    document.getElementById('wcam-tb-upload')?.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      (document.getElementById('image-upload') as HTMLInputElement)?.click();
    });
    document.getElementById('wcam-tb-record')?.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation(); this.toggleRecording();
    });
    document.getElementById('view-webcam-upload-records-btn')?.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      window.parent?.postMessage({ type: 'AI_CLINIC_OPEN_UPLOAD_RECORDS' }, window.location.origin);
    });

    // Settings drawer toggle
    const settingsBtn = document.getElementById('wcam-tb-settings');
    const drawer = document.getElementById('wcam-settings-drawer');
    settingsBtn?.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!drawer) return;
      const open = drawer.style.display === 'none';
      drawer.style.display = open ? 'flex' : 'none';
      settingsBtn.classList.toggle('active', open);
    });

    // Toggle handlers
    document.getElementById('wcam-toggle-overlay')?.addEventListener('change', (e) => {
      this.wcamShowOverlay = (e.target as HTMLInputElement).checked;
      const canvas = document.getElementById('output_canvas') as HTMLCanvasElement | null;
      if (canvas) canvas.style.opacity = this.wcamShowOverlay ? '1' : '0';
    });
    document.getElementById('wcam-toggle-clock')?.addEventListener('change', (e) => {
      this.wcamShowClock = (e.target as HTMLInputElement).checked;
      const el = document.getElementById('wcam-live-clock');
      if (el) el.style.display = this.wcamShowClock ? 'flex' : 'none';
    });
    document.getElementById('wcam-toggle-border')?.addEventListener('change', (e) => {
      this.wcamShowBorder = (e.target as HTMLInputElement).checked;
      const wrapper = document.querySelector('.video-wrapper') as HTMLElement | null;
      if (wrapper) wrapper.classList.toggle('wcam-border-active', this.wcamShowBorder);
    });

    // Inject overlays into video-wrapper (clock + border + live badge)
    this.injectVideoWrapperOverlays();

    // Sync initial open/close state with current camera status
    this.setWebcamButtonLabel(this.video?.srcObject ? 'close' : 'open');
  }

  // ── Clock & border overlays inside video-wrapper ──────────────────────────
  private injectVideoWrapperOverlays() {
    const wrapper = document.querySelector('#view-webcam .video-wrapper') as HTMLElement | null;
    if (!wrapper || document.getElementById('wcam-live-clock')) return;

    wrapper.classList.add('wcam-border-active');

    // Cyber corner borders (on the live video)
    wrapper.insertAdjacentHTML('beforeend', `
      <div class="wcam-vcorner wcam-vcorner-tl" aria-hidden="true"></div>
      <div class="wcam-vcorner wcam-vcorner-tr" aria-hidden="true"></div>
      <div class="wcam-vcorner wcam-vcorner-bl" aria-hidden="true"></div>
      <div class="wcam-vcorner wcam-vcorner-br" aria-hidden="true"></div>
      <div id="wcam-live-clock" class="wcam-live-clock">
        <span id="wcam-live-clock-time">--:--:--</span>
        <span id="wcam-live-clock-date"></span>
      </div>
    `);

    this.startLiveClock();
  }

  // ── Clock tick ────────────────────────────────────────────────────────────
  private startHUDClock() {
    const tick = () => {
      const el = document.getElementById('wcam-hud-clock');
      if (el) {
        const now = new Date();
        el.textContent = now.toLocaleTimeString('vi-VN', { hour12: false }) +
          '\n' + now.toLocaleDateString('vi-VN');
      }
    };
    tick();
    setInterval(tick, 1000);
  }

  private startLiveClock() {
    const tick = () => {
      const now = new Date();
      const timeEl = document.getElementById('wcam-live-clock-time');
      const dateEl = document.getElementById('wcam-live-clock-date');
      if (timeEl) timeEl.textContent = now.toLocaleTimeString('vi-VN', { hour12: false });
      if (dateEl) dateEl.textContent = now.toLocaleDateString('vi-VN');
    };
    tick();
    if (this.wcamClockTimer) clearInterval(this.wcamClockTimer);
    this.wcamClockTimer = window.setInterval(tick, 1000);
  }

  // ── Recording (stub — saves canvas frames as webm if supported) ───────────
  private mediaRecorder: MediaRecorder | null = null;
  private recordingChunks: Blob[] = [];

  private toggleRecording() {
    const dot  = document.getElementById('wcam-record-dot');
    const icon = document.getElementById('wcam-record-icon');
    const btn  = document.getElementById('wcam-tb-record');

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      if (dot)  dot.style.display = 'none';
      if (icon) icon.textContent  = 'videocam';
      if (btn)  btn.classList.remove('recording');
      this.updateStatus('Video đã lưu.');
    } else {
      const canvas = document.getElementById('output_canvas') as HTMLCanvasElement | null;
      const stream = canvas?.captureStream?.(30) || this.video?.srcObject as MediaStream | null;
      if (!stream) { this.updateStatus('Cần mở camera trước.'); return; }
      this.recordingChunks = [];
      try {
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
      } catch {
        this.mediaRecorder = new MediaRecorder(stream);
      }
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordingChunks.push(e.data);
      };
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordingChunks, { type: 'video/webm' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = `ai_doctor_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };
      this.mediaRecorder.start(200);
      if (dot)  { dot.style.display = 'inline-block'; }
      if (icon) icon.textContent = 'stop';
      if (btn)  btn.classList.add('recording');
      this.updateStatus('Đang quay video…');
    }
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

  private injectImageSaveControls() {
    const reUploadButton = document.getElementById('re-upload-btn') as HTMLButtonElement | null;
    if (!reUploadButton) return;
    reUploadButton.innerHTML = '<span class="material-icons">upload</span> Upload hình trong máy';

    if (!document.getElementById('save-image-record-btn')) {
      const saveButton = document.createElement('button');
      saveButton.id = 'save-image-record-btn';
      saveButton.className = 'action-button secondary image-save-record';
      saveButton.type = 'button';
      saveButton.innerHTML = '<span class="material-icons">save_alt</span> Lưu Hình';
      saveButton.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.captureImageToUploadRecords();
      });
      reUploadButton.insertAdjacentElement('afterend', saveButton);
    }

    // Notification + view button for image tab
    const imageSaveButton = document.getElementById('save-image-record-btn') as HTMLButtonElement;
    if (imageSaveButton && !document.getElementById('save-notif-image')) {
      imageSaveButton.insertAdjacentHTML('afterend', `
        <div id="save-notif-image" class="capture-save-notif" role="status" aria-live="polite" style="display:none"></div>
        <button id="view-image-upload-records-btn" class="action-button view-upload-records" type="button" style="display:none">
          <span class="material-icons">folder_shared</span> Xem hình tại Medical Records
        </button>
      `);
      document.getElementById('view-image-upload-records-btn')?.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        window.parent?.postMessage({ type: 'AI_CLINIC_OPEN_UPLOAD_RECORDS' }, window.location.origin);
      });
    }
  }

  private showUploadRecordsButton(captureKind: 'webcam' | 'image', uploadPath = '') {
    const viewButton = document.getElementById(`view-${captureKind}-upload-records-btn`) as HTMLButtonElement | null;
    const notif = document.getElementById(`save-notif-${captureKind}`) as HTMLElement | null;

    if (notif) {
      const tabLabel = captureKind === 'webcam' ? 'Webcam' : 'Image';
      const icon     = captureKind === 'webcam' ? 'photo_camera' : 'image';
      const pathText = uploadPath ? `<span class="save-notif-path">${uploadPath}</span>` : '';
      notif.innerHTML = `
        <span class="save-notif-icon material-icons">${icon}</span>
        <span class="save-notif-text">
          Đã lưu hình <b>${tabLabel}</b> vào Upload Records${pathText ? ' · ' : ''}${pathText}
        </span>
        <span class="save-notif-check material-icons">check_circle</span>
      `;
      notif.style.display = 'flex';
    }

    if (viewButton) {
      viewButton.style.display = 'flex';
      viewButton.title = uploadPath;
    }
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

  // ── AI Healthcare Vision overlay (Image tab) ─────────────────────────────
  // Vẽ lớp phủ AI đầy đủ giống Webcam: detection box, label, scan lines, footer
  private drawAIHealthcareVisionImageOverlay(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const now = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    const boxW  = width  * 0.34;
    const boxH  = height * 0.58;
    const bx = width  * 0.5 - boxW * 0.5;
    const by = height * 0.2;

    ctx.save();

    // Detection bounding box
    ctx.strokeStyle = 'rgba(56,189,248,0.92)';
    ctx.lineWidth   = Math.max(3, width * 0.004);
    ctx.shadowColor = 'rgba(14,165,233,0.75)';
    ctx.shadowBlur  = 18;
    ctx.strokeRect(bx, by, boxW, boxH);

    // Label bar
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = 'rgba(2,6,23,0.78)';
    ctx.fillRect(bx, Math.max(0, by - 38), Math.min(boxW + 60, 340), 34);
    ctx.fillStyle   = '#67e8f9';
    ctx.font        = `800 ${Math.max(14, width * 0.018)}px Inter,sans-serif`;
    ctx.fillText('AI Healthcare Vision 0.96', bx + 10, Math.max(22, by - 15));

    // Inner dashed rect (keypoint region)
    ctx.strokeStyle = 'rgba(34,197,94,0.88)';
    ctx.lineWidth   = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    (ctx as any).roundRect?.(bx + boxW * 0.26, by + boxH * 0.12, boxW * 0.48, boxH * 0.76, 18) ||
      ctx.rect(bx + boxW * 0.26, by + boxH * 0.12, boxW * 0.48, boxH * 0.76);
    ctx.stroke();
    ctx.setLineDash([]);

    // Keypoints
    for (let i = 0; i < 5; i++) {
      const py = by + boxH * (0.18 + i * 0.15);
      ctx.fillStyle = i % 2 ? '#22c55e' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(bx + boxW * 0.5, py, Math.max(4, width * 0.006), 0, Math.PI * 2);
      ctx.fill();
    }

    // Scan lines
    ctx.strokeStyle = 'rgba(125,211,252,0.18)';
    ctx.lineWidth   = 1;
    for (let sy = 0; sy < height; sy += 22) {
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(width, sy); ctx.stroke();
    }

    // Footer bar
    ctx.fillStyle = 'rgba(15,23,42,0.82)';
    ctx.fillRect(12, height - 72, Math.min(width - 24, 580), 52);
    ctx.fillStyle = '#e0f2fe';
    ctx.font      = `800 ${Math.max(13, width * 0.016)}px Inter,sans-serif`;
    ctx.fillText(`AI Healthcare Vision · Object Detection · Image · ${now}`, 24, height - 44);
    ctx.fillStyle = '#86efac';
    ctx.fillText('✓ Verified proof · Health Journey · Image upload · AI overlay', 24, height - 24);

    ctx.restore();
  }

  protected captureImageToUploadRecords() {
    const testImage   = document.getElementById('test-image')   as HTMLImageElement  | null;
    const imageCanvas = document.getElementById('image-canvas') as HTMLCanvasElement | null;

    if (!testImage || !testImage.src || !testImage.complete || testImage.naturalWidth === 0) {
      this.updateStatus('Vui lòng upload hình trước khi lưu.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width  = testImage.naturalWidth;
    canvas.height = testImage.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Vẽ ảnh gốc
    ctx.drawImage(testImage, 0, 0, canvas.width, canvas.height);

    // 2. Vẽ kết quả AI detection (bounding boxes từ MediaPipe) nếu có
    if (imageCanvas?.width && imageCanvas?.height) {
      ctx.drawImage(imageCanvas, 0, 0, canvas.width, canvas.height);
    }

    // 3. Vẽ lớp phủ AI Healthcare Vision đầy đủ (timestamp, scan lines, footer...)
    //    — giống hệt phần Webcam để đồng bộ trải nghiệm Health Journey Game
    this.drawAIHealthcareVisionImageOverlay(ctx, canvas.width, canvas.height);

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
      // Stop any in-progress recording
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
        const dot  = document.getElementById('wcam-record-dot');
        const icon = document.getElementById('wcam-record-icon');
        const btn  = document.getElementById('wcam-tb-record');
        if (dot)  dot.style.display = 'none';
        if (icon) icon.textContent  = 'videocam';
        if (btn)  btn.classList.remove('recording');
      }

      const stream = this.video.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      this.video.srcObject = null;
      this.updateCameraFacingPresentation();
      const placeholder = document.getElementById('webcam-placeholder');
      if (placeholder) placeholder.style.display = 'flex';
      if (this.enableWebcamButton) this.setWebcamButtonLabel('open');
      if (this.enableWebcamButton) this.enableWebcamButton.innerText = 'Mở camera';

      // Close settings drawer
      const drawer = document.getElementById('wcam-settings-drawer');
      const settingsBtn = document.getElementById('wcam-tb-settings');
      if (drawer) drawer.style.display = 'none';
      settingsBtn?.classList.remove('active');

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
