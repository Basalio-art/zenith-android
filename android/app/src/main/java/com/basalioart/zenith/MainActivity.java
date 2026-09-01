package com.basalioart.zenith;

import android.os.Bundle;
import android.os.Environment;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends BridgeActivity {

    private File logFile;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setupLogFile();

        log("========================================");
        log("Zenith Go Backend Startup");
        log("Time: " + new SimpleDateFormat(
                "yyyy-MM-dd HH:mm:ss",
                Locale.US
        ).format(new Date()));
        log("========================================");

        log("Android SDK: " + android.os.Build.VERSION.SDK_INT);

        if (android.os.Build.SUPPORTED_ABIS.length > 0) {
            log("CPU ABI: " + android.os.Build.SUPPORTED_ABIS[0]);
        }

        startGoBackend();
    }

    /**
     * Creates the Zenith log file.
     */
    private void setupLogFile() {
        try {
            File documentsDir = Environment.getExternalStoragePublicDirectory(
                    Environment.DIRECTORY_DOCUMENTS
            );

            File zenithDir = new File(documentsDir, "Zenith");

            if (!zenithDir.exists()) {
                boolean created = zenithDir.mkdirs();

                if (!created && !zenithDir.exists()) {
                    logFile = null;
                    return;
                }
            }

            logFile = new File(zenithDir, "backend.log");

            // Clear the previous log when the app starts.
            FileOutputStream output =
                    new FileOutputStream(logFile, false);

            output.close();

        } catch (Exception e) {
            // Logging to Documents is optional.
            logFile = null;
        }
    }

    /**
     * Writes a message to the Zenith backend log.
     */
    private synchronized void log(String message) {

        String line =
                "[" +
                new SimpleDateFormat(
                        "HH:mm:ss.SSS",
                        Locale.US
                ).format(new Date()) +
                "] " +
                message +
                "\n";

        if (logFile == null) {
            return;
        }

        try {
            FileOutputStream output =
                    new FileOutputStream(logFile, true);

            output.write(line.getBytes());
            output.close();

        } catch (Exception ignored) {
        }
    }

    /**
     * Starts the embedded Go backend.
     *
     * Java
     *   ↓
     * GoBackend.startServer()
     *   ↓
     * JNI
     *   ↓
     * libzenith.so
     *   ↓
     * StartServer()
     *   ↓
     * Go HTTP server
     */
    private void startGoBackend() {

        log("----------------------------------------");
        log("Starting embedded Go backend...");
        log("Loading native library: zenith_jni");

        try {

            GoBackend.startServer();

            log("SUCCESS: Go backend StartServer() called.");
            log("Go backend is starting in the background.");

        } catch (Throwable e) {

            log("----------------------------------------");
            log("GO BACKEND START FAILED");

            log("Exception: " +
                    e.getClass().getName());

            log("Message: " +
                    String.valueOf(e.getMessage()));

            log("Cause: " +
                    String.valueOf(e.getCause()));

            log("----------------------------------------");
        }
    }

    @Override
    public void onDestroy() {

        log("----------------------------------------");
        log("Zenith shutting down.");

        /*
         * The Go backend currently runs inside libzenith.so.
         *
         * We do not use Process.destroy() anymore because
         * there is no separate Go executable process.
         *
         * The Go runtime/server will remain tied to the
         * native library process.
         */

        log("Go backend is embedded in the native library.");
        log("Zenith shutting down.");

        super.onDestroy();
    }
}