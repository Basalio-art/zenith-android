package com.basalioart.zenith;

import android.os.Bundle;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {

    private Process backendProcess;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        startBackend();
    }

    private void startBackend() {
        try {
            File backendDir = new File(getFilesDir(), "backend");

            if (!backendDir.exists() && !backendDir.mkdirs()) {
                showStatus("Failed to create backend directory");
                return;
            }

            File backend = new File(backendDir, "zenith-backend");

            if (!backend.exists()) {
                copyBackend(backend);
            }

            if (!backend.exists()) {
                showStatus("Backend file does not exist");
                return;
            }

            if (!backend.setExecutable(true, false)) {
                showStatus("Warning: could not set executable permission");
            }

            ProcessBuilder builder = new ProcessBuilder(
                    backend.getAbsolutePath()
            );

            builder.redirectErrorStream(true);

            backendProcess = builder.start();

            showStatus("Go backend started");

        } catch (IOException e) {
            showStatus("Backend failed: " + e.getMessage());
        } catch (Exception e) {
            showStatus("Backend error: " + e.getClass().getSimpleName()
                    + ": " + e.getMessage());
        }
    }

    private void copyBackend(File destination) throws IOException {
        try (
                InputStream input =
                        getAssets().open("backend/zenith-backend");
                FileOutputStream output =
                        new FileOutputStream(destination)
        ) {
            byte[] buffer = new byte[8192];
            int length;

            while ((length = input.read(buffer)) != -1) {
                output.write(buffer, 0, length);
            }
        }
    }

    private void showStatus(String message) {
        runOnUiThread(() ->
                Toast.makeText(
                        MainActivity.this,
                        message,
                        Toast.LENGTH_LONG
                ).show()
        );
    }

    @Override
    public void onDestroy() {
        if (backendProcess != null) {
            backendProcess.destroy();
            backendProcess = null;
        }

        super.onDestroy();
    }
}