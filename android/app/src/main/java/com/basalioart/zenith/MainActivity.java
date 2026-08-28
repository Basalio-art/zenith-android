package com.basalioart.zenith;

import android.os.Bundle;
import android.graphics.Color;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.enableEdgeToEdge(getWindow());

        setupSystemBars();
    }

    private void setupSystemBars() {
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(
                getWindow(),
                getWindow().getDecorView()
            );

        // Allow Android to temporarily reveal hidden bars
        // when the user performs the system edge gesture.
        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat
                .BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );

        // Hide ONLY the navigation bar initially.
        controller.hide(
            WindowInsetsCompat.Type.navigationBars()
        );

        // For Android versions/navigation modes where
        // navigationBarColor is respected.
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        // Don't force a contrast scrim on 3-button navigation.
        getWindow().setNavigationBarContrastEnforced(false);
    }
}