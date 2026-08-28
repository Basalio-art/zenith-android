package com.basalioart.zenith;

import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.view.Window;
import android.view.WindowManager; // Required for WindowManager flags

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppBars")
public class SystemBarsPlugin extends Plugin {

    private Window getWindow() {
        return getActivity().getWindow();
    }

    private WindowInsetsControllerCompat getController() {
        return WindowCompat.getInsetsController(
            getWindow(),
            getWindow().getDecorView()
        );
    }

    private void setupController() {
        Window window = getWindow();
        WindowInsetsControllerCompat controller = getController();

        // 1. Clear legacy translucent flags and allow custom system bar backgrounds
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);

        // 2. Enable drawing behind system bars for true edge-to-edge transparency
        WindowCompat.setDecorFitsSystemWindows(window, false);

        // 3. Auto-hide bars when the user swipes to show them (Immersive Mode)
        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );

        // 4. Detect system theme (Dark or Light)
        int nightModeFlags = getContext().getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        boolean isDarkMode = nightModeFlags == Configuration.UI_MODE_NIGHT_YES;

        // Adjust icon colors for visibility
        controller.setAppearanceLightStatusBars(!isDarkMode);
        controller.setAppearanceLightNavigationBars(!isDarkMode);

        // 5. Force transparent backgrounds
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        // Prevent the 3-button navigation contrast scrim on Android 10+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setNavigationBarContrastEnforced(false);
        }
    }

    @PluginMethod
    public void normal(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            setupController();
            WindowInsetsControllerCompat controller = getController();

            // Status bar visible
            controller.show(WindowInsetsCompat.Type.statusBars());

            // Navigation bar hidden
            controller.hide(WindowInsetsCompat.Type.navigationBars());

            call.resolve();
        });
    }

    @PluginMethod
    public void fullscreen(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            setupController();
            WindowInsetsControllerCompat controller = getController();

            // Hide status + navigation bars
            controller.hide(WindowInsetsCompat.Type.systemBars());

            call.resolve();
        });
    }
}
