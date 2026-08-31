package com.basalioart.zenith;

import android.os.Bundle;

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
            if (!backendDir.exists()) {
                backendDir.mkdirs();
            }

            File backend = new File(backendDir, "zenith-backend");

            if (!backend.exists()) {
                copyBackend(backend);
            }

            backend.setExecutable(true, true);

            ProcessBuilder builder = new ProcessBuilder(
                    backend.getAbsolutePath()
            );

            builder.redirectErrorStream(true);

            backendProcess = builder.start();

        } catch (Exception e) {
            e.printStackTrace();
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

    @Override
    protected void onDestroy() {
        if (backendProcess != null) {
            backendProcess.destroy();
        }

        super.onDestroy();
    }
}