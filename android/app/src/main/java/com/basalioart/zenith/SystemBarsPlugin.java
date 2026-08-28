package com.basalioart.zenith;

import android.graphics.Color;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppBars")
public class SystemBarsPlugin extends Plugin {

    private WindowInsetsControllerCompat getController() {
        return WindowCompat.getInsetsController(
            getActivity().getWindow(),
            getActivity().getWindow().getDecorView()
        );
    }

    private void setupController() {
        WindowInsetsControllerCompat controller = getController();

        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat
                .BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );

        // Transparent navigation background where supported.
        getActivity().getWindow().setNavigationBarColor(Color.TRANSPARENT);

        // Disable Android's navigation-bar contrast scrim.
        getActivity().getWindow().setNavigationBarContrastEnforced(false);
    }

    @PluginMethod
    public void normal(PluginCall call) {
        setupController();

        WindowInsetsControllerCompat controller = getController();

        // Status bar visible.
        controller.show(
            WindowInsetsCompat.Type.statusBars()
        );

        // Navigation bar hidden.
        controller.hide(
            WindowInsetsCompat.Type.navigationBars()
        );

        call.resolve();
    }

    @PluginMethod
    public void fullscreen(PluginCall call) {
        setupController();

        WindowInsetsControllerCompat controller = getController();

        // Hide status + navigation bars.
        controller.hide(
            WindowInsetsCompat.Type.systemBars()
        );

        call.resolve();
    }
}