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

    private void setupController() {
        WindowInsetsControllerCompat controller = getController();
    
        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat
                .BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );
    
        getActivity().getWindow().setNavigationBarColor(
            Color.TRANSPARENT
        );
    
        getActivity().getWindow().setNavigationBarContrastEnforced(
            false
        );
    
        // Light app → dark navigation buttons
        controller.setAppearanceLightNavigationBars(true);
    }