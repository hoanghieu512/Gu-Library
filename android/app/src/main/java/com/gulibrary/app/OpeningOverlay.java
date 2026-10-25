package com.gulibrary.app;

import android.content.res.AssetFileDescriptor;
import android.media.MediaPlayer;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.view.ViewGroup;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.FrameLayout;
import android.widget.ImageView;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import java.util.ArrayList;
import java.util.List;

// The opening clip above the WebView (spec 2026-10-25-mo-cua-video-design.md §5.3). While Home first
// draws, the WebView blocks the app's UI thread for 1.2 to 1.9 s (UBS1): a TextureView froze for that
// long mid-clip. A SurfaceView gets its frames straight from the decoder to the compositor, so the
// clip keeps playing. Stills cover what a surface cannot do: the first frame while the decoder starts
// (no black frame), the last frame for the hold and the fade. OpeningFlow holds the rules; this class
// turns the player, the timers and the user into its events. Main thread only.
final class OpeningOverlay {
    private static final long CLIP_ESTIMATE_MS = 4200; // cap before the player knows the duration
    private static final int MATCH = ViewGroup.LayoutParams.MATCH_PARENT;

    private final AppCompatActivity activity;
    private final OpeningFlow flow = new OpeningFlow();
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final FrameLayout root;
    private final SurfaceView video;
    private final ImageView poster;
    private final ImageView last;
    private final OnBackPressedCallback back;
    private final List<Runnable> doneListeners = new ArrayList<>();
    private final Runnable holdTimeout = () -> on(OpeningFlow.Event.HOLD_TIMEOUT);
    private final Runnable capTimeout = () -> on(OpeningFlow.Event.CAP_TIMEOUT);
    private MediaPlayer player;

    static OpeningOverlay attach(AppCompatActivity activity) {
        OpeningOverlay overlay = new OpeningOverlay(activity);
        overlay.start();
        return overlay;
    }

    private OpeningOverlay(AppCompatActivity activity) {
        this.activity = activity;
        root = new FrameLayout(activity);
        root.setBackgroundColor(0xFFE9E5CD); // cream, as the splash, should the poster ever lag
        video = new SurfaceView(activity);
        poster = still(activity, R.drawable.opening_first);
        last = still(activity, R.drawable.opening_last);
        last.setVisibility(View.GONE);
        video.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        root.addView(video, new FrameLayout.LayoutParams(MATCH, MATCH, Gravity.CENTER));
        root.addView(poster, new FrameLayout.LayoutParams(MATCH, MATCH));
        root.addView(last, new FrameLayout.LayoutParams(MATCH, MATCH));

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

    private static ImageView still(AppCompatActivity activity, int drawable) {
        ImageView image = new ImageView(activity);
        image.setScaleType(ImageView.ScaleType.CENTER_CROP); // same crop as the video below
        image.setImageResource(drawable);
        image.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        return image;
    }

    private void start() {
        activity.addContentView(root, new ViewGroup.LayoutParams(MATCH, MATCH));
        activity.getOnBackPressedDispatcher().addCallback(activity, back);
        handler.postDelayed(capTimeout, CLIP_ESTIMATE_MS + OpeningFlow.CAP_SLACK_MS);
        video.getHolder().addCallback(new SurfaceHolder.Callback() {
            @Override
            public void surfaceCreated(SurfaceHolder holder) {
                if (player == null) prepare(holder);
                else player.setDisplay(holder);
            }

            @Override
            public void surfaceChanged(SurfaceHolder holder, int format, int width, int height) {}

            @Override
            public void surfaceDestroyed(SurfaceHolder holder) {
                if (player != null) player.setDisplay(null);
            }
        });
    }

    private void prepare(SurfaceHolder holder) {
        if (flow.state() == OpeningFlow.State.DONE) return;
        try (AssetFileDescriptor fd = activity.getResources().openRawResourceFd(R.raw.opening)) {
            player = new MediaPlayer();
            player.setDisplay(holder);
            player.setVolume(0f, 0f);
            // MediaPlayer keeps its own copy of the descriptor: closing ours after this is safe.
            player.setDataSource(fd.getFileDescriptor(), fd.getStartOffset(), fd.getLength());
            player.setOnPreparedListener(mp -> {
                coverWithVideo(mp.getVideoWidth(), mp.getVideoHeight());
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

    /** Centre-crop, like the stills: size the surface to cover the layer, centred, clipped by it. */
    private void coverWithVideo(int vw, int vh) {
        int w = root.getWidth();
        int h = root.getHeight();
        if (vw == 0 || vh == 0 || w == 0 || h == 0) return;
        float scale = Math.max((float) w / vw, (float) h / vh);
        video.setLayoutParams(new FrameLayout.LayoutParams(Math.round(vw * scale), Math.round(vh * scale), Gravity.CENTER));
    }

    /** From here on only stills show: the surface cannot hold or fade the same on every Android. */
    private void showLastFrame() {
        if (last.getVisibility() == View.VISIBLE) return;
        last.setVisibility(View.VISIBLE);
        poster.setVisibility(View.GONE);
        video.setVisibility(View.GONE);
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
                showLastFrame();
                handler.postDelayed(holdTimeout, OpeningFlow.HOLD_MAX_MS);
                break;
            case FADING:
                // After the clip: fade its last frame. A skip mid-clip: drop the surface and fade the
                // cream (or the first frame, if the decoder had not started) onto Home.
                if (event == OpeningFlow.Event.VIDEO_ENDED || event == OpeningFlow.Event.HOME_READY
                        || event == OpeningFlow.Event.HOLD_TIMEOUT) {
                    showLastFrame();
                } else {
                    video.setVisibility(View.GONE);
                }
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
        // Two 720 x 1280 stills are about 7 MB of bitmap: let them go with the layer (review 25/10).
        poster.setImageDrawable(null);
        last.setImageDrawable(null);
        back.remove();
        if (player != null) {
            player.release();
            player = null;
        }
        List<Runnable> listeners = new ArrayList<>(doneListeners);
        doneListeners.clear();
        for (Runnable listener : listeners) listener.run();
    }
}
