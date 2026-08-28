package com.basalioart.zenith;

import android.os.Bundle;

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

        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat
                .BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );

        controller.setAppearanceLightNavigationBars(true);

        controller.hide(
            WindowInsetsCompat.Type.navigationBars()
        );
    }
}