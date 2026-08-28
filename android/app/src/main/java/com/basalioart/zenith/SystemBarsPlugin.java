package com.basalioart.zenith;

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

    @PluginMethod
    public void normal(PluginCall call) {
        WindowInsetsControllerCompat controller = getController();

        getActivity().getWindow().setNavigationBarColor(
            android.graphics.Color.TRANSPARENT
        );
          
        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat
                .BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );

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
        WindowInsetsControllerCompat controller = getController();

        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat
                .BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );

        // Status + navigation bars hidden
        controller.hide(
            WindowInsetsCompat.Type.systemBars()
        );

        call.resolve();
    }
}