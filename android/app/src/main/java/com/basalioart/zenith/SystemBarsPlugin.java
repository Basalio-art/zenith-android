package com.basalioart.zenith;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {

    private WindowInsetsControllerCompat getController() {
        return WindowCompat.getInsetsController(
            getActivity().getWindow(),
            getActivity().getWindow().getDecorView()
        );
    }

    @PluginMethod
    public void normal(PluginCall call) {

        WindowInsetsControllerCompat controller = getController();

        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat
                .BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );

        // Keep status bar visible
        controller.show(
            WindowInsetsCompat.Type.statusBars()
        );

        // Hide navigation bar
        controller.hide(
            WindowInsetsCompat.Type.navigationBars()
        );

        call.resolve();
    }

    @PluginMethod
    public void fullscreen(PluginCall call) {

        WindowInsetsControllerCompat controller = getController();

        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat
                .BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );

        // Hide status + navigation bars
        controller.hide(
            WindowInsetsCompat.Type.systemBars()
        );

        call.resolve();
    }
}