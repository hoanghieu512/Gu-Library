package com.gulibrary.app;

import android.content.res.AssetFileDescriptor;
import android.graphics.Matrix;
import android.graphics.SurfaceTexture;
import android.media.MediaPlayer;
import android.os.Handler;
import android.os.Looper;
import android.view.Surface;
import android.view.TextureView;
import android.view.View;
import android.view.ViewGroup;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.FrameLayout;
import android.widget.ImageView;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import java.util.ArrayList;
import java.util.List;

// The opening clip above the WebView (spec 2026-10-25-mo-cua-video-design.md §5.3). Native, so the
// WebView's freezes while Home first draws (1.2 to 1.9 s on UBS1) never stall it. OpeningFlow holds
// the rules; this class turns the player, the timers and the user into its events. Main thread only.
final class OpeningOverlay {
    private static final long CLIP_ESTIMATE_MS = 4200; // cap before the player knows the duration
    private static final int MATCH = ViewGroup.LayoutParams.MATCH_PARENT;

    private final AppCompatActivity activity;
    private final OpeningFlow flow = new OpeningFlow();
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final FrameLayout root;
    private final TextureView video;
    private final ImageView poster;
    private final OnBackPressedCallback back;
    private final List<Runnable> doneListeners = new ArrayList<>();
    private final Runnable holdTimeout = () -> on(OpeningFlow.Event.HOLD_TIMEOUT);
    private final Runnable capTimeout = () -> on(OpeningFlow.Event.CAP_TIMEOUT);
    private MediaPlayer player;
    private Surface surface;

    static OpeningOverlay attach(AppCompatActivity activity) {
        OpeningOverlay overlay = new OpeningOverlay(activity);
        overlay.start();
        return overlay;
    }

    private OpeningOverlay(AppCompatActivity activity) {
        this.activity = activity;
        root = new FrameLayout(activity);
        root.setBackgroundColor(0xFFE9E5CD); // cream, as the splash, should the poster ever lag
        video = new TextureView(activity);
        poster = new ImageView(activity);
        poster.setScaleType(ImageView.ScaleType.CENTER_CROP);
        poster.setImageResource(R.drawable.opening_first);
        video.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        poster.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        root.addView(video, new FrameLayout.LayoutParams(MATCH, MATCH));
        root.addView(poster, new FrameLayout.LayoutParams(MATCH, MATCH));

        // The whole layer is the skip button, labelled for TalkBack and the e2e suite.
        root.setClickable(true);
        root.setOnClickListener(v -> skip());
        root.setContentDescription("Bỏ qua hiệu ứng mở cửa");
        root.setAccessibilityDelegate(new View.AccessibilityDelegate() {
            @Override
            public void onInitializeAccessibilityNodeInfo(View host, AccessibilityNodeInfo info) {
                super.onInitializeAccessibilityNodeInfo(host, info);
                info.setClassName("android.widget.Button");
            }
        });

        // Registered after the App plugin's callback, so it is asked first: back only skips the clip.
        back = new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                skip();
            }
        };
    }

    private void start() {
        activity.addContentView(root, new ViewGroup.LayoutParams(MATCH, MATCH));
        activity.getOnBackPressedDispatcher().addCallback(activity, back);
        handler.postDelayed(capTimeout, CLIP_ESTIMATE_MS + OpeningFlow.CAP_SLACK_MS);
        video.setSurfaceTextureListener(new TextureView.SurfaceTextureListener() {
            @Override
            public void onSurfaceTextureAvailable(SurfaceTexture texture, int width, int height) {
                prepare(texture);
            }

            @Override
            public void onSurfaceTextureSizeChanged(SurfaceTexture texture, int width, int height) {
                applyCrop();
            }

            @Override
            public boolean onSurfaceTextureDestroyed(SurfaceTexture texture) {
                return true;
            }

            @Override
            public void onSurfaceTextureUpdated(SurfaceTexture texture) {}
        });
    }

    private void prepare(SurfaceTexture texture) {
        if (flow.state() == OpeningFlow.State.DONE) return;
        try (AssetFileDescriptor fd = activity.getResources().openRawResourceFd(R.raw.opening)) {
            player = new MediaPlayer();
            surface = new Surface(texture);
            player.setSurface(surface);
            player.setVolume(0f, 0f);
            // MediaPlayer keeps its own copy of the descriptor: closing ours after this is safe.
            player.setDataSource(fd.getFileDescriptor(), fd.getStartOffset(), fd.getLength());
            player.setOnPreparedListener(mp -> {
                applyCrop();
                handler.removeCallbacks(capTimeout);
                handler.postDelayed(capTimeout, mp.getDuration() + OpeningFlow.CAP_SLACK_MS);
                mp.start();
            });
            player.setOnInfoListener((mp, what, extra) -> {
                if (what == MediaPlayer.MEDIA_INFO_VIDEO_RENDERING_START) on(OpeningFlow.Event.RENDERING_STARTED);
                return false;
            });
            player.setOnCompletionListener(mp -> on(OpeningFlow.Event.VIDEO_ENDED)); // last frame stays
            player.setOnErrorListener((mp, what, extra) -> {
                on(OpeningFlow.Event.ERROR);
                return true;
            });
            player.prepareAsync();
        } catch (Exception e) {
            on(OpeningFlow.Event.ERROR);
        }
    }

    /** TextureView stretches the clip to the view: undo that and scale to cover, centred. */
    private void applyCrop() {
        if (player == null) return;
        int vw = player.getVideoWidth();
        int vh = player.getVideoHeight();
        int w = video.getWidth();
        int h = video.getHeight();
        if (vw == 0 || vh == 0 || w == 0 || h == 0) return;
        float scale = Math.max((float) w / vw, (float) h / vh);
        Matrix m = new Matrix();
        m.setScale(vw * scale / w, vh * scale / h, w / 2f, h / 2f);
        video.setTransform(m);
    }

    void homeReady() {
        on(OpeningFlow.Event.HOME_READY);
    }

    void skip() {
        on(OpeningFlow.Event.SKIP);
    }

    void onPause() {
        on(OpeningFlow.Event.PAUSED);
    }

    boolean isDone() {
        return flow.state() == OpeningFlow.State.DONE;
    }

    void whenDone(Runnable listener) {
        if (isDone()) listener.run();
        else doneListeners.add(listener);
    }

    private void on(OpeningFlow.Event event) {
        if (!flow.on(event)) return;
        switch (flow.state()) {
            case PLAYING:
                poster.setVisibility(View.GONE);
                break;
            case HOLDING:
                handler.postDelayed(holdTimeout, OpeningFlow.HOLD_MAX_MS);
                break;
            case FADING:
                handler.removeCallbacks(holdTimeout);
                handler.removeCallbacks(capTimeout);
                root.animate()
                    .alpha(0f)
                    .setDuration(flow.fastFade() ? OpeningFlow.FAST_FADE_MS : OpeningFlow.FADE_MS)
                    .withEndAction(() -> on(OpeningFlow.Event.FADE_ENDED));
                break;
            case DONE:
                finish();
                break;
            default:
                break;
        }
    }

    private void finish() {
        handler.removeCallbacksAndMessages(null);
        root.animate().cancel();
        ViewGroup parent = (ViewGroup) root.getParent();
        if (parent != null) parent.removeView(root);
        back.remove();
        if (player != null) {
            player.release();
            player = null;
        }
        if (surface != null) {
            surface.release();
            surface = null;
        }
        List<Runnable> listeners = new ArrayList<>(doneListeners);
        doneListeners.clear();
        for (Runnable listener : listeners) listener.run();
    }
}
