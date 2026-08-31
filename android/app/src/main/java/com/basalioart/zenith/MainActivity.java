package com.basalioart.zenith;

import android.os.Bundle;
import android.os.Environment;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends BridgeActivity {

    private Process backendProcess;

    private File logFile;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setupLogFile();

        log("========================================");
        log("Zenith Backend Startup");
        log("Time: " + new SimpleDateFormat(
                "yyyy-MM-dd HH:mm:ss",
                Locale.US
        ).format(new Date()));
        log("========================================");

        log("Android SDK: " + android.os.Build.VERSION.SDK_INT);
        log("CPU ABI: " + android.os.Build.SUPPORTED_ABIS[0]);

        startBackend();
    }

    private void setupLogFile() {
        try {
            File documentsDir = Environment.getExternalStoragePublicDirectory(
                    Environment.DIRECTORY_DOCUMENTS
            );

            File zenithDir = new File(documentsDir, "Zenith");

            if (!zenithDir.exists()) {
                zenithDir.mkdirs();
            }

            logFile = new File(zenithDir, "backend.log");

            FileOutputStream output = new FileOutputStream(logFile, false);
            output.close();

        } catch (Exception e) {
            // If Documents cannot be accessed, continue without file logging.
            logFile = null;
        }
    }

    private synchronized void log(String message) {
        String line = "[" +
                new SimpleDateFormat(
                        "HH:mm:ss.SSS",
                        Locale.US
                ).format(new Date()) +
                "] " +
                message +
                "\n";

        if (logFile != null) {
            try {
                FileOutputStream output =
                        new FileOutputStream(logFile, true);

                output.write(line.getBytes());
                output.close();

            } catch (Exception ignored) {
            }
        }
    }

    private void startBackend() {

        log("----------------------------------------");
        log("Starting Go backend...");

        try {

            File backendDir = new File(
                    getFilesDir(),
                    "backend"
            );

            log("Backend directory:");
            log(backendDir.getAbsolutePath());

            if (!backendDir.exists()) {

                log("Backend directory does not exist.");
                log("Creating directory...");

                boolean created = backendDir.mkdirs();

                log("mkdir result: " + created);

                if (!created && !backendDir.exists()) {
                    log("ERROR: Could not create backend directory.");
                    return;
                }
            }

            File backend = new File(
                    backendDir,
                    "zenith-backend"
            );

            log("Backend file:");
            log(backend.getAbsolutePath());

            if (!backend.exists()) {

                log("Backend does not exist.");
                log("Copying from APK assets...");

                copyBackend(backend);

                log("Copy completed.");
            }

            log("Backend exists: " + backend.exists());
            log("Backend size: " + backend.length() + " bytes");
            log("Backend readable: " + backend.canRead());
            log("Backend executable: " + backend.canExecute());

            log("Setting executable permission...");

            boolean executable =
                    backend.setExecutable(true, false);

            log("setExecutable result: " + executable);
            log("Executable after change: " + backend.canExecute());

            log("Creating ProcessBuilder...");

            ProcessBuilder builder = new ProcessBuilder(
                    backend.getAbsolutePath()
            );

            builder.redirectErrorStream(true);

            log("Starting Go process...");

            backendProcess = builder.start();

            log("SUCCESS: Go process started.");

            log("Process alive: " +
                    backendProcess.isAlive());

            startOutputReader();

        } catch (Exception e) {

            log("========================================");
            log("BACKEND START FAILED");
            log("Exception: " +
                    e.getClass().getName());

            log("Message: " +
                    String.valueOf(e.getMessage()));

            StringWriter stringWriter =
                    new StringWriter();

            PrintWriter printWriter =
                    new PrintWriter(stringWriter);

            e.printStackTrace(printWriter);

            log("Stack trace:");
            log(stringWriter.toString());

            log("========================================");
        }
    }

    private void copyBackend(File destination)
            throws IOException {

        log("Opening APK asset:");

        log("backend/zenith-backend");

        try (
                InputStream input =
                        getAssets().open(
                                "backend/zenith-backend"
                        );

                FileOutputStream output =
                        new FileOutputStream(destination)
        ) {

            byte[] buffer =
                    new byte[8192];

            int length;

            long total = 0;

            while ((length =
                    input.read(buffer)) != -1) {

                output.write(
                        buffer,
                        0,
                        length
                );

                total += length;
            }

            output.flush();

            log("Copied " +
                    total +
                    " bytes.");
        }
    }

    private void startOutputReader() {

        if (backendProcess == null) {
            return;
        }

        new Thread(() -> {

            try {

                InputStream input =
                        backendProcess.getInputStream();

                byte[] buffer =
                        new byte[4096];

                int length;

                log("----------------------------------------");
                log("Go backend output:");

                while ((length =
                        input.read(buffer)) != -1) {

                    String output =
                            new String(
                                    buffer,
                                    0,
                                    length
                            );

                    log("GO: " + output);
                }

                log("Go process output stream ended.");

            } catch (Exception e) {

                log("Error reading Go output:");

                log(e.toString());
            }

        }).start();
    }

    @Override
    public void onDestroy() {

        log("----------------------------------------");
        log("Zenith shutting down.");

        if (backendProcess != null) {

            log("Stopping Go backend...");

            backendProcess.destroy();

            backendProcess = null;

            log("Go backend stopped.");
        }

        super.onDestroy();
    }
}