package com.basalioart.zenith;

import android.graphics.Color;
import android.view.Window;

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
        WindowInsetsControllerCompat controller = getController();

        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat
                .BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );

        // Light app:
        // dark status-bar icons
        // dark navigation-bar buttons
        controller.setAppearanceLightStatusBars(true);
        controller.setAppearanceLightNavigationBars(true);

        // Transparent backgrounds where supported
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        // Prevent the 3-button navigation contrast scrim
        getWindow().setNavigationBarContrastEnforced(false);
    }

    @PluginMethod
    public void normal(PluginCall call) {
        setupController();

        WindowInsetsControllerCompat controller = getController();

        // Status bar visible
        controller.show(
            WindowInsetsCompat.Type.statusBars()
        );

        // Navigation bar hidden
        controller.hide(
            WindowInsetsCompat.Type.navigationBars()
        );

        call.resolve();
    }

    @PluginMethod
    public void fullscreen(PluginCall call) {
        setupController();

        WindowInsetsControllerCompat controller = getController();

        // Hide status + navigation bars
        controller.hide(
            WindowInsetsCompat.Type.systemBars()
        );

        call.resolve();
    }
}